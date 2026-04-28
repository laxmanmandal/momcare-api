"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_ROOT = void 0;
const fastify_1 = __importDefault(require("fastify"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const multipart_1 = require("@fastify/multipart");
const static_1 = __importDefault(require("@fastify/static"));
const cors_1 = __importDefault(require("@fastify/cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const formbody_1 = __importDefault(require("@fastify/formbody"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuidPlugin_1 = __importDefault(require("./plugins/uuidPlugin"));
dotenv_1.default.config();
const ajv_errors_1 = __importDefault(require("ajv-errors"));
const fastify_raw_body_1 = __importDefault(require("fastify-raw-body"));
const storageService_1 = require("./services/storageService");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const entityRoute_1 = __importDefault(require("./routes/entityRoute"));
const courses_1 = __importDefault(require("./routes/courses"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const resources_1 = __importDefault(require("./routes/resources"));
const media_1 = __importDefault(require("./routes/media"));
const dailytips_1 = __importDefault(require("./routes/dailytips"));
const dietNuskhaTool_1 = __importDefault(require("./routes/dietNuskhaTool"));
const razorpay_webhook_1 = __importDefault(require("./routes/payments/razorpay.webhook"));
const community_1 = __importDefault(require("./routes/community"));
const communityPost_1 = __importDefault(require("./routes/communityPost"));
const expertPost_1 = __importDefault(require("./routes/expertPost"));
const communityComment_1 = __importDefault(require("./routes/communityComment"));
const communityReaction_1 = __importDefault(require("./routes/communityReaction"));
const expertRoute_1 = __importDefault(require("./routes/expertRoute"));
const log_route_1 = __importDefault(require("./routes/log.route"));
const SubscriptionSale_1 = __importDefault(require("./routes/SubscriptionSale"));
const coupon_1 = __importDefault(require("./routes/coupon"));
const accessControl_1 = __importDefault(require("./plugins/accessControl"));
const health_1 = __importDefault(require("./routes/health"));
const error_1 = require("./utils/error");
const universalUploadRoutes_1 = __importDefault(require("./routes/universalUploadRoutes"));
const loginLogs_1 = __importDefault(require("./routes/loginLogs"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
//error handler
const app = (0, fastify_1.default)({
    trustProxy: true,
    ajv: {
        customOptions: {
            coerceTypes: "array",
            allErrors: true,
            $data: true,
            strict: false,
            removeAdditional: true, // remove unknown fields from request
        },
        plugins: [ajv_errors_1.default],
    },
    logger: {
        level: 'warn', // ✅ Logs both warnings and errors
        transport: {
            target: 'pino/file',
            options: {
                destination: './logs/app.log',
                mkdir: true,
            },
        },
    },
    bodyLimit: 1048576
});
app.addHook('onRequest', async (req) => {
    req.rawBody = req.raw;
});
app.register(rate_limit_1.default, {
    global: false // important — prevents whole server from being limited
});
app.register(uuidPlugin_1.default);
app.register(accessControl_1.default);
/* ----------------------------- Core Plugins ----------------------------- */
app.register(formbody_1.default);
app.register(multipart_1.fastifyMultipart, {
    attachFieldsToBody: false, //
    limits: {
        fileSize: 500 * 1024 * 1024, // allow up to 100 MB
    },
});
app.register(cors_1.default, {
    origin: '*', // no need for array
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
app.register(swagger_1.default, {
    hideUntagged: true,
    swagger: {
        info: {
            title: 'LMS API',
            description: 'Learning Management System API with RBAC & Swagger',
            version: '1.0.0'
        },
        schemes: ['http', 'https'],
        produces: ['application/json'],
        securityDefinitions: {
            BearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' }
        }
    },
    transform: ({ schema, url, route }) => {
        const transformedSchema = { ...schema };
        const routeConfig = (route.config ?? {});
        if (!routeConfig.swaggerPublic && !transformedSchema.security) {
            transformedSchema.security = [{ BearerAuth: [] }];
        }
        const transformedUrl = url !== '/' && url.endsWith('/') ? url.slice(0, -1) : url;
        return { schema: transformedSchema, url: transformedUrl };
    }
});
app.register(swagger_ui_1.default, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true }
});
app.setErrorHandler(error_1.errorHandler);
/* -------------------------- File Upload Handling ------------------------- */
const UPLOAD_ROOT = path_1.default.resolve(process.cwd(), process.env.UPLOAD_DIR || './momcare-media');
exports.UPLOAD_ROOT = UPLOAD_ROOT;
if (!UPLOAD_ROOT) {
    throw new Error('UPLOAD_DIR not set in environment');
}
const isLocal = !/^https?:\/\//i.test(UPLOAD_ROOT);
if (isLocal) {
    try {
        fs_1.default.mkdirSync(UPLOAD_ROOT, { recursive: true });
        console.log('✅ Created/verified upload directory:', UPLOAD_ROOT);
    }
    catch (err) {
        console.warn('⚠️ Could not create upload directory:', err.message);
    }
    app.register(static_1.default, {
        root: UPLOAD_ROOT,
        decorateReply: false,
    });
    console.log('✅ Using local media storage at', UPLOAD_ROOT);
}
else {
    console.log('🪣 Using remote media storage:', UPLOAD_ROOT);
}
/* --------------------------------------------------------------------------
 🧩 Reusable Upload Helpers
-------------------------------------------------------------------------- */
// Parse multipart and keep files in memory
app.decorate('parseMultipartMemory', async (req) => {
    const parts = req.parts();
    const files = {};
    const fields = {};
    for await (const part of parts) {
        if (part.file) {
            const buffer = await part.toBuffer();
            if (!files[part.fieldname])
                files[part.fieldname] = [];
            files[part.fieldname].push({
                fieldname: part.fieldname,
                filename: part.filename,
                mimetype: part.mimetype,
                buffer
            });
        }
        else {
            fields[part.fieldname] = part.value;
        }
    }
    return { files, fields };
});
// Save a single uploaded file into a folder (dynamic).
app.decorate('saveFileBuffer', async function (file, folder) {
    if (!file)
        throw new Error('Invalid file object');
    const buffer = file.buffer instanceof Buffer
        ? file.buffer
        : typeof file.toBuffer === 'function'
            ? await file.toBuffer()
            : null;
    const filename = file.filename ?? file.name;
    const mimetype = file.mimetype ?? file.type;
    if (!buffer || !filename || !mimetype) {
        throw new Error('Invalid file object');
    }
    return storageService_1.storageService.uploadFile(buffer, filename, mimetype, folder);
});
// Save multiple files at once (reuses saveFileBuffer)
app.decorate('saveMultipleFiles', async function (files, folder) {
    const urls = [];
    for (const file of files) {
        const url = await this.saveFileBuffer(file, folder);
        urls.push(url);
    }
    return urls;
});
app.register(fastify_raw_body_1.default, {
    field: 'rawBody', // the raw body will be available at request.rawBody
    global: false, // don't parse raw body for all routes
    encoding: 'utf8',
    runFirst: true, // get raw body before JSON parser
    routes: ['/webhooks/razorpay'] // only apply to webhook route
});
/* ------------------------------ API Routes ------------------------------- */
app.register(auth_1.default, { prefix: '/auth' });
app.register(users_1.default, { prefix: '/users' });
app.register(entityRoute_1.default, { prefix: '/entities' });
app.register(courses_1.default, { prefix: '/courses' });
app.register(subscriptions_1.default, { prefix: '/subscriptions' });
app.register(resources_1.default, { prefix: '/resources' });
app.register(media_1.default, { prefix: '/media' });
app.register(dailytips_1.default, { prefix: '/dailytips' });
app.register(dietNuskhaTool_1.default, { prefix: '/diet-nuskha' });
app.register(community_1.default, { prefix: '/community' });
app.register(communityPost_1.default, { prefix: '/community-posts' });
app.register(expertPost_1.default, { prefix: '/expert-posts' });
app.register(communityComment_1.default, { prefix: '/post-comments' });
app.register(communityReaction_1.default, { prefix: '/post-comment-likes' });
app.register(health_1.default, { prefix: '/health' });
app.register(expertRoute_1.default, { prefix: '/experts' });
app.register(SubscriptionSale_1.default, { prefix: '/allocation' });
app.register(coupon_1.default, { prefix: '/coupons' });
app.register(log_route_1.default, { prefix: '/logs' });
app.register(universalUploadRoutes_1.default, { prefix: '/api' });
app.register(razorpay_webhook_1.default, { prefix: '/webhooks' });
app.register(loginLogs_1.default, { prefix: '/ip-logs' });
/*............................. error handler .............................. */
console.log('✅ All routes registered successfully');
/* ----------------------------- Health Check ------------------------------ */
app.get('/', async () => ({
    status: 'ok',
    message: 'Server is running 🚀',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
}));
const start = async () => {
    try {
        const port = Number(process.env.PORT || 8000);
        const host = 'localhost';
        console.log('🔧 Initializing server...');
        console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   PORT: ${port}`);
        console.log(`   HOST: ${host}`);
        console.log(`   UPLOAD_DIR: ${UPLOAD_ROOT}`);
        await app.listen({ port, host });
        console.log(`✅ Server running at http://${host}:${port}`);
        console.log(`📖 Swagger docs at http://${host}:${port}/docs`);
        console.log('🎉 Application started successfully!');
    }
    catch (err) {
        console.error('❌ Server startup error:', err);
        console.error('Error details:', err.message);
        app.log.error(err);
        process.exit(1);
    }
};
start().catch(err => {
    console.error('❌ Unhandled error in start function:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map