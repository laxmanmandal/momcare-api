import { PostType, ProfileCategory } from "@prisma/client";
import { z } from "zod";

const httpUrlPattern = /^https?:\/\/[^\s]+$/i;
const localAssetPattern = /^\/[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/;
const codePattern = /^[A-Za-z0-9_-]+$/;

const startsWithLetterPattern = /^\p{L}/u;
const startsWithLetterMsg = "must start with a letter";

export const multipartFileSchema = z.object({
  fieldname: z.string(),
  filename: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
});

export const positiveIntSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? val : num;
  },
  z.coerce.number().int().positive()
);

function optionalTrimmedString(maxLength?: number, pattern?: RegExp, message?: string) {
  let schema = z.string().trim();

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  if (pattern) {
    schema = schema.regex(pattern, message);
  }

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());
}

function optionalBooleanQuery() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }
    return value;
  }, z.boolean().optional());
}

function hasMeaningfulValueExcept(value: Record<string, unknown>, ignoredKeys: string[] = []) {
  return Object.entries(value).some(([key, entry]) => {
    return !ignoredKeys.includes(key) && entry !== undefined;
  });
}

function requiredTrimmedString(minLength = 1, maxLength?: number, pattern?: RegExp, message?: string) {
  let schema = z.string().trim().min(minLength, "is required");

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  if (pattern) {
    schema = schema.regex(pattern, message);
  }

  return schema;
}

function profileCategoryField(options: { optional?: boolean } = {}) {
  const schema = z.nativeEnum(ProfileCategory, {
    error: "must be one of TTC, PREG, or MOTHER",
  });

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") return value;

    const normalized = value.trim().toUpperCase();
    if (!normalized) return undefined;

    const aliases: Record<string, ProfileCategory> = {
      CONCEIVE: ProfileCategory.TTC,
      PREGNANCY: ProfileCategory.PREG,
      MOTHERHOOD: ProfileCategory.MOTHER,
    };

    return aliases[normalized] ?? normalized;
  }, options.optional ? schema.optional() : schema);
}

function optionalAssetReference() {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    },
    z
      .string()
      .trim()
      .max(2048)
      .refine((value) => {
        return httpUrlPattern.test(value) || localAssetPattern.test(value);
      }, "must be a valid URL or local asset path")
      .optional(),
  );
}

function requiredDate() {
  return z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return value;
    return value;
  }, z.coerce.date());
}

function optionalDate() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.coerce.date().optional());
}

function nullableNumber(options: {
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  let schema = z.coerce.number();

  if (options.integer) {
    schema = schema.int();
  }

  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }

  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }

  return z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
      }
      return value;
    },
    z.union([schema, z.null()]).optional(),
  );
}

function nullablePositiveInt() {
  return nullableNumber({ integer: true, min: 1 });
}

function optionalCourseIds() {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) return undefined;

      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : value;
        } catch {
          return value;
        }
      }

      return trimmed
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    return value;
  }, z.array(z.coerce.number().int().positive()).optional());
}

function fileField(maxFiles = 1) {
  return z.array(multipartFileSchema).max(maxFiles).optional();
}

function hasMeaningfulValue(value: Record<string, unknown>) {
  return Object.values(value).some((entry) => entry !== undefined);
}

const communityFileSchema = z
  .object({
    imageUrl: fileField(),
  })
  .strict();

export const communityCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        name: requiredTrimmedString(2, 120, startsWithLetterPattern, startsWithLetterMsg),
        description: optionalTrimmedString(1000),
      })
      .strict(),
    files: communityFileSchema,
  })
  .strict();

export const communityUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        name: optionalTrimmedString(120, startsWithLetterPattern, startsWithLetterMsg),
        description: optionalTrimmedString(1000),
      })
      .strict(),
    files: communityFileSchema,
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.imageUrl?.length ?? 0) > 0;
  }, "At least one field is required");

export const communityJoinSchema = z
  .object({
    userId: positiveIntSchema.optional(),
    communityId: positiveIntSchema,
  })
  .strict();

export const communityIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

const communityPostFileSchema = z
  .object({
    media: fileField(),
  })
  .strict();

const communityPostTypeSchema = z.enum(PostType);

