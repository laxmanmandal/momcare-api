// src/types/excel.ts
export interface UploadResponse {
  success: boolean;
  message: string;
  processed: number;
  errors: UploadError[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export interface UploadError {
  row: number;
  error: string;
  data: any;
  field?: string;
}

export interface ParserConfig {
  tableName: string;
  requiredFields: string[];
  uniqueFields?: string[];
  fieldValidators?: Record<string, FieldValidator>;
  fieldTransformers?: Record<string, FieldTransformer>;
  maxFileSize?: number;
}

export interface FieldValidator {
  validate: (value: any, field: string, row: any) => boolean | string;
  message?: string;
}

export interface FieldTransformer {
  transform: (value: any, field: string, row: any) => any;
}

export interface ParseResult {
  records: any[];
  errors: UploadError[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}