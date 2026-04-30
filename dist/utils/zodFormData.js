"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToFormDataParams = zodToFormDataParams;
exports.zodToMultipartRequestBody = zodToMultipartRequestBody;
const zodOpenApi_1 = require("./zodOpenApi");
function zodToFormDataParams(schema, name) {
    try {
        const json = (0, zodOpenApi_1.zodToJsonSchema)(schema, name || 'schema');
        // Pick deepest definition if available
        let def = json;
        if (json && json.definitions) {
            const defs = Object.values(json.definitions).filter(Boolean);
            def = defs[defs.length - 1] || defs[0] || json;
        }
        const props = def?.properties || json?.properties || {};
        const required = def?.required || json?.required || [];
        return Object.keys(props).map((k) => {
            const p = props[k];
            const isFile = p && (p.contentEncoding === 'binary' || /file|image|icon|thumbnail|photo|avatar|imageUrl/i.test(k));
            const type = isFile ? 'file' : (p?.type || 'string');
            return {
                name: k,
                in: 'formData',
                description: p?.description || undefined,
                required: required.includes(k),
                type,
            };
        });
    }
    catch (err) {
        return [];
    }
}
function zodToMultipartRequestBody(schema, name) {
    try {
        const json = (0, zodOpenApi_1.zodToJsonSchema)(schema, name || 'schema');
        // Pick deepest definition if available
        let def = json;
        if (json && json.definitions) {
            const defs = Object.values(json.definitions).filter(Boolean);
            def = defs[defs.length - 1] || defs[0] || json;
        }
        const props = def?.properties || json?.properties || {};
        const required = def?.required || json?.required || [];
        const outProps = {};
        for (const k of Object.keys(props)) {
            const p = props[k];
            const isFile = p && (p.contentEncoding === 'binary' || /file|image|icon|thumbnail|photo|avatar|imageUrl/i.test(k));
            if (isFile) {
                outProps[k] = { type: 'string', format: 'binary', description: p?.description };
            }
            else if (p && p.type) {
                outProps[k] = { type: p.type, description: p?.description };
            }
            else {
                outProps[k] = { type: 'string', description: p?.description };
            }
        }
        return {
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: outProps,
                        required: required.length ? required : undefined
                    }
                }
            }
        };
    }
    catch (err) {
        return undefined;
    }
}
//# sourceMappingURL=zodFormData.js.map