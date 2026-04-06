import fs from 'fs';
import fsPromise from 'fs/promises';
import path from 'path';
import { UPLOAD_ROOT } from '../index.js';

/**
 * Ensure folder exists for entity type and uuid
 */
// export async function ensureDir(folder: string, uuid: string) {
//     const dir = path.join(UPLOAD_BASE, folder, uuid);
//     await fs.promises.mkdir(dir, { recursive: true });
//     return dir;
// }

export async function deleteFileIfExists(filePath: string) {
    const fullPath = path.join(UPLOAD_ROOT, filePath);

    try {
        await fsPromise.access(fullPath);       // check if file exists
        await fsPromise.unlink(fullPath);       // delete it
        console.log(`🗑️ Deleted file: ${fullPath}`);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.log(`🗑️ Not Deleted file: ${fullPath}`);
            return;
        }

        console.error(`❌ Failed to delete file: ${fullPath}`, err);
    }
}