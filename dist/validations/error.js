"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(errors, message = 'Validation Error') {
        super(message);
        this.statusCode = 422;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=error.js.map