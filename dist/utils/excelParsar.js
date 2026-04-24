"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalExcelParser = void 0;
// src/utils/universalExcelParser.ts
const xlsx_1 = __importDefault(require("xlsx"));
class UniversalExcelParser {
    static async parseExcel(buffer, config) {
        const records = [];
        const errors = [];
        try {
            // Validate file size
            const maxFileSize = config.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
            if (buffer.length > maxFileSize) {
                throw new Error(`File size exceeds limit of ${maxFileSize / 1024 / 1024}MB`);
            }
            const workbook = xlsx_1.default.read(buffer, {
                type: 'buffer',
                cellDates: true,
                cellText: false
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Get all data from worksheet
            const data = xlsx_1.default.utils.sheet_to_json(worksheet, {
                raw: false, // Get formatted text
                defval: null // Default value for empty cells
            });
            data.forEach((row, index) => {
                try {
                    const record = this.validateAndTransformRow(row, config, index + 2);
                    records.push(record);
                }
                catch (error) {
                    errors.push({
                        row: index + 2,
                        error: error instanceof Error ? error.message : 'Unknown validation error',
                        data: row
                    });
                }
            });
            const stats = {
                totalRows: data.length,
                validRows: records.length,
                errorRows: errors.length
            };
            return { records, errors, stats };
        }
        catch (error) {
            throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static validateAndTransformRow(row, config, rowNumber) {
        const record = {
            created_at: new Date(),
            updated_at: new Date()
        };
        // Required fields validation
        for (const field of config.requiredFields) {
            if (!row[field] || row[field].toString().trim() === '') {
                throw new Error(`Required field '${field}' is missing or empty`);
            }
        }
        // Process all fields
        for (const [field, value] of Object.entries(row)) {
            try {
                // Apply transformer if exists
                const transformedValue = config.fieldTransformers?.[field]
                    ? config.fieldTransformers[field].transform(value, field, row)
                    : this.defaultTransform(value, field);
                // Apply validator if exists
                if (config.fieldValidators?.[field]) {
                    const validationResult = config.fieldValidators[field].validate(transformedValue, field, row);
                    if (validationResult !== true) {
                        const message = typeof validationResult === 'string'
                            ? validationResult
                            : config.fieldValidators[field].message || `Validation failed for field '${field}'`;
                        throw new Error(message);
                    }
                }
                record[field] = transformedValue;
            }
            catch (error) {
                throw new Error(`Field '${field}': ${error instanceof Error ? error.message : 'Validation failed'}`);
            }
        }
        return record;
    }
    static defaultTransform(value, field) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        // Convert to string and trim
        const stringValue = value.toString().trim();
        // Auto-detect types based on field name patterns
        if (field.includes('_at') || field.includes('date') || field.includes('time')) {
            return this.transformDate(stringValue);
        }
        else if (field.includes('_id') || field.includes('id')) {
            return this.transformInteger(stringValue);
        }
        else if (field.includes('week') || field.includes('month') || field.includes('year')) {
            return this.transformInteger(stringValue);
        }
        else if (field.includes('is_') || field.includes('has_') || field === 'active') {
            return this.transformBoolean(stringValue);
        }
        else if (this.looksLikeNumber(stringValue)) {
            return this.transformNumber(stringValue);
        }
        return stringValue;
    }
    static transformDate(value) {
        if (!value)
            return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
    }
    static transformInteger(value) {
        if (!value)
            return null;
        const num = parseInt(value);
        return isNaN(num) ? null : num;
    }
    static transformNumber(value) {
        if (!value)
            return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
    static transformBoolean(value) {
        if (!value)
            return false;
        const truthy = ['true', 'yes', '1', 'on', 'y'];
        return truthy.includes(value.toLowerCase());
    }
    static looksLikeNumber(value) {
        return /^-?\d*\.?\d+$/.test(value);
    }
    static getExpectedColumns(config) {
        return Array.from(new Set([
            ...config.requiredFields,
            ...Object.keys(config.fieldValidators || {}),
            ...Object.keys(config.fieldTransformers || {})
        ]));
    }
    static generateTemplate(config) {
        // Generate sample data based on field types
        return [this.generateSampleRow(config)];
    }
    static generateSampleRow(config) {
        const sample = {};
        const allFields = this.getExpectedColumns(config);
        allFields.forEach(field => {
            if (field.includes('_at') || field.includes('date')) {
                sample[field] = new Date().toISOString().split('T')[0];
            }
            else if (field.includes('_id') || field === 'id') {
                sample[field] = 1;
            }
            else if (field.includes('week')) {
                sample[field] = 1;
            }
            else if (field.includes('email')) {
                sample[field] = 'example@email.com';
            }
            else if (field.includes('name') || field.includes('title')) {
                sample[field] = `Sample ${field}`;
            }
            else if (field.includes('description')) {
                sample[field] = `Sample description for ${field}`;
            }
            else if (field.includes('is_') || field.includes('active')) {
                sample[field] = 'true';
            }
            else {
                sample[field] = `sample_${field}`;
            }
        });
        return sample;
    }
}
exports.UniversalExcelParser = UniversalExcelParser;
UniversalExcelParser.DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
//# sourceMappingURL=excelParsar.js.map