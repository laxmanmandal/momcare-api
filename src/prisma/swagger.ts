import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export async function setupSwagger(app: FastifyInstance) {
    app.register(fastifySwagger, {
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