export const communityPostCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: requiredTrimmedString(2, 160, startsWithLetterPattern, startsWithLetterMsg),
        content: requiredTrimmedString(2, 10000),
        communityId: positiveIntSchema,
        userId: positiveIntSchema.optional(),
        mediaType: requiredTrimmedString(1, 50),
        type: communityPostTypeSchema,
      })
      .strict(),
    files: communityPostFileSchema,
  })
  .strict();

export const communityPostUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(160, startsWithLetterPattern, startsWithLetterMsg),
        content: optionalTrimmedString(10000),
        communityId: positiveIntSchema.optional(),
        userId: positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(50),
        type: communityPostTypeSchema.optional(),
      })
      .strict(),
    files: communityPostFileSchema,
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.media?.length ?? 0) > 0;
  }, "Nothing to update");

export const communityPostIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const communityPostTypeParamsSchema = z
  .object({
    type: communityPostTypeSchema,
  })
  .strict();

export const communityPostListQuerySchema = z
  .object({
    search: optionalTrimmedString(255),
    type: communityPostTypeSchema.optional(),
    communityId: positiveIntSchema.optional(),
    userId: positiveIntSchema.optional(),
    mediaType: optionalTrimmedString(50),
    featured: optionalBooleanQuery(),
    isActive: optionalBooleanQuery(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortField: z.enum(["id", "title", "type", "featured", "isActive", "created_at", "updated_at", "viewCount", "shareCount"]).default("created_at"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

const mediaFileSchema = z
  .object({
    url: fileField(),
    thumbnail: fileField(),
  })
  .strict();

export const mediaParamsSchema = z
  .object({
    uuid: z.string().trim().min(2).max(64),
  })
  .strict();

export const mediaIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const mediaSearchQuerySchema = z
  .object({
    query: optionalTrimmedString(),
    type: optionalTrimmedString(50),
    mimeType: optionalTrimmedString(100),
  })
  .strict();

export const mediaCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: requiredTrimmedString(2, 160, startsWithLetterPattern, startsWithLetterMsg),
        type: requiredTrimmedString(2, 50),
        mimeType: optionalTrimmedString(100),
        mimetype: optionalTrimmedString(100),
        url: optionalAssetReference(),
        thumbnail: optionalAssetReference(),
      })
      .strict(),
    files: mediaFileSchema,
  })
  .strict()
  .superRefine(({ fields, files }, ctx) => {
    if ((files.url?.length ?? 0) === 0 && !fields.url) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "url"],
        message: "url is required",
      });
    }
  });

export const mediaUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(160, startsWithLetterPattern, startsWithLetterMsg),
        type: optionalTrimmedString(50),
        mimeType: optionalTrimmedString(100),
        mimetype: optionalTrimmedString(100),
        url: optionalAssetReference(),
        thumbnail: optionalAssetReference(),
      })
      .strict(),
    files: mediaFileSchema,
  })
  .strict()
  .refine(({ fields, files }) => {
    return (
      hasMeaningfulValue(fields) ||
      (files.url?.length ?? 0) > 0 ||
      (files.thumbnail?.length ?? 0) > 0
    );
  }, "At least one field is required to update the media resource");

const couponFileSchema = z
  .object({
    image: fileField(),
  })
  .strict();

const couponCodeSchema = requiredTrimmedString(3, 50).regex(
  codePattern,
  "code must contain only letters, numbers, underscores, and hyphens",
);

export const couponIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const couponCodeParamsSchema = z
  .object({
    coupon_code: requiredTrimmedString(1, 255),
  })
  .strict();

export const couponCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        code: couponCodeSchema,
        percent: nullableNumber({ min: 0, max: 100 }),
        fixed_amount: nullableNumber({ min: 0 }),
        assigned_user_id: nullablePositiveInt(),
        effective_at: requiredDate(),
        expires_at: requiredDate(),
      })
      .strict(),
    files: couponFileSchema,
  })
  .strict()
  .superRefine(({ fields }, ctx) => {
    const { percent, fixed_amount, effective_at, expires_at } = fields;

    if (percent == null && fixed_amount == null) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "percent"],
        message: "Either percent or fixed_amount is required",
      });
    }

    if (percent != null && fixed_amount != null) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "fixed_amount"],
        message: "Percent and fixed_amount cannot both be provided",
      });
    }

    if (effective_at > expires_at) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "expires_at"],
        message: "effective_at must be before or equal to expires_at",
      });
    }
  });

