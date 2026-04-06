import { Prisma } from '@prisma/client';

export type QueryParams = {
    search?: string;
    filter?: Record<string, string | string[]>;
    sort?: string;
    page?: string;
    limit?: string;
};

export type QueryConfig = {
    searchFields?: string[];
    allowedFilters?: string[];
    defaultSort?: string;
    maxLimit?: number;
};

export function buildQuery<T>(
    params: QueryParams,
    config: QueryConfig = {}
) {
    const {
        searchFields = [],
        allowedFilters = [],
        defaultSort = '-createdAt',
        maxLimit = 100,
    } = config;

    const where: any = {};
    const orderBy: any[] = [];
    const page = Math.max(1, parseInt(params.page || '1'));
    const limit = Math.min(maxLimit, parseInt(params.limit || '10'));
    const skip = (page - 1) * limit;

    // === 1. SEARCH ===
    if (params.search && searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
            [field]: { contains: params.search, mode: 'insensitive' } as any
        }));
    }

    // === 2. FILTERS ===
    if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
            // Skip if not allowed
            if (allowedFilters.length > 0 && !allowedFilters.includes(key)) return;

            if (key.includes('.')) {
                // Relation filter: instructor.uuid
                const [relation, field] = key.split('.');
                where[relation] = { [field]: value };
            } else if (Array.isArray(value)) {
                // IN filter: status=active,draft → { status: { in: [...] } }
                where[key] = { in: value };
            } else {
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