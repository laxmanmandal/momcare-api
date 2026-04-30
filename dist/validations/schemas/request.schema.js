"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionPaymentSchema = exports.subscriptionAllotmentSchema = exports.subscriptionAllocationCreateSchema = exports.subscriptionPlanUpdateSchema = exports.subscriptionPlanCreateSchema = exports.subscriptionIdsParamsSchema = exports.subscriptionUuidParamsSchema = exports.loginLogParamsSchema = exports.loginLogQuerySchema = exports.healthSymptomsSchema = exports.professionCreateSchema = exports.expertPostUpdateMultipartSchema = exports.expertPostCreateMultipartSchema = exports.expertProfessionParamsSchema = exports.expertPostShareParamsSchema = exports.expertPostIdParamsSchema = exports.expertIdParamsSchema = exports.conceiveTypeParamsSchema = exports.conceiveIdParamsSchema = exports.conceiveUpdateMultipartSchema = exports.conceiveCreateMultipartSchema = exports.dailyTipUpdateMultipartSchema = exports.dailyTipCreateMultipartSchema = exports.dailyTipIdParamsSchema = exports.communityCommentPostParamsSchema = exports.communityCommentIdParamsSchema = exports.communityCommentUpdateSchema = exports.communityCommentCreateSchema = exports.communityReactionQuerySchema = exports.communityReactionBodySchema = exports.couponProcessSchema = exports.couponUpdateMultipartSchema = exports.couponCreateMultipartSchema = exports.couponCodeParamsSchema = exports.couponIdParamsSchema = exports.mediaUpdateMultipartSchema = exports.mediaCreateMultipartSchema = exports.mediaSearchQuerySchema = exports.mediaIdParamsSchema = exports.mediaParamsSchema = exports.communityPostTypeParamsSchema = exports.communityPostIdParamsSchema = exports.communityPostUpdateMultipartSchema = exports.communityPostCreateMultipartSchema = exports.communityIdParamsSchema = exports.communityJoinSchema = exports.communityUpdateMultipartSchema = exports.communityCreateMultipartSchema = exports.positiveIntSchema = exports.multipartFileSchema = void 0;
exports.weekBodySchema = exports.dietNuskheMultipartSchema = exports.dietChartMultipartSchema = exports.dietToolIdParamsSchema = exports.courseUpdateBodySchema = exports.courseCreateBodySchema = exports.courseLessonMediaBodySchema = exports.courseLessonBodySchema = exports.courseLessonQuerySchema = exports.courseIdsParamsSchema = exports.courseIdParamsSchema = exports.courseLessonUuidParamsSchema = exports.courseUuidParamsSchema = exports.entityUpdateSchema = exports.entityBodySchema = exports.entityIdParamsSchema = exports.uploadTableQuerySchema = exports.subscriptionConfirmPaymentSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const httpUrlPattern = /^https?:\/\/[^\s]+$/i;
const localAssetPattern = /^\/[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/;
const codePattern = /^[A-Za-z0-9_-]+$/;
exports.multipartFileSchema = zod_1.z.object({
    fieldname: zod_1.z.string(),
    filename: zod_1.z.string(),
    mimetype: zod_1.z.string(),
    buffer: zod_1.z.instanceof(Buffer)
});
exports.positiveIntSchema = zod_1.z.coerce.number().int().positive();
function optionalTrimmedString(maxLength) {
    let schema = zod_1.z.string().trim();
    if (maxLength !== undefined) {
        schema = schema.max(maxLength);
    }
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === 'string' && value.trim() === '')
            return undefined;
        return value;
    }, schema.optional());
}
function requiredTrimmedString(minLength = 1, maxLength) {
    let schema = zod_1.z.string().trim().min(minLength);
    if (maxLength !== undefined) {
        schema = schema.max(maxLength);
    }
    return schema;
}
function optionalAssetReference() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === 'string' && value.trim() === '')
            return undefined;
        return value;
    }, zod_1.z.string().trim().max(2048).refine((value) => {
        return httpUrlPattern.test(value) || localAssetPattern.test(value);
    }, 'must be a valid URL or local asset path').optional());
}
function requiredDate() {
    return zod_1.z.preprocess((value) => {
        if (typeof value === 'string' && value.trim() === '')
            return value;
        return value;
    }, zod_1.z.coerce.date());
}
function optionalDate() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === 'string' && value.trim() === '')
            return undefined;
        return value;
    }, zod_1.z.coerce.date().optional());
}
function nullableNumber(options) {
    let schema = zod_1.z.coerce.number();
    if (options.integer) {
        schema = schema.int();
    }
    if (options.min !== undefined) {
        schema = schema.min(options.min);
    }
    if (options.max !== undefined) {
        schema = schema.max(options.max);
    }
    return zod_1.z.preprocess((value) => {
        if (value === undefined)
            return undefined;
        if (value === null)
            return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' || trimmed.toLowerCase() === 'null')
                return null;
        }
        return value;
    }, zod_1.z.union([schema, zod_1.z.null()]).optional());
}
function nullablePositiveInt() {
    return nullableNumber({ integer: true, min: 1 });
}
function optionalCourseIds() {
    return zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return undefined;
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Array.isArray(parsed) ? parsed : value;
                }
                catch {
                    return value;
                }
            }
            return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
        }
        return value;
    }, zod_1.z.array(zod_1.z.coerce.number().int().positive()).optional());
}
function fileField(maxFiles = 1) {
    return zod_1.z.array(exports.multipartFileSchema).max(maxFiles).optional();
}
function hasMeaningfulValue(value) {
    return Object.values(value).some((entry) => entry !== undefined);
}
const communityFileSchema = zod_1.z.object({
    imageUrl: fileField()
}).strict();
exports.communityCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        name: requiredTrimmedString(2, 120),
        description: optionalTrimmedString(1000)
    }).strict(),
    files: communityFileSchema
}).strict();
exports.communityUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        name: optionalTrimmedString(120),
        description: optionalTrimmedString(1000)
    }).strict(),
    files: communityFileSchema
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.imageUrl?.length ?? 0) > 0;
}, 'At least one field is required');
exports.communityJoinSchema = zod_1.z.object({
    userId: exports.positiveIntSchema.optional(),
    communityId: exports.positiveIntSchema
}).strict();
exports.communityIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
const communityPostFileSchema = zod_1.z.object({
    media: fileField()
}).strict();
const communityPostTypeSchema = zod_1.z.nativeEnum(client_1.PostType);
exports.communityPostCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: requiredTrimmedString(2, 160),
        content: requiredTrimmedString(2, 10000),
        communityId: exports.positiveIntSchema,
        userId: exports.positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(50),
        type: communityPostTypeSchema.optional()
    }).strict(),
    files: communityPostFileSchema
}).strict();
exports.communityPostUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: optionalTrimmedString(160),
        content: optionalTrimmedString(10000),
        communityId: exports.positiveIntSchema.optional(),
        userId: exports.positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(50),
        type: communityPostTypeSchema.optional()
    }).strict(),
    files: communityPostFileSchema
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.media?.length ?? 0) > 0;
}, 'Nothing to update');
exports.communityPostIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.communityPostTypeParamsSchema = zod_1.z.object({
    type: communityPostTypeSchema
}).strict();
const mediaFileSchema = zod_1.z.object({
    url: fileField(),
    thumbnail: fileField()
}).strict();
exports.mediaParamsSchema = zod_1.z.object({
    uuid: zod_1.z.string().trim().min(2).max(64)
}).strict();
exports.mediaIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.mediaSearchQuerySchema = zod_1.z.object({
    query: optionalTrimmedString(),
    type: optionalTrimmedString(50),
    mimeType: optionalTrimmedString(100)
}).strict();
exports.mediaCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: requiredTrimmedString(2, 160),
        type: requiredTrimmedString(2, 50),
        mimeType: optionalTrimmedString(100),
        mimetype: optionalTrimmedString(100),
        url: optionalAssetReference(),
        thumbnail: optionalAssetReference()
    }).strict(),
    files: mediaFileSchema
}).strict().superRefine(({ fields, files }, ctx) => {
    if ((files.url?.length ?? 0) === 0 && !fields.url) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'url'],
            message: 'url is required'
        });
    }
});
exports.mediaUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: optionalTrimmedString(160),
        type: optionalTrimmedString(50),
        mimeType: optionalTrimmedString(100),
        mimetype: optionalTrimmedString(100),
        url: optionalAssetReference(),
        thumbnail: optionalAssetReference()
    }).strict(),
    files: mediaFileSchema
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.url?.length ?? 0) > 0 || (files.thumbnail?.length ?? 0) > 0;
}, 'At least one field is required to update the media resource');
const couponFileSchema = zod_1.z.object({
    image: fileField()
}).strict();
const couponCodeSchema = requiredTrimmedString(3, 50).regex(codePattern, 'code must contain only letters, numbers, underscores, and hyphens');
exports.couponIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.couponCodeParamsSchema = zod_1.z.object({
    coupon_code: requiredTrimmedString(1, 255)
}).strict();
exports.couponCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        code: couponCodeSchema,
        percent: nullableNumber({ min: 0, max: 100 }),
        fixed_amount: nullableNumber({ min: 0 }),
        assigned_user_id: nullablePositiveInt(),
        effective_at: requiredDate(),
        expires_at: requiredDate()
    }).strict(),
    files: couponFileSchema
}).strict().superRefine(({ fields }, ctx) => {
    const { percent, fixed_amount, effective_at, expires_at } = fields;
    if (percent == null && fixed_amount == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'percent'],
            message: 'Either percent or fixed_amount is required'
        });
    }
    if (percent != null && fixed_amount != null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'fixed_amount'],
            message: 'Percent and fixed_amount cannot both be provided'
        });
    }
    if (effective_at > expires_at) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'expires_at'],
            message: 'effective_at must be before or equal to expires_at'
        });
    }
});
exports.couponUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        code: couponCodeSchema.optional(),
        percent: nullableNumber({ min: 0, max: 100 }),
        fixed_amount: nullableNumber({ min: 0 }),
        assigned_user_id: nullablePositiveInt(),
        effective_at: optionalDate(),
        expires_at: optionalDate()
    }).strict(),
    files: couponFileSchema
}).strict().superRefine(({ fields }, ctx) => {
    const hasDiscountInput = fields.percent !== undefined || fields.fixed_amount !== undefined;
    if (fields.percent !== undefined && fields.fixed_amount !== undefined && fields.percent !== null && fields.fixed_amount !== null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'fixed_amount'],
            message: 'Percent and fixed_amount cannot both be provided'
        });
    }
    if (hasDiscountInput && fields.percent === null && fields.fixed_amount === null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'percent'],
            message: 'At least one discount value must remain set'
        });
    }
    if (fields.effective_at && fields.expires_at && fields.effective_at > fields.expires_at) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['fields', 'expires_at'],
            message: 'effective_at must be before or equal to expires_at'
        });
    }
});
exports.couponProcessSchema = zod_1.z.object({
    couponCode: requiredTrimmedString(3, 50),
    planId: exports.positiveIntSchema
}).strict();
exports.communityReactionBodySchema = zod_1.z.object({
    postId: exports.positiveIntSchema.optional(),
    commentId: exports.positiveIntSchema.optional()
}).strict().refine((data) => data.postId !== undefined || data.commentId !== undefined, {
    message: 'PostId or commentId are required'
});
exports.communityReactionQuerySchema = exports.communityReactionBodySchema;
exports.communityCommentCreateSchema = zod_1.z.object({
    postId: exports.positiveIntSchema,
    userId: exports.positiveIntSchema,
    parentId: exports.positiveIntSchema.optional(),
    content: requiredTrimmedString(1, 5000)
}).strict();
exports.communityCommentUpdateSchema = zod_1.z.object({
    content: requiredTrimmedString(1, 5000)
}).strict();
exports.communityCommentIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.communityCommentPostParamsSchema = zod_1.z.object({
    postId: exports.positiveIntSchema
}).strict();
exports.dailyTipIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.dailyTipCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: requiredTrimmedString(1, 255),
        heading: requiredTrimmedString(1, 255),
        subheading: requiredTrimmedString(1, 255),
        content: requiredTrimmedString(1, 5000),
        category: requiredTrimmedString(1, 255)
    }).strict(),
    files: zod_1.z.object({
        icon: fileField()
    }).strict()
}).strict();
exports.dailyTipUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: optionalTrimmedString(255),
        heading: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000),
        category: optionalTrimmedString(255)
    }).strict(),
    files: zod_1.z.object({
        icon: fileField()
    }).strict()
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.icon?.length ?? 0) > 0;
}, 'At least one field is required');
exports.conceiveCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        week: zod_1.z.coerce.number().int().positive(),
        title: requiredTrimmedString(1, 255),
        subtitle: optionalTrimmedString(255),
        type: optionalTrimmedString(100),
        description: optionalTrimmedString(5000),
        height: optionalTrimmedString(100),
        weight: optionalTrimmedString(100)
    }).strict(),
    files: zod_1.z.object({
        thumbnail: fileField(),
        image: fileField()
    }).strict()
}).strict();
exports.conceiveUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        week: zod_1.z.coerce.number().int().positive().optional(),
        title: optionalTrimmedString(255),
        subtitle: optionalTrimmedString(255),
        type: optionalTrimmedString(100),
        description: optionalTrimmedString(5000),
        height: optionalTrimmedString(100),
        weight: optionalTrimmedString(100)
    }).strict(),
    files: zod_1.z.object({
        thumbnail: fileField(),
        image: fileField()
    }).strict()
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.thumbnail?.length ?? 0) > 0 || (files.image?.length ?? 0) > 0;
}, 'At least one field is required');
exports.conceiveIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.conceiveTypeParamsSchema = zod_1.z.object({
    type: requiredTrimmedString(1, 100)
}).strict();
exports.expertIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.expertPostIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.expertPostShareParamsSchema = zod_1.z.object({
    postId: exports.positiveIntSchema
}).strict();
exports.expertProfessionParamsSchema = zod_1.z.object({
    professionId: exports.positiveIntSchema
}).strict();
exports.expertPostCreateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: requiredTrimmedString(1, 255),
        content: requiredTrimmedString(1, 10000),
        expert_id: exports.positiveIntSchema,
        mediaType: optionalTrimmedString(255)
    }).strict(),
    files: zod_1.z.object({
        media: fileField()
    }).strict()
}).strict();
exports.expertPostUpdateMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        title: optionalTrimmedString(255),
        content: optionalTrimmedString(10000),
        expert_id: exports.positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(255)
    }).strict(),
    files: zod_1.z.object({
        media: fileField()
    }).strict()
}).strict().refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.media?.length ?? 0) > 0;
}, 'At least one field is required');
exports.professionCreateSchema = zod_1.z.object({
    name: requiredTrimmedString(1, 255)
}).strict();
exports.healthSymptomsSchema = zod_1.z.object({
    symptoms: zod_1.z.array(zod_1.z.string().trim().min(1)).min(1)
}).strict();
exports.loginLogQuerySchema = zod_1.z.object({
    search: optionalTrimmedString(255),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
}).strict();
exports.loginLogParamsSchema = zod_1.z.object({
    userId: exports.positiveIntSchema
}).strict();
exports.subscriptionUuidParamsSchema = zod_1.z.object({
    uuid: zod_1.z.string().trim().min(2).max(64)
}).strict();
exports.subscriptionIdsParamsSchema = zod_1.z.object({
    ids: zod_1.z.string().trim().min(1)
}).strict();
exports.subscriptionPlanCreateSchema = zod_1.z.object({
    fields: zod_1.z.object({
        name: requiredTrimmedString(1, 255),
        price: zod_1.z.coerce.number().nonnegative(),
        courseIds: optionalCourseIds()
    }).strict(),
    files: zod_1.z.object({
        thumbnail: fileField()
    }).strict()
}).strict();
exports.subscriptionPlanUpdateSchema = zod_1.z.object({
    name: optionalTrimmedString(255),
    price: zod_1.z.coerce.number().nonnegative().optional(),
    courseIds: optionalCourseIds()
}).strict().refine((data) => data.name !== undefined || data.price !== undefined || data.courseIds !== undefined, {
    message: 'At least one field is required'
});
exports.subscriptionAllocationCreateSchema = zod_1.z.object({
    receiverId: exports.positiveIntSchema.optional(),
    userId: exports.positiveIntSchema.optional(),
    quantity: zod_1.z.coerce.number().int().optional(),
    type: zod_1.z.enum(['ALLOCATE', 'SELL', 'REVOKE']),
    planId: exports.positiveIntSchema
}).strict();
exports.subscriptionAllotmentSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive(),
    planId: exports.positiveIntSchema,
    coupon_code: zod_1.z.preprocess((value) => {
        if (value === undefined || value === null)
            return undefined;
        if (typeof value === 'string' && value.trim() === '')
            return undefined;
        return value;
    }, zod_1.z.string().trim().min(1).optional())
}).strict();
exports.subscriptionPaymentSchema = exports.subscriptionAllotmentSchema;
exports.subscriptionConfirmPaymentSchema = zod_1.z.object({
    razorpay_order_id: zod_1.z.string().trim().min(1),
    razorpay_payment_id: zod_1.z.string().trim().min(1),
    razorpay_signature: zod_1.z.string().trim().min(1)
}).strict();
exports.uploadTableQuerySchema = zod_1.z.object({
    table: requiredTrimmedString(1, 100)
}).strict();
exports.entityIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
const nullableString = zod_1.z.union([zod_1.z.string(), zod_1.z.null()]);
exports.entityBodySchema = zod_1.z.object({
    type: requiredTrimmedString(1, 255),
    name: requiredTrimmedString(1, 255),
    phone: optionalTrimmedString(50),
    email: zod_1.z.string().trim().email(),
    location: zod_1.z.union([optionalTrimmedString(255), zod_1.z.literal('')]).optional(),
    description: zod_1.z.union([optionalTrimmedString(5000), zod_1.z.literal('')]).optional(),
    imageUrl: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
    createdBy: zod_1.z.union([exports.positiveIntSchema, zod_1.z.null()]).optional(),
    belongsToId: zod_1.z.union([exports.positiveIntSchema, zod_1.z.null()]).optional(),
    isActive: zod_1.z.union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false'])]).optional()
}).strict();
exports.entityUpdateSchema = zod_1.z.object({
    type: optionalTrimmedString(255),
    name: optionalTrimmedString(255),
    phone: optionalTrimmedString(50),
    email: zod_1.z.string().trim().email().optional(),
    location: zod_1.z.union([optionalTrimmedString(255), zod_1.z.literal('')]).optional(),
    description: zod_1.z.union([optionalTrimmedString(5000), zod_1.z.literal('')]).optional(),
    imageUrl: zod_1.z.union([zod_1.z.string(), zod_1.z.null()]).optional(),
    isActive: zod_1.z.union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false'])]).optional()
}).strict().refine((data) => {
    return Object.values(data).some((value) => value !== undefined);
}, { message: 'At least one field is required' });
exports.courseUuidParamsSchema = zod_1.z.object({
    uuid: zod_1.z.string().trim().min(2).max(64)
}).strict();
exports.courseLessonUuidParamsSchema = zod_1.z.object({
    lessonUuid: zod_1.z.string().trim().min(2).max(64)
}).strict();
exports.courseIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.courseIdsParamsSchema = zod_1.z.object({
    ids: zod_1.z.string().trim().min(1)
}).strict();
exports.courseLessonQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().default(10),
    search: optionalTrimmedString(255),
    sortField: optionalTrimmedString(255),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
}).strict();
exports.courseLessonBodySchema = zod_1.z.object({
    title: optionalTrimmedString(255),
    description: optionalTrimmedString(5000),
    mediaResourceId: exports.positiveIntSchema.optional()
}).strict();
exports.courseLessonMediaBodySchema = zod_1.z.object({
    lessonId: exports.positiveIntSchema.optional(),
    title: optionalTrimmedString(255),
    mediaResourceId: exports.positiveIntSchema.optional(),
    description: optionalTrimmedString(5000),
    is_active: zod_1.z.union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false'])]).optional()
}).strict();
exports.courseCreateBodySchema = zod_1.z.object({
    title: optionalTrimmedString(255),
    description: optionalTrimmedString(5000),
    category: optionalTrimmedString(255),
    mediaResourceId: exports.positiveIntSchema.optional()
}).strict();
exports.courseUpdateBodySchema = exports.courseCreateBodySchema.refine((data) => {
    return Object.values(data).some((value) => value !== undefined);
}, { message: 'At least one field is required' });
exports.dietToolIdParamsSchema = zod_1.z.object({
    id: exports.positiveIntSchema
}).strict();
exports.dietChartMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        creator: optionalTrimmedString(255),
        heading: optionalTrimmedString(255),
        weekId: zod_1.z.coerce.number().int().positive().optional(),
        category: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000),
        toolType: optionalTrimmedString(255)
    }).strict(),
    files: zod_1.z.object({
        icon: fileField()
    }).strict()
}).strict();
exports.dietNuskheMultipartSchema = zod_1.z.object({
    fields: zod_1.z.object({
        creator: optionalTrimmedString(255),
        category: optionalTrimmedString(255),
        heading: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000)
    }).strict(),
    files: zod_1.z.object({
        icon: fileField()
    }).strict()
}).strict();
exports.weekBodySchema = zod_1.z.object({
    name: requiredTrimmedString(1, 255),
    order: zod_1.z.coerce.number()
}).strict();
//# sourceMappingURL=request.schema.js.map