export const couponUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        code: couponCodeSchema.optional(),
        percent: nullableNumber({ min: 0, max: 100 }),
        fixed_amount: nullableNumber({ min: 0 }),
        assigned_user_id: nullablePositiveInt(),
        effective_at: optionalDate(),
        expires_at: optionalDate(),
      })
      .strict(),
    files: couponFileSchema,
  })
  .strict()
  .superRefine(({ fields }, ctx) => {
    const hasDiscountInput =
      fields.percent !== undefined || fields.fixed_amount !== undefined;

    if (
      fields.percent !== undefined &&
      fields.fixed_amount !== undefined &&
      fields.percent !== null &&
      fields.fixed_amount !== null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "fixed_amount"],
        message: "Percent and fixed_amount cannot both be provided",
      });
    }

    if (
      hasDiscountInput &&
      fields.percent === null &&
      fields.fixed_amount === null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "percent"],
        message: "At least one discount value must remain set",
      });
    }

    if (
      fields.effective_at &&
      fields.expires_at &&
      fields.effective_at > fields.expires_at
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fields", "expires_at"],
        message: "effective_at must be before or equal to expires_at",
      });
    }
  });

export const couponProcessSchema = z
  .object({
    couponCode: requiredTrimmedString(3, 50),
    planId: positiveIntSchema,
  })
  .strict();

export const communityReactionBodySchema = z
  .object({
    postId: positiveIntSchema.optional(),
    commentId: positiveIntSchema.optional(),
  })
  .strict()
  .refine((data) => data.postId !== undefined || data.commentId !== undefined, {
    message: "PostId or commentId are required",
  });

export const communityReactionQuerySchema = communityReactionBodySchema;

export const communityCommentCreateSchema = z
  .object({
    postId: positiveIntSchema,
    userId: positiveIntSchema,
    parentId: positiveIntSchema.optional(),
    content: requiredTrimmedString(1, 5000),
  })
  .strict();

export const communityCommentUpdateSchema = z
  .object({
    content: requiredTrimmedString(1, 5000),
  })
  .strict();

export const communityCommentIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const communityCommentPostParamsSchema = z
  .object({
    postId: positiveIntSchema,
  })
  .strict();

export const dailyTipIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const dailyTipCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        heading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        category: profileCategoryField(),
        subheading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        content: requiredTrimmedString(1, 10000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict();

export const dailyTipUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        heading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        category: profileCategoryField({ optional: true }),
        subheading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        content: optionalTrimmedString(10000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValueExcept(fields, ["icon"]) || (files?.icon?.length ?? 0) > 0;
  }, "At least one field is required");

export const contentToolListQuerySchema = z
  .object({
    search: optionalTrimmedString(255),
    category: profileCategoryField({ optional: true }),
    isActive: optionalBooleanQuery(),
    weekId: positiveIntSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortField: z.enum(["id", "heading", "category", "created_at", "updated_at"]).default("created_at"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const conceiveCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        week: z.coerce.number().int().positive(),
        title: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        subtitle: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        type: optionalTrimmedString(100),
        description: optionalTrimmedString(5000),
        height: optionalTrimmedString(100),
        weight: optionalTrimmedString(100),
      })
      .strict(),
    files: z
      .object({
        thumbnail: fileField(),
        image: fileField(),
      })
      .strict(),
  })
  .strict();

export const conceiveUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        week: z.coerce.number().int().positive().optional(),
        title: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        subtitle: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        type: optionalTrimmedString(100),
        description: optionalTrimmedString(5000),
        height: optionalTrimmedString(100),
        weight: optionalTrimmedString(100),
      })
      .strict(),
    files: z
      .object({
        thumbnail: fileField(),
        image: fileField(),
      })
      .strict(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return (
      hasMeaningfulValue(fields) ||
      (files.thumbnail?.length ?? 0) > 0 ||
      (files.image?.length ?? 0) > 0
    );
  }, "At least one field is required");

export const conceiveIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const conceiveTypeParamsSchema = z
  .object({
    type: requiredTrimmedString(1, 100),
  })
  .strict();

export const expertIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const expertCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        name: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        profession_id: positiveIntSchema,
        name_org: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        qualification: optionalTrimmedString(255),
        bio: optionalTrimmedString(2000),
        certifications: optionalTrimmedString(10000),
        availability: optionalTrimmedString(10000),
        languages: optionalTrimmedString(10000),
      })
      .strict(),
    files: z
      .object({
        image: fileField(),
      })
      .strict(),
  })
  .strict();

