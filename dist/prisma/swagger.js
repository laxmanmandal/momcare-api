"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_1 = __importDefault(require("@fastify/swagger"));
async function setupSwagger(app) {
    app.register(swagger_1.default, {
        swagger: {
            info: {
                title: 'LMS API',
                description: 'Learning Management System API with RBAC & Swagger',
                version: '1.0.0',
            },
            host: 'localhost:3000', // change to your domain in production
            schemes: ['http'], // or ['https'] if you serve securely
            consumes: ['application/json', 'multipart/form-data'],
            produces: ['application/json'],
            // ✅ define JWT security (Swagger 2.0 style)
            securityDefinitions: {
                BearerAuth: {
                    type: 'apiKey',
                    name: 'Authorization', // header name
                    in: 'header',
                    description: 'Enter your JWT token as: **Bearer <token>**',
                },
            },
            // ✅ apply security globally (optional)
            security: [
                {
                    BearerAuth: [],
                },
            ],
        },
    });
    //   app.register(fastifySwaggerUi, {
    //     routePrefix: '/docs',
    //     exposeRoute: true,
    //     uiConfig: {
    //       docExpansion: 'list',
    //       deepLinking: true,
    //     },
    //   });
}
//# sourceMappingURL=swagger.js.map