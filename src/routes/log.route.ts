import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises'; // ← Use promises for async/await
import { createReadStream, constants as fsConstants } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

export default async function LogRoutes(app: FastifyInstance) {
    const LOG_PATH = path.join(process.cwd(), 'logs', 'app.log');

    // Ensure logs directory exists
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });

    /**
     * GET /logs - View logs as plain text
     */
    app.get('/', { schema: { tags: ['Server-logs'] } }, async (req, reply) => {
        try {
            const logContent = await fs.readFile(LOG_PATH, 'utf8');
            return reply
                .code(200)
                .header('Content-Type', 'text/plain; charset=utf-8')
                .send(logContent || 'No logs available.');
        } catch (err: any) {
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
    app.get('/download', { schema: { tags: ['Server-logs'] } }, async (req, reply) => {
        try {
            // 1. Verify file exists
            await fs.access(LOG_PATH, fsConstants.R_OK);

            // 2. Get file stats
            const stats = await fs.stat(LOG_PATH);
            if (!stats.isFile()) throw new Error('Not a file');

            // 3. Stream manually (most reliable)
            const stream = createReadStream(LOG_PATH);

            return reply
                .code(200)
                .header('Content-Type', 'application/octet-stream')
                .header('Content-Disposition', 'attachment; filename="app.log"')
                .header('Content-Length', stats.size)
                .send(stream);

        } catch (err: any) {
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
    app.delete('/clear', { schema: { tags: ['Server-logs'] } }, async (req, reply) => {
        try {
            await fs.writeFile(LOG_PATH, '', { encoding: 'utf8' });
            req.log.info('Log file cleared');
            return { success: true, message: 'Log file cleared successfully' };
        } catch (err: any) {
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
    app.get('/json', { schema: { tags: ['Server-logs'] } }, async (req, reply) => {
        try {
            const content = await fs.readFile(LOG_PATH, 'utf8');
            const lines = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { raw: line, level: 'unknown', time: Date.now() };
                    }
                });
            return reply.send(lines);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                return reply.send([]);
            }
            return reply.code(500).send({ error: 'Failed to parse logs' });
        }
    });
}