
import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import {
    buildMultipartBodySchema,
    isZodSchema,
    normalizeJsonSchema,
    ZOD_DOCS_ONLY,
    zodToJsonSchema
} from './utils/zodOpenApi'
import { fastifyMultipart } from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import path from 'path'
import fs from 'fs'
import formbody from '@fastify/formbody'
import dotenv from 'dotenv'
import uidPlugin from './plugins/uuidPlugin'
dotenv.config()
import fastifyRawBody from 'fastify-raw-body';
import { storageService } from './services/storageService'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import entityRoutes from './routes/entityRoute'
import coursesRoutes from './routes/courses'
import subscriptionRoutes from './routes/subscriptions'
import resourcesRoute from './routes/resources'
import mediaRoute from './routes/media'
import dailytipsRoute from './routes/dailytips'
import dietNuskhaRoute from './routes/dietNuskhaTool'
import razorpayWebhook from "./routes/payments/razorpay.webhook";
import community from './routes/community'
import communityPost from './routes/communityPost'
import expertPost from './routes/expertPost'
import communityComment from './routes/communityComment'
import communityReaction from './routes/communityReaction'
import ExpertRoutes from './routes/expertRoute'
import LogRoutes from './routes/log.route'
import subscscriptionSaleRoutes from './routes/SubscriptionSale'
import CouponRoute from './routes/coupon'
import accessControl from './plugins/accessControl'
import healthRoutes from './routes/health'
import { errorHandler } from './utils/error'
import universalUploadRoutes from './routes/universalUploadRoutes'
import LoginLogsRoutes from './routes/loginLogs';

import fastifyRateLimit from '@fastify/rate-limit'

const DEFAULT_MULTIPART_FILE_LIMIT = 25 * 1024 * 1024
const multipartFileLimit = Number(process.env.MULTIPART_FILE_LIMIT_BYTES || DEFAULT_MULTIPART_FILE_LIMIT)
const maxMultipartFileSize =
    Number.isFinite(multipartFileLimit) && multipartFileLimit > 0
        ? multipartFileLimit
        : DEFAULT_MULTIPART_FILE_LIMIT

//error handler
const app = Fastify({
    trustProxy: true,
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
    bodyLimit: 1048576,
    ajv: {
        customOptions: {
            strictTypes: false
        }
    }
});

const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: false,
    strict: false,
    allErrors: true
});
addFormats(ajv);

app.setValidatorCompiler((context) => {
    if (isZodSchema(context.schema)) {
        return validatorCompiler(context as any);
    }

    if ((context.schema as any)?.[ZOD_DOCS_ONLY]) {
        return (data) => ({ value: data });
    }

    return ajv.compile(context.schema as any) as any;
});
app.setSerializerCompiler((context) => {
    if (isZodSchema(context.schema) || isZodSchema((context.schema as any)?.properties)) {
        return serializerCompiler(context as any);
    }

    return (data) => JSON.stringify(data);
});

app.register(fastifyRateLimit, {
    global: false   // important — prevents whole server from being limited
});
app.register(uidPlugin)
app.register(accessControl);
/* ----------------------------- Core Plugins ----------------------------- */
app.register(formbody)

app.register(fastifyMultipart, {
    attachFieldsToBody: false, //
    limits: {
        fileSize: maxMultipartFileSize,
        files: 4,
        parts: 20
    },
});
app.register(fastifyCors, {
    origin: '*',  // no need for array
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});



