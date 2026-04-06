// utils/roleMiddleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import createHttpError from 'http-errors';

type AllowedRole = string | number;

// Factory that returns a Fastify preHandler
export function ensureRoles(allowedRoles: AllowedRole[]) {
    // normalize allowed for faster checks
    const normAllowed = new Set(
        allowedRoles.map(r => (typeof r === 'string' ? String(r).toUpperCase() : r))
    );

    return async function (req: FastifyRequest, reply: FastifyReply) {
        const user = (req as any).user; // your authMiddleware should set req.user

        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const roleRaw = (user.role ?? '').toString();
        const roleNorm = typeof user.role === 'string' ? roleRaw.toUpperCase() : Number(user.role);

        // if numeric role, compare to numeric allowed set; if string, compare string set
        const allowed =
            (typeof roleNorm === 'number' && normAllowed.has(roleNorm)) ||
            (typeof roleNorm === 'string' && normAllowed.has(roleNorm));

        if (!allowed) {
            throw createHttpError(403, 'You are not Authorized!');
        }

        // allowed -> continue
        return;
    };
}