export const expertUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        name: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        profession_id: positiveIntSchema.optional(),
        name_org: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        qualification: optionalTrimmedString(255),
        bio: optionalTrimmedString(2000),
        certifications: optionalTrimmedString(10000),
        availability: optionalTrimmedString(10000),
        languages: optionalTrimmedString(10000),
      })
      .strict(),
    files: z
      .object({
        image: fileField(),
      })
      .strict(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.image?.length ?? 0) > 0;
  }, "At least one field is required");

export const expertPostIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const expertPostShareParamsSchema = z
  .object({
    postId: positiveIntSchema,
  })
  .strict();

export const expertProfessionParamsSchema = z
  .object({
    professionId: positiveIntSchema,
  })
  .strict();

export const expertPostCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        content: requiredTrimmedString(1, 10000),
        expert_id: positiveIntSchema,
        communityId: positiveIntSchema,
        mediaType: optionalTrimmedString(255),
      })
      .strict(),
    files: z
      .object({
        media: fileField(),
      })
      .strict(),
  })
  .strict();

export const expertPostUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        content: optionalTrimmedString(10000),
        expert_id: positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(255),
      })
      .strict(),
    files: z
      .object({
        media: fileField(),
      })
      .strict(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.media?.length ?? 0) > 0;
  }, "At least one field is required");

export const professionCreateSchema = z
  .object({
    name: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
  })
  .strict();

