import { FastifyInstance } from 'fastify';
import * as authService from '../services/authService';
import { authMiddleware } from '../middleware/auth';
import { canCreateRole } from '../utils/roles';
import { createAndSendOtpForPhone, verifyOtpForPhone } from '../services/otpsms.service.ts/otpService';
import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';
import { loginRateLimiter, recordFailedAttempt, resetAttempts } from '../middleware/loginratelimiter';
import { normalizePhone, otpRateLimiter, recordFailedVerification, recordSendSuccess, resetOtpAttempts } from '../middleware/otpratelimiter';
import createHttpError from 'http-errors';
import {
  requestOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  signupSchema,
  type RequestOtpBody,
  type VerifyOtpBody,
  type LoginBody,
  type RefreshTokenBody,
  type ChangePasswordBody,
  type SignupBody
} from '../validations';

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    '/request-otp',
    {
      config: {
        swaggerPublic: true,
        rateLimit: {
          max: 3,
          timeWindow: 10 * 60 * 1000
        }
      },
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: requestOtpSchema
      }
    },
    async (req, reply) => {
      const body = req.body as RequestOtpBody;
      const key = otpRateLimiter(body.phone, req, reply);
      if (!key) return;

      const phone = normalizePhone(body.phone);

      await createAndSendOtpForPhone(phone);
      recordSendSuccess(key);

      return reply.send({ ok: true, message: 'OTP sent' });
    }
  );

  app.post(
    '/verify-otp',
    {
      config: {
        swaggerPublic: true,
        rateLimit: {
          max: 5,
          timeWindow: 10 * 60 * 1000
        }
      },
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: verifyOtpSchema
      }
    },
    async (req, reply) => {
      const { phone: rawPhone, otp } = req.body as VerifyOtpBody;
      const key = otpRateLimiter(rawPhone, req, reply);
      if (!key) return;

      const phone = normalizePhone(rawPhone);
      const ip =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']
        )?.split(',')[0]?.trim()
        || req.ip;

      try {
        const result = await verifyOtpForPhone(phone, otp, ip);

        if (!result.success) {
          recordFailedVerification(key);
          return reply
            .code(result.code || 400)
            .send({ success: false, message: result.error || 'Invalid OTP' });
        }

        resetOtpAttempts(key);

        return reply.send({
          success: true,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user
        });
      } catch (err: any) {
        recordFailedVerification(key);
        return reply
          .code(500)
          .send({ success: false, message: 'Internal Server Error' });
      }
    }
  );

  app.post(
    '/signup',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('CREATE_USER')
      ],
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: signupSchema
      }
    },
    async (req: any, reply) => {
      const actorRole = req.user?.role;
      const body = req.body as SignupBody;
      const targetRole = body.role;

      if (!canCreateRole(actorRole, targetRole)) {
        return reply.code(403).send({
          success: false,
          message: `Insufficient privilege to create role: ${targetRole}`
        });
      }

      const payload = {
        ...body,
        belongsToId: body.belongsToId
          ? Number(body.belongsToId)
          : req.user?.belongsToId
            ? Number(req.user.belongsToId)
            : undefined,
        createdBy: req.user?.id ? Number(req.user.id) : undefined
      };

      const created = await authService.signup(payload);

      return reply.code(201).send({
        success: true,
        message: 'User created successfully',
        data: created
      });
    }
  );

  app.post(
    '/login',
    {
      config: {
        swaggerPublic: true,
        rateLimit: {
          max: 5,
          timeWindow: 15 * 60 * 1000
        }
      },
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: loginSchema
      }
    },
    async (req, reply) => {
      const ip =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']
        )?.split(',')[0]?.trim()
        || req.ip;

      const body = req.body as LoginBody;
      const key = loginRateLimiter(body.email, ip, reply);
      if (!key) return;

      try {
        const { accessToken, refreshToken } = await authService.login(body, ip);

        resetAttempts(key);

        return reply.code(200).send({ accessToken, refreshToken });
      } catch (err: any) {
        recordFailedAttempt(key);

        return reply.status(401).send({
          success: false,
          message: err?.message || 'Invalid credentials'
        });
      }
    }
  );

  app.post(
    '/refresh',
    {
      config: {
        swaggerPublic: true,
        rateLimit: {
          max: 10,
          timeWindow: 15 * 60 * 1000
        }
      },
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: refreshTokenSchema
      }
    },
    async (req, reply) => {
      const { refreshToken } = req.body as RefreshTokenBody;
      const tokens = await authService.refreshTokenService(refreshToken);
      return reply.send(tokens);
    }
  );

  app.post(
    '/change-password',
    {
      preHandler: [
        authMiddleware,
        app.accessControl.check('CHANGE_PASSWORD')
      ],
      schema: {
        tags: ['Auth'],
        consumes: ['application/json', 'application/x-www-form-urlencoded'],
        body: changePasswordSchema
      }
    },
    async (req: any, res) => {
      const authUserId = Number(req.user.id);
      const { userId, old_password, new_password } = req.body as ChangePasswordBody;

      if (authUserId !== userId) {
        throw createHttpError(403, 'Unauthorized');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).send({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(old_password, user.password!);

      if (!isMatch) {
        return res.status(400).send({ success: false, message: 'Old password is incorrect.' });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      return res.status(200).send({ success: true, message: 'Password updated successfully.' });
    }
  );
}
