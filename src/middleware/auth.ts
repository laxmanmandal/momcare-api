import { FastifyReply, FastifyRequest } from 'fastify'
import { verifyToken } from '../utils/jwt'
import { ensureRoles } from './role.middlewar';
import prisma from '../prisma/client';
import createHttpError from 'http-errors';



export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({
        code: 'NO_TOKEN',
        message: 'No token provided',
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    /* 1️⃣ Verify access token */
    let payload: any;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return reply.code(401).send({
          code: 'SESSION_EXPIRED',
          message: 'Session expired',
        });
      }

      return reply.code(401).send({
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    }

    if (!payload || payload.type !== 'access' || !payload.id || !payload.sid) {
      return reply.code(401).send({
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    }

    /* 2️⃣ Load session by user */
    const session = await prisma.userSessions.findUnique({
      where: { userId: payload.id },
    });

    if (!session) {
      return reply.code(401).send({
        code: 'SESSION_EXPIRED',
        message: 'Session expired',
      });
    }

    /* 🔥 3️⃣ Detect remote login */
    if (payload.sid !== session.sessionId) {
      return reply.code(409).send({
        code: 'REMOTE_LOGIN',
        message: 'Logged in from another device',
      });
    }

    /* 4️⃣ Attach user */
    (req as any).user = {
      id: payload.id,
      uuid: payload.uuid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      createdBy: payload.createdBy,
      belongsToId: payload.belongsToId,
      sessionId: payload.sid,
    };

  } catch (err) {
    req.log.error(err, 'Auth middleware failed');
    return reply.code(401).send({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  }
}




export const onlyOrg = ensureRoles(['SUPER_ADMIN']);