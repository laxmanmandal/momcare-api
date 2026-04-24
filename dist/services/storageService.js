"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("cloudinary");
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './momcare-media';
// Resolve absolute upload path from project root
const UPLOAD_ROOT = path_1.default.resolve(process.cwd(), UPLOAD_DIR);
// ============================================================================
// CLOUDINARY CONFIG (Development)
// ============================================================================
if (NODE_ENV === 'development' && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('☁️ Cloudinary configured for development');
}
else if (NODE_ENV !== 'development') {
    console.log('📁 Local storage configured for production');
}
// ============================================================================
// STORAGE SERVICE
// ============================================================================
exports.storageService = {
    /**
     * Upload file to appropriate storage (Cloudinary or Local)
     */
    async uploadFile(fileBuffer, filename, mimeType, folder) {
        const allowed = [
            'image/png', 'image/jpeg', 'image/jpg', 'video/mp4',
            'video/mov', 'application/pdf'
        ];
        if (!allowed.includes(mimeType)) {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
        if (NODE_ENV === 'development') {
            return uploadToCloudinary(fileBuffer, filename, mimeType, folder);
        }
        else {
            return uploadToLocalStorage(fileBuffer, filename, mimeType, folder);
        }
    },
    /**
     * Delete file from appropriate storage
     */
    async deleteFile(filePath) {
        if (NODE_ENV === 'development') {
            return deleteFromCloudinary(filePath);
        }
        else {
            return deleteFromLocalStorage(filePath);
        }
    },
    /**
     * Get file URL based on storage type
     */
    getFileUrl(filePath) {
        if (NODE_ENV === 'development') {
            // For Cloudinary, path is already a full URL
            return filePath;
        }
        else {
            // For local storage, construct the URL
            return filePath;
        }
    }
};
// ============================================================================
// CLOUDINARY UPLOAD (Development)
// ============================================================================
async function uploadToCloudinary(fileBuffer, filename, mimeType, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder: `momcare/${folder}`,
            resource_type: 'auto',
            public_id: filename.split('.')[0] + '_' + Date.now(),
            overwrite: true,
        }, (error, result) => {
            if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
            }
            else {
                console.log('☁️ Uploaded to Cloudinary:', result?.secure_url);
                resolve(result?.secure_url || '');
            }
        });
        stream.end(fileBuffer);
    });
}
async function deleteFromCloudinary(filePath) {
    try {
        // Extract public_id from Cloudinary URL
        // Example: https://res.cloudinary.com/cloud/image/upload/v123/momcare/folder/filename.jpg
        const match = filePath.match(/\/upload\/(?:v\d+\/)?(.+?)(\.\w+)?$/);
        if (!match) {
            console.log('🗑️ Could not extract public_id from Cloudinary URL');
            return;
        }
        const publicId = match[1];
        await cloudinary_1.v2.uploader.destroy(publicId);
        console.log('🗑️ Deleted from Cloudinary:', publicId);
    }
    catch (err) {
        console.error('❌ Cloudinary delete error:', err.message);
    }
}
// ============================================================================
// LOCAL STORAGE UPLOAD (Production)
// ============================================================================
async function uploadToLocalStorage(fileBuffer, filename, mimeType, folder) {
    try {
        const folderName = folder.replace(/^https?:\/\/[^\/]+\/?/, '').replace(/[^a-zA-Z0-9-_\/]/g, '');
        const folderPath = path_1.default.join(UPLOAD_ROOT, folderName);
        // Create directory if it doesn't exist
        await promises_1.default.mkdir(folderPath, { recursive: true });
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path_1.default.extname(filename);
        const baseName = path_1.default.basename(filename, ext);
        const uniqueName = `${baseName}_${timestamp}${ext}`;
        const fullPath = path_1.default.join(folderPath, uniqueName);
        await promises_1.default.writeFile(fullPath, fileBuffer);
        const fileUrl = `/${folderName}/${uniqueName}`;
        console.log('📁 Uploaded to local storage:', fileUrl);
        return fileUrl;
    }
    catch (err) {
        console.error('❌ Local storage upload error:', err.message);
        throw err;
    }
}
async function deleteFromLocalStorage(filePath) {
    try {
        const fullPath = path_1.default.join(UPLOAD_ROOT, filePath.replace(/^\//, ''));
        await promises_1.default.access(fullPath); // Check if file exists
        await promises_1.default.unlink(fullPath);
        console.log('🗑️ Deleted from local storage:', fullPath);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            console.log('🗑️ File not found:', filePath);
            return;
        }
        console.error('❌ Local storage delete error:', err.message);
    }
}
//# sourceMappingURL=storageService.js.map