export const healthSymptomsSchema = z
  .object({
    symptoms: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const loginLogQuerySchema = z
  .object({
    search: optionalTrimmedString(255),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  })
  .strict();

export const loginLogParamsSchema = z
  .object({
    userId: positiveIntSchema,
  })
  .strict();

export const subscriptionUuidParamsSchema = z
  .object({
    uuid: z.string().trim().min(2).max(64),
  })
  .strict();

export const subscriptionIdsParamsSchema = z
  .object({
    ids: z.string().trim().min(1),
  })
  .strict();

export const subscriptionPlanCreateSchema = z
  .object({
    fields: z
      .object({
        name: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        price: z.coerce.number().nonnegative(),
        isVisible: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
        courseIds: optionalCourseIds(),
      })
      .strict(),
    files: z
      .object({
        thumbnail: fileField(),
      })
      .strict(),
  })
  .strict();

export const subscriptionPlanUpdateSchema = z
  .object({
    name: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
    price: z.coerce.number().nonnegative().optional(),
    isVisible: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
    courseIds: optionalCourseIds(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.price !== undefined ||
      data.isVisible !== undefined ||
      data.courseIds !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const subscriptionAllocationCreateSchema = z
  .object({
    receiverId: positiveIntSchema.optional(),
    userId: positiveIntSchema.optional(),
    quantity: z.coerce.number().int().optional(),
    type: z.enum(["ALLOCATE", "SELL", "REVOKE"]),
    planId: positiveIntSchema,
  })
  .strict();

export const subscriptionAllotmentSchema = z
  .object({
    amount: z.coerce.number().positive(),
    planId: positiveIntSchema,
    coupon_code: z.preprocess((value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return value;
    }, z.string().trim().min(1).optional()),
  })
  .strict();

export const subscriptionPaymentSchema = subscriptionAllotmentSchema;

export const subscriptionConfirmPaymentSchema = z
  .object({
    razorpay_order_id: z.string().trim().min(1),
    razorpay_payment_id: z.string().trim().min(1),
    razorpay_signature: z.string().trim().min(1),
  })
  .strict();

export const uploadTableQuerySchema = z
  .object({
    table: requiredTrimmedString(1, 100),
  })
  .strict();

export const entityIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

const nullableString = z.union([z.string(), z.null()]);

export const entityBodySchema = z
  .object({
    type: requiredTrimmedString(1, 255),
    name: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
    phone: optionalTrimmedString(50),
    email: z.string().trim().pipe(z.email()),
    location: z.union([optionalTrimmedString(255), z.literal("")]).optional(),
    description: z
      .union([optionalTrimmedString(5000), z.literal("")])
      .optional(),
    imageUrl: z.union([z.string(), z.null()]).optional(),
    createdBy: z.union([positiveIntSchema, z.null()]).optional(),
    belongsToId: z.union([positiveIntSchema, z.null()]).optional(),
    isActive: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

const entityUpdateFieldsSchema = z
  .object({
    type: optionalTrimmedString(255),
    name: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
    phone: optionalTrimmedString(50),
    email: z.string().trim().pipe(z.email()).optional(),
    location: z.union([optionalTrimmedString(255), z.literal("")]).optional(),
    description: z
      .union([optionalTrimmedString(5000), z.literal("")])
      .optional(),
    imageUrl: z.union([z.string(), z.null()]).optional(),
    isActive: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

export const entityUpdateSchema = entityUpdateFieldsSchema
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field is required" },
  );

export const entityCreateMultipartSchema = z
  .object({
    fields: entityBodySchema,
    files: z
      .object({
        imageUrl: fileField(),
      })
      .strict(),
  })
  .strict();

export const entityUpdateMultipartSchema = z
  .object({
    fields: entityUpdateFieldsSchema,
    files: z.object({ imageUrl: fileField() }).strict(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.imageUrl?.length ?? 0) > 0;
  }, "At least one field is required");

export const courseUuidParamsSchema = z
  .object({
    uuid: z.string().trim().min(2).max(64),
  })
  .strict();

export const courseLessonUuidParamsSchema = z
  .object({
    lessonUuid: z.string().trim().min(2).max(64),
  })
  .strict();

export const courseIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const courseIdsParamsSchema = z
  .object({
    ids: z.string().trim().min(1),
  })
  .strict();

export const courseLessonQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
    search: optionalTrimmedString(255),
    sortField: optionalTrimmedString(255),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

export const courseLessonBodySchema = z
  .object({
    title: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
    description: optionalTrimmedString(5000),
    mediaResourceId: positiveIntSchema.optional(),
  })
  .strict();

const courseLessonMediaItemSchema = z
  .object({
    id: positiveIntSchema.optional(),
    lessonId: positiveIntSchema,
    title: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
    mediaResourceId: positiveIntSchema.optional(),
    description: optionalTrimmedString(5000),
    is_active: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

export const courseLessonMediaBodySchema = z.union([
  courseLessonMediaItemSchema,
  z.array(courseLessonMediaItemSchema).min(1),
]);

export const courseCreateBodySchema = z
  .object({
    title: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
    description: optionalTrimmedString(5000),
    category: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
    mediaResourceId: positiveIntSchema.optional(),
    lessonIds: optionalCourseIds(),
  })
  .strict();

export const courseUpdateBodySchema = courseCreateBodySchema.refine(
  (data) => {
    return Object.values(data).some((value) => value !== undefined);
  },
  { message: "At least one field is required" },
);

export const dietToolIdParamsSchema = z
  .object({
    id: positiveIntSchema,
  })
  .strict();

export const dietChartMultipartSchema = z
  .object({
    fields: z
      .object({
        creator: optionalTrimmedString(255),
        heading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        weekId: z.coerce.number().int().positive().optional(),
        category: profileCategoryField(),
        subheading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        content: requiredTrimmedString(1, 5000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict();

export const dietChartUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        creator: optionalTrimmedString(255),
        heading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        weekId: z.coerce.number().int().positive().optional(),
        category: profileCategoryField({ optional: true }),
        subheading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        content: optionalTrimmedString(5000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValueExcept(fields, ["icon"]) || (files?.icon?.length ?? 0) > 0;
  }, "At least one field is required");

export const dietNuskheMultipartSchema = z
  .object({
    fields: z
      .object({
        creator: optionalTrimmedString(255),
        category: profileCategoryField(),
        heading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        subheading: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
        content: requiredTrimmedString(1, 5000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict();

export const dietNuskheUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        creator: optionalTrimmedString(255),
        category: profileCategoryField({ optional: true }),
        heading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        subheading: optionalTrimmedString(255, startsWithLetterPattern, startsWithLetterMsg),
        content: optionalTrimmedString(5000),
        icon: optionalTrimmedString(2048),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .optional(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValueExcept(fields, ["icon"]) || (files?.icon?.length ?? 0) > 0;
  }, "At least one field is required");

export const weekBodySchema = z
  .object({
    name: requiredTrimmedString(1, 255, startsWithLetterPattern, startsWithLetterMsg),
    order: z.coerce.number(),
  })
  .strict();
