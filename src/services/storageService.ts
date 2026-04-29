import fs from 'fs/promises';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import createHttpError from 'http-errors';

const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './momcare-media';

// Resolve absolute upload path from project root
const UPLOAD_ROOT = path.resolve(process.cwd(), UPLOAD_DIR);
const MAX_SAFE_FILENAME_LENGTH = 80;
const allowedMimeTypes = new Map<string, string>([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['video/mp4', '.mp4'],
    ['video/mov', '.mov'],
    ['video/quicktime', '.mov'],
    ['application/pdf', '.pdf']
]);

// ============================================================================
// CLOUDINARY CONFIG (Development)
// ============================================================================
if (NODE_ENV === 'development' && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('☁️ Cloudinary configured for development');
} else if (NODE_ENV !== 'development') {
    console.log('📁 Local storage configured for production');
}

// ============================================================================
// STORAGE SERVICE
// ============================================================================

export const storageService = {
    /**
     * Upload file to appropriate storage (Cloudinary or Local)
     */
    async uploadFile(
        fileBuffer: Buffer,
        filename: string,
        mimeType: string,
        folder: string
    ): Promise<string> {
        if (!allowedMimeTypes.has(mimeType)) {
            throw createHttpError(400, `Unsupported file type: ${mimeType}`);
        }

        if (fileBuffer.length === 0) {
            throw createHttpError(400, 'Uploaded file is empty')
        }

        if (!matchesExpectedSignature(fileBuffer, mimeType)) {
            throw createHttpError(400, `Uploaded file content does not match ${mimeType}`)
        }

        if (NODE_ENV === 'development') {
            return uploadToCloudinary(fileBuffer, filename, mimeType, folder);
        } else {
            return uploadToLocalStorage(fileBuffer, filename, mimeType, folder);
        }
    },

    /**
     * Delete file from appropriate storage
     */
    async deleteFile(filePath: string): Promise<void> {
        if (NODE_ENV === 'development') {
            return deleteFromCloudinary(filePath);
        } else {
            return deleteFromLocalStorage(filePath);
        }
    },

    /**
     * Get file URL based on storage type
     */
    getFileUrl(filePath: string): string {
        if (NODE_ENV === 'development') {
            // For Cloudinary, path is already a full URL
            return filePath;
        } else {
            // For local storage, construct the URL
            return filePath;
        }
    }
};

// ============================================================================
// CLOUDINARY UPLOAD (Development)
// ============================================================================

async function uploadToCloudinary(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string
): Promise<string> {
    const safeBaseName = sanitizeFilenameBase(filename)
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `momcare/${folder}`,
                resource_type: 'auto',
                public_id: `${safeBaseName}_${Date.now()}`,
                overwrite: true,
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    reject(error);
                } else {
                    console.log('☁️ Uploaded to Cloudinary:', result?.secure_url);
                    resolve(result?.secure_url || '');
                }
            }
        );

        stream.end(fileBuffer);
    });
}

async function deleteFromCloudinary(filePath: string): Promise<void> {
    try {
        // Extract public_id from Cloudinary URL
        // Example: https://res.cloudinary.com/cloud/image/upload/v123/momcare/folder/filename.jpg
        const match = filePath.match(/\/upload\/(?:v\d+\/)?(.+?)(\.\w+)?$/);
        if (!match) {
            console.log('🗑️ Could not extract public_id from Cloudinary URL');
            return;
        }

        const publicId = match[1];
        await cloudinary.uploader.destroy(publicId);
        console.log('🗑️ Deleted from Cloudinary:', publicId);
    } catch (err: any) {
        console.error('❌ Cloudinary delete error:', err.message);
    }
}

// ============================================================================
// LOCAL STORAGE UPLOAD (Production)
// ============================================================================

async function uploadToLocalStorage(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string
): Promise<string> {
    try {
        const folderName = folder.replace(/^https?:\/\/[^\/]+\/?/, '').replace(/[^a-zA-Z0-9-_\/]/g, '');
        const folderPath = path.join(UPLOAD_ROOT, folderName);

        // Create directory if it doesn't exist
        await fs.mkdir(folderPath, { recursive: true });

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = getSafeExtension(filename, mimeType);
        const baseName = sanitizeFilenameBase(filename);
        const uniqueName = `${baseName}_${timestamp}${ext}`;

        const fullPath = path.join(folderPath, uniqueName);
        await fs.writeFile(fullPath, fileBuffer);

        const fileUrl = `/${folderName}/${uniqueName}`;
        console.log('📁 Uploaded to local storage:', fileUrl);
        return fileUrl;
    } catch (err: any) {
        console.error('❌ Local storage upload error:', err.message);
        throw err;
    }
}

async function deleteFromLocalStorage(filePath: string): Promise<void> {
    try {
        const relativePath = filePath.replace(/^\//, '');
        const fullPath = resolveLocalUploadPath(relativePath);

        await fs.access(fullPath); // Check if file exists
        await fs.unlink(fullPath);
        console.log('🗑️ Deleted from local storage:', fullPath);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.log('🗑️ File not found:', filePath);
            return;
        }
        console.error('❌ Local storage delete error:', err.message);
    }
}

function sanitizeFilenameBase(filename: string): string {
    const ext = path.extname(filename);
    const rawBaseName = path.basename(filename, ext);
    const safeBaseName = rawBaseName
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')

    return (safeBaseName || 'upload').slice(0, MAX_SAFE_FILENAME_LENGTH)
}

function getSafeExtension(filename: string, mimeType: string): string {
    const mappedExtension = allowedMimeTypes.get(mimeType)
    if (mappedExtension) {
        return mappedExtension
    }

    const rawExtension = path.extname(filename).toLowerCase()
    if (rawExtension) {
        return rawExtension
    }

    return '.bin'
}

function resolveLocalUploadPath(relativePath: string): string {
    const normalizedPath = path.posix.normalize(`/${relativePath}`).replace(/^\/+/, '')
    const absolutePath = path.resolve(UPLOAD_ROOT, normalizedPath)

    if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
        throw createHttpError(400, 'Invalid file path')
    }

    return absolutePath
}

function matchesExpectedSignature(buffer: Buffer, mimeType: string): boolean {
    switch (mimeType) {
        case 'image/png':
            return buffer.length >= 8 && buffer.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            )
        case 'image/jpeg':
        case 'image/jpg':
            return buffer.length >= 3
                && buffer[0] === 0xff
                && buffer[1] === 0xd8
                && buffer[2] === 0xff
        case 'application/pdf':
            return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
        case 'video/mp4':
            return hasIsoBaseMediaHeader(buffer)
        case 'video/mov':
        case 'video/quicktime':
            return hasIsoBaseMediaHeader(buffer, ['qt  '])
        default:
            return false
    }
}

function hasIsoBaseMediaHeader(buffer: Buffer, acceptedBrands?: string[]): boolean {
    if (buffer.length < 12) return false
    if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false

    if (!acceptedBrands || acceptedBrands.length === 0) {
        return true
    }

    const brand = buffer.subarray(8, 12).toString('ascii')
    return acceptedBrands.includes(brand)
}
