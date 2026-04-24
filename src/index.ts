
import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { fastifyMultipart } from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import path from 'path'
import fs from 'fs'
import formbody from '@fastify/formbody'
import dotenv from 'dotenv'
import uidPlugin from './plugins/uuidPlugin'
dotenv.config()
import ajvErrors from 'ajv-errors';
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

//error handler
const app = Fastify({
    trustProxy: true,
    ajv: {
        customOptions: {
            coerceTypes: "array",
            allErrors: true,
            $data: true,
            strict: false,
            removeAdditional: true, // remove unknown fields from request
        },
        plugins: [ajvErrors],

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
    (req as any).rawBody = req.raw;
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
        fileSize: 500 * 1024 * 1024, // allow up to 100 MB
    },
});
app.register(fastifyCors, {
    origin: '*',  // no need for array
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});



app.register(fastifySwagger, {
    swagger: {
        info: {
            title: 'LMS API',
            description: 'Learning Management System API with RBAC & Swagger',
            version: '1.0.0'
        },
        schemes: ['http'],
        consumes: ['application/json', 'multipart/form-data'],
        produces: ['application/json'],
        securityDefinitions: {
            BearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' }
        }
    }
})

app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true }
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


// Save a single file buffer into a folder (dynamic)
app.decorate('saveFileBuffer', async function (file: any, folder: string) {
    if (!file || !file.buffer) throw new Error('Invalid file object');
    return storageService.uploadFile(file.buffer, file.filename, file.mimetype, folder);
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
        const port = Number(process.env.PORT || 3000);
        const host = process.env.HOST || '0.0.0.0';
        
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
