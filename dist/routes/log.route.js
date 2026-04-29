"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LogRoutes;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises")); // ← Use promises for async/await
const fs_1 = require("fs");
const stream_1 = require("stream");
const util_1 = require("util");
const pump = (0, util_1.promisify)(stream_1.pipeline);
const textResponse = {
    type: 'string'
};
const successObjectResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
    }
};
const errorResponse = {
    type: 'object',
    properties: {
        error: { type: 'string' },
        details: { type: 'string' }
    }
};
async function LogRoutes(app) {
    const LOG_PATH = path_1.default.join(process.cwd(), 'logs', 'app.log');
    // Ensure logs directory exists
    await promises_1.default.mkdir(path_1.default.dirname(LOG_PATH), { recursive: true });
    /**
     * GET /logs - View logs as plain text
     */
    app.get('/', {
        schema: {
            tags: ['Server-logs'],
            summary: 'View logs as plain text',
            response: { 200: textResponse, 500: errorResponse }
        }
    }, async (req, reply) => {
        try {
            const logContent = await promises_1.default.readFile(LOG_PATH, 'utf8');
            return reply
                .code(200)
                .header('Content-Type', 'text/plain; charset=utf-8')
                .send(logContent || 'No logs available.');
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return reply.code(200).send('Log file not found. No logs yet.');
            }
            req.log.error('Error reading log:', err);
            return reply.code(500).send({ error: 'Failed to read log file' });
        }
    });
    /**
     * GET /logs/download - Download log file
     */
    app.get('/download', {
        schema: {
            tags: ['Server-logs'],
            summary: 'Download the server log file',
            response: { 200: textResponse, 404: errorResponse, 500: errorResponse }
        }
    }, async (req, reply) => {
        try {
            // 1. Verify file exists
            await promises_1.default.access(LOG_PATH, fs_1.constants.R_OK);
            // 2. Get file stats
            const stats = await promises_1.default.stat(LOG_PATH);
            if (!stats.isFile())
                throw new Error('Not a file');
            // 3. Stream manually (most reliable)
            const stream = (0, fs_1.createReadStream)(LOG_PATH);
            return reply
                .code(200)
                .header('Content-Type', 'application/octet-stream')
                .header('Content-Disposition', 'attachment; filename="app.log"')
                .header('Content-Length', stats.size)
                .send(stream);
        }
        catch (err) {
            req.log.error('Download failed:', err);
            if (err.code === 'ENOENT') {
                return reply.code(404).send({ error: 'Log file not found' });
            }
            return reply.code(500).send({ error: 'Download failed', details: err.message });
        }
    });
    /**
     * DELETE /logs/clear - Clear log file
     */
    app.delete('/clear', {
        schema: {
            tags: ['Server-logs'],
            summary: 'Clear the server log file',
            response: { 200: successObjectResponse, 500: successObjectResponse }
        }
    }, async (req, reply) => {
        try {
            await promises_1.default.writeFile(LOG_PATH, '', { encoding: 'utf8' });
            req.log.info('Log file cleared');
            return { success: true, message: 'Log file cleared successfully' };
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return { success: true, message: 'No log file to clear' };
            }
            req.log.error('Error clearing log:', err);
            return reply.code(500).send({ success: false, error: 'Failed to clear log' });
        }
    });
    /**
     * GET /logs/json - Return logs as JSON lines (for frontend)
     */
    app.get('/json', {
        schema: {
            tags: ['Server-logs'],
            summary: 'Read logs as parsed JSON lines',
            response: { 200: { type: 'array', items: { type: 'object' } }, 500: errorResponse }
        }
    }, async (req, reply) => {
        try {
            const content = await promises_1.default.readFile(LOG_PATH, 'utf8');
            const lines = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return { raw: line, level: 'unknown', time: Date.now() };
                }
            });
            return reply.send(lines);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return reply.send([]);
            }
            return reply.code(500).send({ error: 'Failed to parse logs' });
        }
    });
}
//# sourceMappingURL=log.route.js.map