app.register(fastifySwagger, {
    hideUntagged: true,
    openapi: {
        openapi: '3.0.0',
        info: {
            title: 'LMS API',
            description: 'Learning Management System API with RBAC & Swagger',
            version: '1.0.0'
        },
        servers: [
            { url: '/', description: 'Current Environment' }
        ],
        components: {
            securitySchemes: {
                BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        }
    },
    transform: ({ schema, url, route }) => {
        const transformedSchema = { ...schema } as any
        const routeConfig = (route.config ?? {}) as { swaggerPublic?: boolean }

        for (const key of ['body', 'params', 'querystring', 'headers'] as const) {
            if (transformedSchema[key]) {
                transformedSchema[key] = normalizeJsonSchema(transformedSchema[key]);
            }
        }

        if (transformedSchema.response && typeof transformedSchema.response === 'object') {
            for (const status of Object.keys(transformedSchema.response)) {
                if (isZodSchema(transformedSchema.response[status])) {
                    transformedSchema.response[status] = normalizeJsonSchema(transformedSchema.response[status]);
                }
            }
        }

        if (!routeConfig.swaggerPublic && !transformedSchema.security) {
            transformedSchema.security = [{ BearerAuth: [] }]
        }

        // standard 400 and 500 error responses globally
        transformedSchema.response = transformedSchema.response || {}
        const standardErrorResponse = {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                error: { type: 'string' }
            }
        };

        if (!transformedSchema.response['400']) {
            transformedSchema.response['400'] = {
                description: 'Bad Request',
                ...standardErrorResponse
            };
        }

        if (!transformedSchema.response['500']) {
            transformedSchema.response['500'] = {
                description: 'Internal Server Error',
                ...standardErrorResponse
            };
        }

        // --- STEP 1: POPULATE SCHEMAS FROM ZOD (via preHandlers) ---
        try {
            const preHandlers = Array.isArray(route.preHandler) ? route.preHandler : (route.preHandler ? [route.preHandler] : []);
            for (const ph of preHandlers) {
                const zData = ph && (ph as any)._zodSchema;
                if (zData) {
                    const { source, schema: zschema } = zData;
                    const json = zodToJsonSchema(zschema, { target: 'openApi3' }) as any;
                    if (json.$schema) delete json.$schema;

                    const key = source === 'query' ? 'querystring' : source;
                    if (!transformedSchema[key]) {
                        transformedSchema[key] = json;
                    }
                }
            }
        } catch (err) {
            if (app.log) app.log.warn({ err, url }, 'Zod->Swagger transformation failed');
        }

        // --- STEP 2: ENSURE VALID BODY STRUCTURE & FLATTEN MULTIPART ---
        if (transformedSchema.body && typeof transformedSchema.body === 'object') {
            transformedSchema.body = buildMultipartBodySchema(transformedSchema.body);
        }

        // --- STEP 3: HANDLE WRITE METHODS (POST/PUT/PATCH) ---
        const rawMethod = route.method;
        const methods = Array.isArray(rawMethod) ? rawMethod : [rawMethod];
        const isWriteMethod = methods.some(m => 
            typeof m === 'string' && ['POST', 'PUT', 'PATCH'].includes(m.toUpperCase())
        );

        if (isWriteMethod) {
            if (!transformedSchema.consumes || (Array.isArray(transformedSchema.consumes) && transformedSchema.consumes.length === 0)) {
                transformedSchema.consumes = ['application/json', 'application/x-www-form-urlencoded'];
            }

            if (transformedSchema.body && !transformedSchema.requestBody && Array.isArray(transformedSchema.consumes)) {
                const content: Record<string, any> = {};
                for (const ct of transformedSchema.consumes) {
                    content[ct] = { schema: transformedSchema.body };
                }
                transformedSchema.requestBody = { content, required: true };
            }
        }

        // --- STEP 4: LEGACY FORMDATA CONVERSION ---
        try {
            const params = transformedSchema.parameters;
            if (Array.isArray(params)) {
                const formParams = params.filter((p: any) => p && p.in === 'formData');
                if (formParams.length) {
                    const props: Record<string, any> = {};
                    const required: string[] = [];
                    for (const p of formParams) {
                        const name = p.name;
                        if (p.required) required.push(name);
                        if (p.type === 'file') {
                            props[name] = { type: 'string', format: 'binary' };
                        } else if (p.type) {
                            props[name] = { type: p.type, description: p.description };
                        } else {
                            props[name] = { type: 'string', description: p.description };
                        }
                    }

                    const rb = transformedSchema.requestBody || { content: {} };
                    rb.content['multipart/form-data'] = {
                        schema: {
                            type: 'object',
                            properties: props,
                            required: required.length ? required : undefined
                        }
                    };
                    transformedSchema.requestBody = rb;

                    transformedSchema.parameters = params.filter((p: any) => !(p && p.in === 'formData'));
                    if (transformedSchema.parameters.length === 0) delete transformedSchema.parameters;
                }
            }
        } catch (err) { /* ignore */ }

        const transformedUrl =
            url !== '/' && url.endsWith('/') ? url.slice(0, -1) : url

        return { schema: transformedSchema, url: transformedUrl }
    }

})

app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { 
        docExpansion: 'list', 
        deepLinking: true,
        persistAuthorization: true
    }
})
app.setErrorHandler(errorHandler);
/* -------------------------- File Upload Handling ------------------------- */
const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './momcare-media');

if (!UPLOAD_ROOT) {
    throw new Error('UPLOAD_DIR not set in environment');
}

const isLocal = !/^https?:\/\//i.test(UPLOAD_ROOT);

if (isLocal) {
    try {
        fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
        console.log('✅ Created/verified upload directory:', UPLOAD_ROOT);
    } catch (err: any) {
        console.warn('⚠️ Could not create upload directory:', err.message);
    }

    app.register(fastifyStatic, {
        root: UPLOAD_ROOT,
        decorateReply: false,
    });

    console.log('✅ Using local media storage at', UPLOAD_ROOT);
} else {
    console.log('🪣 Using remote media storage:', UPLOAD_ROOT);
}
export { UPLOAD_ROOT };
/* --------------------------------------------------------------------------
 🧩 Reusable Upload Helpers
-------------------------------------------------------------------------- */

