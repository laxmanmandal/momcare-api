"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARSER_CONFIGS = exports.USER_PARSER_CONFIG = exports.ENTITY_PARSER_CONFIG = exports.CONCIEVE_PARSER_CONFIG = void 0;
exports.getParserConfig = getParserConfig;
exports.CONCIEVE_PARSER_CONFIG = {
    tableName: 'Concieve',
    requiredFields: ['title', 'week', 'type'],
    uniqueFields: ['title'],
    fieldValidators: {
        week: {
            validate: (value) => value === null || (value >= 1 && value <= 42),
            message: 'Week must be between 1 and 42'
        },
        type: {
            validate: (value) => value === null || ['Pregnancy', 'Motherhood', 'Conceive'].includes(value),
            message: 'Type must be one of: Pregnancy, Motherhood, Conceive'
        }
    },
    fieldTransformers: {
        week: {
            transform: (value) => value ? parseInt(value) : null
        },
        image: {
            transform: (value) => value ? value.toString().trim() : null
        }
    }
};
// src/config/excelparsarconfig.ts
exports.ENTITY_PARSER_CONFIG = {
    tableName: 'entityTable',
    requiredFields: ['type', 'name', 'email', 'phone', 'location'],
    uniqueFields: ['email', 'phone'],
    fieldValidators: {
        type: {
            validate: (value) => value &&
                ['CHANNEL', 'PARTNER', 'ORGANIZATION'].includes(value.toString().trim().toUpperCase()),
            message: 'Type must be one of: Channel, Partner, Organization'
        },
        email: {
            validate: (value) => value === null ||
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString().trim()),
            message: 'Invalid email format'
        },
        phone: {
            validate: (value) => value && /^\d{10}$/.test(value.toString().trim()),
            message: 'Phone must be 10 digits'
        }
    },
    fieldTransformers: {
        type: { transform: (v) => (v ? v.toString().trim().toUpperCase() : null) },
        name: { transform: (v) => (v ? v.toString().trim() : null) },
        email: { transform: (v) => (v ? v.toString().trim().toLowerCase() : null) },
        phone: { transform: (v) => (v ? v.toString().trim() : null) },
        location: { transform: (v) => (v ? v.toString().trim() : null) },
        description: { transform: (v) => (v ? v.toString().trim() : null) },
        imageUrl: { transform: (v) => (v ? v.toString().trim() : null) },
        createdBy: { transform: (v) => (v ? parseInt(v) : null) },
        belongsToId: { transform: (v) => (v ? parseInt(v) : null) },
        isActive: {
            transform: (v) => v === null || v === undefined
                ? true
                : ['true', '1', 'yes'].includes(v.toString().toLowerCase())
        }
    }
};
exports.USER_PARSER_CONFIG = {
    tableName: "User",
    requiredFields: ["phone", "role"],
    uniqueFields: ["phone", "email", "uuid"],
    fieldValidators: {
        phone: {
            validate: (value) => value && /^\d{10}$/.test(value.toString().trim()),
            message: "Phone must be 10 digits",
        },
        email: {
            validate: (value) => value === null ||
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString()),
            message: "Invalid email format",
        },
        role: {
            validate: (value) => value &&
                ["USER", "ADMIN", "SUPER_ADMIN"].includes(value.toString().trim().toUpperCase()),
            message: "Invalid role",
        },
    },
    fieldTransformers: {
        uuid: {
            transform: (v) => v ? v.toString().trim() : undefined, // let DB generate if missing
        },
        role: {
            transform: (v) => (v ? v.toString().trim().toUpperCase() : "USER"),
        },
        name: {
            transform: (v) => (v ? v.toString().trim() : null),
        },
        imageUrl: {
            transform: (v) => (v ? v.toString().trim() : null),
        },
        type: {
            transform: (v) => (v ? v.toString().trim() : null),
        },
        phone: {
            transform: (v) => (v ? v.toString().trim() : null),
        },
        email: {
            transform: (v) => (v ? v.toString().trim().toLowerCase() : null),
        },
        password: {
            transform: (v) => (v ? v.toString().trim() : null),
        },
        belongsToId: {
            transform: (v) => (v ? parseInt(v) : null),
        },
        expectedDate: {
            transform: (v) => (v ? new Date(v) : null),
        },
        dom: {
            transform: (v) => (v ? new Date(v) : null),
        },
        dob: {
            transform: (v) => (v ? new Date(v) : null),
        },
        isActive: {
            transform: (v) => v === null || v === undefined
                ? true
                : ["true", "1", "yes"].includes(v.toString().toLowerCase()),
        },
    },
};
// Export all configs — keep canonical keys (prefer PascalCase or lowercase)
exports.PARSER_CONFIGS = {
    concieve: exports.CONCIEVE_PARSER_CONFIG,
    user: exports.USER_PARSER_CONFIG,
    EntityTable: exports.ENTITY_PARSER_CONFIG, // canonical
    // (you can still add more canonical entries here)
};
/**
 * Normalize names so lookups are tolerant:
 *   - remove spaces/dashes/underscores
 *   - lowercase
 */
function normalizeKey(name) {
    return (name || '').toString().trim().toLowerCase().replace(/[\s\-_]+/g, '');
}
function getParserConfig(tableName) {
    if (!tableName) {
        throw new Error('Table name is required for parser config lookup');
    }
    // try direct exact match first
    if (exports.PARSER_CONFIGS[tableName])
        return exports.PARSER_CONFIGS[tableName];
    const normalized = normalizeKey(tableName);
    // attempt to find a match among keys after normalization
    for (const key of Object.keys(exports.PARSER_CONFIGS)) {
        if (normalizeKey(key) === normalized) {
            return exports.PARSER_CONFIGS[key];
        }
    }
    throw new Error(`No parser configuration found for table: ${tableName}`);
}
//# sourceMappingURL=excelparsarconfig.js.map