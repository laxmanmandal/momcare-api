import 'fastify'
import { Role } from '@prisma/client'
import { FastifyRequest } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        db: DatabaseClient;
    }
    export interface FastifyRequest {
        user?: {
            id: number;
            uuid: string;
            email: string;
            name: string;
            role: Role;
            belongsToId?: number | null;
            createdBy?: number | null;
            refreshToken?: string;
            token?: string
        };
    }
    interface DatabaseClient {
        Concieve: {
            createMany: (params: { data: any[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
            findMany: (params: any) => Promise<any[]>;
            count: (params: any) => Promise<number>;
            // Add other tables as needed
            User?: any;
            EntityTable?: any;
        };
        [key: string]: any; // Allow dynamic table access
    }
    export interface JwtPayloadCustom {
        id: number;
        uuid: string;
        role: Role;
        name: string;
        email: string;
        belongsToId?: number | null;
        createdBy?: number | null;
        refreshToken?: string
    }

    interface FastifyInstance {
        parseMultipartMemory(req: any): Promise<{
            files: Record<
                string,
                {
                    fieldname: string
                    filename: string
                    mimetype: string
                    buffer: Buffer
                }[]
            >
            fields: Record<string, any>
        }>

        saveFileBuffer(
            file: {
                fieldname: string
                filename: string
                mimetype: string
                buffer: Buffer
            },
            folder: string
        ): Promise<string>

        saveMultipleFiles(
            files: {
                fieldname: string
                filename: string
                mimetype: string
                buffer: Buffer
            }[],
            folder: string
        ): Promise<string[]>
    }
    export enum Role {
        SUPER_ADMIN = 'SUPER_ADMIN',
        ADMIN = 'ADMIN',
        CHANNEL_SUPER_ADMIN = 'CHANNEL_SUPER_ADMIN',
        CHANNEL_ADMIN = 'CHANNEL_ADMIN',
        PARTNER_SUPER_ADMIN = 'PARTNER_SUPER_ADMIN',
        PARTNER_ADMIN = 'PARTNER_ADMIN',
        USER = 'USER',
    }

    export enum EntityTypes {
        Channel = 'Channel',
        Partner = 'Partner',
        Organization = 'Organization',
    }

    export interface CurrentUser {
        id: number;
        role: Role;
        belongsToId?: number;     // the entity the user belongs to (channel/partner/org)
        entityType?: EntityTypes;
        email?: string;
    }
}



