"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const excelparsarconfig_1 = require("../config/excelparsarconfig");
const excelParsar_1 = require("../utils/excelParsar");
const auth_1 = require("../middleware/auth");
const validations_1 = require("../validations");
const prisma = new client_1.PrismaClient();
const universalUploadRoutes = async (fastify) => {
    fastify.post('/upload', {
        preHandler: [auth_1.authMiddleware, fastify.accessControl.check('UPLOAD_EXCEL')],
        schema: {
            tags: ['Upload from excel'],
            consumes: ['multipart/form-data'],
            summary: 'Upload an Excel file for a target table'
        }
    }, async (request, reply) => {
        try {
            const { table } = (0, validations_1.validateData)(validations_1.uploadTableQuerySchema, request.query ?? {});
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
            const config = (0, excelparsarconfig_1.getParserConfig)(table);
            const buffer = await file.toBuffer();
            const { records, errors, stats } = await excelParsar_1.UniversalExcelParser.parseExcel(buffer, config);
            const normalizedTable = table.toLowerCase();
            let model;
            switch (normalizedTable) {
                case 'concieve':
                    model = prisma.concieve;
                    break;
                case 'user':
                    model = prisma.user;
                    break;
                case 'entitytable':
                    model = prisma.entityTable;
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
        }
        catch (error) {
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
    fastify.get('/upload-configs', {
        schema: {
            tags: ['Upload from excel'],
            summary: 'List available upload parser configs'
        }
    }, async () => {
        const configs = Object.entries(excelparsarconfig_1.PARSER_CONFIGS).map(([key, config]) => ({
            table: key,
            tableName: config.tableName,
            requiredFields: config.requiredFields,
            expectedColumns: excelParsar_1.UniversalExcelParser.getExpectedColumns(config),
            sampleData: excelParsar_1.UniversalExcelParser.generateTemplate(config)
        }));
        return {
            success: true,
            data: configs
        };
    });
    fastify.get('/upload-config', {
        schema: {
            tags: ['Upload from excel'],
            summary: 'Get a single upload parser config'
        }
    }, async (request, reply) => {
        const { table } = (0, validations_1.validateData)(validations_1.uploadTableQuerySchema, request.query ?? {});
        try {
            const config = (0, excelparsarconfig_1.getParserConfig)(table);
            const sampleData = excelParsar_1.UniversalExcelParser.generateTemplate(config);
            return {
                success: true,
                data: {
                    table,
                    tableName: config.tableName,
                    requiredFields: config.requiredFields,
                    expectedColumns: excelParsar_1.UniversalExcelParser.getExpectedColumns(config),
                    sampleData,
                    fieldValidators: config.fieldValidators,
                    fieldTransformers: config.fieldTransformers
                }
            };
        }
        catch (error) {
            return reply.status(404).send({
                success: false,
                message: error.message ?? 'Table not found'
            });
        }
    });
};
exports.default = universalUploadRoutes;
//# sourceMappingURL=universalUploadRoutes.js.map