// Parse multipart and keep files in memory
app.decorate('parseMultipartMemory', async (req) => {
    if (typeof req.isMultipart === 'function' && !req.isMultipart()) {
        return {
            files: {} as Record<string, any[]>,
            fields: { ...((req.body as Record<string, any>) ?? {}) }
        };
    }

    const parts = req.parts()
    const files: Record<string, any[]> = {}
    const fields: Record<string, any> = {}

    for await (const part of parts) {
        if (part.file) {
            const buffer = await part.toBuffer()
            if (!files[part.fieldname]) files[part.fieldname] = []
            files[part.fieldname].push({
                fieldname: part.fieldname,
                filename: part.filename,
                mimetype: part.mimetype,
                buffer
            })
        } else {
            fields[part.fieldname] = part.value
        }
    }

    return { files, fields }
})


// Save a single uploaded file into a folder (dynamic).
app.decorate('saveFileBuffer', async function (file: any, folder: string) {
    if (!file) throw new Error('Invalid file object');

    const buffer =
        file.buffer instanceof Buffer
            ? file.buffer
            : typeof file.toBuffer === 'function'
                ? await file.toBuffer()
                : null;

    const filename = file.filename ?? file.name;
    const mimetype = file.mimetype ?? file.type;

    if (!buffer || !filename || !mimetype) {
        throw new Error('Invalid file object');
    }

    return storageService.uploadFile(buffer, filename, mimetype, folder);
});



// Save multiple files at once (reuses saveFileBuffer)
app.decorate('saveMultipleFiles', async function (files: any[], folder: string) {
    const urls: string[] = []
    for (const file of files) {
        const url = await this.saveFileBuffer(file, folder)
        urls.push(url)
    }
    return urls
})
app.register(fastifyRawBody, {
    field: 'rawBody', // the raw body will be available at request.rawBody
    global: false, // don't parse raw body for all routes
    encoding: 'utf8',
    runFirst: true, // get raw body before JSON parser
    routes: ['/webhooks/razorpay'] // only apply to webhook route
});
/* ------------------------------ API Routes ------------------------------- */
app.register(authRoutes, { prefix: '/auth' })
app.register(userRoutes, { prefix: '/users' })
app.register(entityRoutes, { prefix: '/entities' })
app.register(coursesRoutes, { prefix: '/courses' })
app.register(subscriptionRoutes, { prefix: '/subscriptions' })
app.register(resourcesRoute, { prefix: '/resources' })
app.register(mediaRoute, { prefix: '/media' })
app.register(dailytipsRoute, { prefix: '/dailytips' })
app.register(dietNuskhaRoute, { prefix: '/diet-nuskha' })
app.register(community, { prefix: '/community' })
app.register(communityPost, { prefix: '/community-posts' })
app.register(expertPost, { prefix: '/expert-posts' })
app.register(communityComment, { prefix: '/post-comments' })
app.register(communityReaction, { prefix: '/post-comment-likes' })
app.register(healthRoutes, { prefix: '/health' })
app.register(ExpertRoutes, { prefix: '/experts' })
app.register(subscscriptionSaleRoutes, { prefix: '/allocation' })
app.register(CouponRoute, { prefix: '/coupons' })
app.register(LogRoutes, { prefix: '/logs' })
app.register(universalUploadRoutes, { prefix: '/api' })
app.register(razorpayWebhook, { prefix: '/webhooks' });
app.register(LoginLogsRoutes, { prefix: '/ip-logs' });
/*............................. error handler .............................. */

console.log('✅ All routes registered successfully');

/* ----------------------------- Health Check ------------------------------ */
app.get('/', async () => ({
    status: 'ok',
    message: 'Server is running 🚀',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
}))
const start = async () => {
    try {
        const port = Number(process.env.PORT || 8080);
        const host = '0.0.0.0';
        
        console.log('🔧 Initializing server...');
        console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   PORT: ${port}`);
        console.log(`   HOST: ${host}`);
        console.log(`   UPLOAD_DIR: ${UPLOAD_ROOT}`);
        
        await app.listen({ port, host })
        console.log(`✅ Server running at http://${host}:${port}`)
        console.log(`📖 Swagger docs at http://${host}:${port}/docs`)
        console.log('🎉 Application started successfully!')
    } catch (err: any) {
        console.error('❌ Server startup error:', err);
        console.error('Error details:', err.message);
        app.log.error(err)
        process.exit(1)
    }
}

start().catch(err => {
    console.error('❌ Unhandled error in start function:', err);
    process.exit(1);
})

export default app
