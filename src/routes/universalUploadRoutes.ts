// src/routes/universalUpload.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UploadResponse } from '../types/excel';
import { PrismaClient } from '@prisma/client';
import { getParserConfig, PARSER_CONFIGS } from '../config/excelparsarconfig';
import { UniversalExcelParser } from '../utils/excelParsar';
import { authMiddleware } from '../middleware/auth';

const prisma = new PrismaClient();

const uploadBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        file: { type: 'string', contentEncoding: 'binary' }
    }
} as const

const tableQuerySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        table: { type: 'string' }
    },
    required: ['table']
} as const

const universalUploadRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

    // -----------------------------------------------------
    // UPLOAD EXCEL FILE
    // -----------------------------------------------------
    fastify.post<{
        Body: any;
        Querystring: { table: string };
        Reply: UploadResponse;
    }>('/upload', {
        preHandler: [authMiddleware, fastify.accessControl.check('UPLOAD_EXCEL')],

        schema: {
            tags: ['Upload from excel'],
            consumes: ['multipart/form-data'],
            summary: 'Upload an Excel file for a target table',
            querystring: tableQuerySchema,
            body: uploadBodySchema
        }
    }, async (request, reply) => {

        try {
            const { table } = request.query;

            const file = await request.file();
            if (!file) {
                return reply.status(400).send({
                    success: false,
                    message: 'No file uploaded',
                    processed: 0,
                    errors: [{ row: 0, error: 'File is required', data: null }],
                    stats: { totalRows: 0, validRows: 0, errorRows: 0 }
                });
            }

            // load parser config
            const config = getParserConfig(table);

            const buffer = await file.toBuffer();
            const { records, errors, stats } = await UniversalExcelParser.parseExcel(buffer, config);

            const normalizedTable = table.toLowerCase();

            let model: any;
            switch (normalizedTable) {
                case 'concieve':
                    model = prisma.concieve;
                    break;
                case 'user':
                    model = prisma.user;
                    break;
                case 'entitytable':
                    model = prisma.entityTable; // <-- THIS is the correct Prisma model
                    break;
                default:
                    return reply.status(400).send({
                        success: false,
                        message: `Model '${table}' does not exist in Prisma`,
                        processed: 0,
                        errors: [{ row: 0, error: `Invalid Prisma model '${table}'`, data: null }],
                        stats
                    });
            }

            const result = await model.createMany({
                data: records,
                skipDuplicates: true
            });


            return reply.send({
                success: errors.length === 0,
                message: errors.length === 0
                    ? 'File uploaded successfully'
                    : `Upload completed with ${errors.length} errors`,
                processed: result.count,
                errors,
                stats
            });

        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error?.message ?? 'Upload failed',
                processed: 0,
                errors: [{ row: 0, error: error?.message, data: null }],
                stats: { totalRows: 0, validRows: 0, errorRows: 0 }
            });
        }
    });


    // -----------------------------------------------------
    // GET ALL UPLOAD CONFIGS
    // -----------------------------------------------------
    fastify.get('/upload-configs', {
        schema: {
            tags: ['Upload from excel'],
            summary: 'List available upload parser configs'
        }
    }, async () => {
        const configs = Object.entries(PARSER_CONFIGS).map(([key, config]) => ({
            table: key,
            tableName: config.tableName,
            requiredFields: config.requiredFields,
            expectedColumns: UniversalExcelParser.getExpectedColumns(config),
            sampleData: UniversalExcelParser.generateTemplate(config)
        }));

        return {
            success: true,
            data: configs
        };
    });


    // -----------------------------------------------------
    // GET SINGLE UPLOAD CONFIG
    // -----------------------------------------------------
    fastify.get<{
        Querystring: { table: string };
    }>('/upload-config', {
        schema: {
            tags: ['Upload from excel'],
            summary: 'Get a single upload parser config',
            querystring: tableQuerySchema
        }
    }, async (request, reply) => {
        const { table } = request.query;

        try {
            const config = getParserConfig(table);
            const sampleData = UniversalExcelParser.generateTemplate(config);

            return {
                success: true,
                data: {
                    table,
                    tableName: config.tableName,
                    requiredFields: config.requiredFields,
                    expectedColumns: UniversalExcelParser.getExpectedColumns(config),
                    sampleData,
                    fieldValidators: config.fieldValidators,
                    fieldTransformers: config.fieldTransformers
                }
            };
        } catch (error: any) {
            return reply.status(404).send({
                success: false,
                message: error.message ?? 'Table not found'
            });
        }
    });
};

export default universalUploadRoutes;
