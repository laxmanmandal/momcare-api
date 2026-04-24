"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFileIfExists = deleteFileIfExists;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../index.js");
/**
 * Ensure folder exists for entity type and uuid
 */
// export async function ensureDir(folder: string, uuid: string) {
//     const dir = path.join(UPLOAD_BASE, folder, uuid);
//     await fs.promises.mkdir(dir, { recursive: true });
//     return dir;
// }
async function deleteFileIfExists(filePath) {
    const fullPath = path_1.default.join(index_js_1.UPLOAD_ROOT, filePath);
    try {
        await promises_1.default.access(fullPath); // check if file exists
        await promises_1.default.unlink(fullPath); // delete it
        console.log(`🗑️ Deleted file: ${fullPath}`);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`🗑️ Not Deleted file: ${fullPath}`);
            return;
        }
        console.error(`❌ Failed to delete file: ${fullPath}`, err);
    }
}
//# sourceMappingURL=fileUploads.js.map