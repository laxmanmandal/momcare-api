"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQuery = buildQuery;
function buildQuery(params, config = {}) {
    const { searchFields = [], allowedFilters = [], defaultSort = '-createdAt', maxLimit = 100, } = config;
    const where = {};
    const orderBy = [];
    const page = Math.max(1, parseInt(params.page || '1'));
    const limit = Math.min(maxLimit, parseInt(params.limit || '10'));
    const skip = (page - 1) * limit;
    // === 1. SEARCH ===
    if (params.search && searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
            [field]: { contains: params.search, mode: 'insensitive' }
        }));
    }
    // === 2. FILTERS ===
    if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
            // Skip if not allowed
            if (allowedFilters.length > 0 && !allowedFilters.includes(key))
                return;
            if (key.includes('.')) {
                // Relation filter: instructor.uuid
                const [relation, field] = key.split('.');
                where[relation] = { [field]: value };
            }
            else if (Array.isArray(value)) {
                // IN filter: status=active,draft → { status: { in: [...] } }
                where[key] = { in: value };
            }
            else {
                where[key] = value;
            }
        });
    }
    // === 3. SORTING ===
    const sortStr = params.sort || defaultSort;
    sortStr.split(',').forEach(field => {
        const desc = field.startsWith('-');
        const clean = desc ? field.slice(1) : field;
        orderBy.push({ [clean]: desc ? 'desc' : 'asc' });
    });
    return { where, orderBy, skip, take: limit, page, total: 0 };
}
//# sourceMappingURL=prima.query.js.map