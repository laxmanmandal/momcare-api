"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToFormDataParams = zodToFormDataParams;
const zod_to_json_schema_1 = require("zod-to-json-schema");
function zodToFormDataParams(schema, name) {
    try {
        const json = (0, zod_to_json_schema_1.zodToJsonSchema)(schema, name || 'schema');
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
//# sourceMappingURL=zodFormData.js.map