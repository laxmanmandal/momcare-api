import { PostType } from "@prisma/client";
import { z } from "zod";

const httpUrlPattern = /^https?:\/\/[^\s]+$/i;
const localAssetPattern = /^\/[A-Za-z0-9/_-]+(?:\.[A-Za-z0-9]+)?$/;
const codePattern = /^[A-Za-z0-9_-]+$/;

export const multipartFileSchema = z.object({
  fieldname: z.string(),
  filename: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
});

export const positiveIntSchema = z.coerce.number().int().positive();

function optionalTrimmedString(maxLength?: number) {
  let schema = z.string().trim();

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  return z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());
}

function requiredTrimmedString(minLength = 1, maxLength?: number) {
  let schema = z.string().trim().min(minLength);

  if (maxLength !== undefined) {
    schema = schema.max(maxLength);
  }

  return schema;
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
        name: requiredTrimmedString(2, 120),
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
        name: optionalTrimmedString(120),
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

const communityPostTypeSchema = z.nativeEnum(PostType);

export const communityPostCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: requiredTrimmedString(2, 160),
        content: requiredTrimmedString(2, 10000),
        communityId: positiveIntSchema,
        userId: positiveIntSchema.optional(),
        mediaType: optionalTrimmedString(50),
        type: communityPostTypeSchema.optional(),
      })
      .strict(),
    files: communityPostFileSchema,
  })
  .strict();

export const communityPostUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(160),
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
        title: requiredTrimmedString(2, 160),
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
        code: z.ZodIssueCode.custom,
        path: ["fields", "url"],
        message: "url is required",
      });
    }
  });

export const mediaUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(160),
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
        code: z.ZodIssueCode.custom,
        path: ["fields", "percent"],
        message: "Either percent or fixed_amount is required",
      });
    }

    if (percent != null && fixed_amount != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields", "fixed_amount"],
        message: "Percent and fixed_amount cannot both be provided",
      });
    }

    if (effective_at > expires_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
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
        title: requiredTrimmedString(1, 255),
        heading: requiredTrimmedString(1, 255),
        subheading: requiredTrimmedString(1, 255),
        content: requiredTrimmedString(1, 5000),
        category: requiredTrimmedString(1, 255),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .strict(),
  })
  .strict();

export const dailyTipUpdateMultipartSchema = z
  .object({
    fields: z
      .object({
        title: optionalTrimmedString(255),
        heading: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000),
        category: optionalTrimmedString(255),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .strict(),
  })
  .strict()
  .refine(({ fields, files }) => {
    return hasMeaningfulValue(fields) || (files.icon?.length ?? 0) > 0;
  }, "At least one field is required");

export const conceiveCreateMultipartSchema = z
  .object({
    fields: z
      .object({
        week: z.coerce.number().int().positive(),
        title: requiredTrimmedString(1, 255),
        subtitle: optionalTrimmedString(255),
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
        title: optionalTrimmedString(255),
        subtitle: optionalTrimmedString(255),
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
        title: requiredTrimmedString(1, 255),
        content: requiredTrimmedString(1, 10000),
        expert_id: positiveIntSchema,
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
        title: optionalTrimmedString(255),
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
    name: requiredTrimmedString(1, 255),
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
        name: requiredTrimmedString(1, 255),
        price: z.coerce.number().nonnegative(),
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
    name: optionalTrimmedString(255),
    price: z.coerce.number().nonnegative().optional(),
    courseIds: optionalCourseIds(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.price !== undefined ||
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
    name: requiredTrimmedString(1, 255),
    phone: optionalTrimmedString(50),
    email: z.string().trim().email(),
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

export const entityUpdateSchema = z
  .object({
    type: optionalTrimmedString(255),
    name: optionalTrimmedString(255),
    phone: optionalTrimmedString(50),
    email: z.string().trim().email().optional(),
    location: z.union([optionalTrimmedString(255), z.literal("")]).optional(),
    description: z
      .union([optionalTrimmedString(5000), z.literal("")])
      .optional(),
    imageUrl: z.union([z.string(), z.null()]).optional(),
    isActive: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict()
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field is required" },
  );

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
    title: optionalTrimmedString(255),
    description: optionalTrimmedString(5000),
    mediaResourceId: positiveIntSchema.optional(),
  })
  .strict();

export const courseLessonMediaBodySchema = z
  .object({
    lessonId: positiveIntSchema.optional(),
    title: optionalTrimmedString(255),
    mediaResourceId: positiveIntSchema.optional(),
    description: optionalTrimmedString(5000),
    is_active: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

export const courseCreateBodySchema = z
  .object({
    title: optionalTrimmedString(255),
    description: optionalTrimmedString(5000),
    category: optionalTrimmedString(255),
    mediaResourceId: positiveIntSchema.optional(),
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
        heading: optionalTrimmedString(255),
        weekId: z.coerce.number().int().positive().optional(),
        category: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000),
        toolType: optionalTrimmedString(255),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .strict(),
  })
  .strict();

export const dietNuskheMultipartSchema = z
  .object({
    fields: z
      .object({
        creator: optionalTrimmedString(255),
        category: optionalTrimmedString(255),
        heading: optionalTrimmedString(255),
        subheading: optionalTrimmedString(255),
        content: optionalTrimmedString(5000),
      })
      .strict(),
    files: z
      .object({
        icon: fileField(),
      })
      .strict(),
  })
  .strict();

export const weekBodySchema = z
  .object({
    name: requiredTrimmedString(1, 255),
    order: z.coerce.number(),
  })
  .strict();
