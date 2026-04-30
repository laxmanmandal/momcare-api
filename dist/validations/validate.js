"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateData = validateData;
exports.validateRequest = validateRequest;
const error_1 = require("./error");
function formatIssues(error) {
    return error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.map(String).join('.') : 'root',
        message: issue.message
    }));
}
function validateData(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    throw new error_1.ValidationError(formatIssues(result.error));
}
function validateRequest(schema, source = 'body') {
    const handler = async (req, _reply) => {
        const parsed = validateData(schema, req[source]);
        const current = (req.validated ?? {});
        current[source] = parsed;
        req.validated = current;
    };
    ;
    handler._zodSchema = { source, schema };
    return handler;
}
//# sourceMappingURL=validate.js.map