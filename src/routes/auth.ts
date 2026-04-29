import { FastifyInstance } from 'fastify';
import * as authService from '../services/authService';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { canCreateRole } from '../utils/roles';
import { createAndSendOtpForPhone, verifyOtpForPhone } from '../services/otpsms.service.ts/otpService';
import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';
import { loginRateLimiter, recordFailedAttempt, resetAttempts } from '../middleware/loginratelimiter';
import { normalizePhone, otpRateLimiter, recordFailedVerification, recordSendSuccess, resetOtpAttempts } from '../middleware/otpratelimiter';
import createHttpError from 'http-errors';
import { z } from 'zod';
import { parseWithZod } from '../utils/zodValidation';

type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };
const phonePattern = /^[0-9+() -]{10,20}$/;
const otpPattern = /^[0-9]{4,8}$/;


const requestOtpSchema = z.object({
  phone: z.string().trim().regex(phonePattern, 'phone must be a valid mobile number')
}).strict();

const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(phonePattern, 'phone must be a valid mobile number'),
  otp: z.string().trim().regex(otpPattern, 'otp must be 4-8 numeric digits')
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128)
}).strict();

export default async function authRoutes(app: FastifyInstance) {
  const roleEnum = Object.keys(Role).filter(k => isNaN(Number(k)));

  app.post<{ Body: { phone: string } }>('/request-otp', {
    config: {
      swaggerPublic: true,
      rateLimit: {
        max: 3,
        timeWindow: 10 * 60 * 1000
      }
    },
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['phone'],
        additionalProperties: false,
        properties: {
          phone: { type: 'string', minLength: 10, maxLength: 20, pattern: phonePattern.source }
        }
      }
    }
  }, async (req, reply) => {
    const key = otpRateLimiter(req, reply);
    if (!key) return; // blocked or invalid

    const body = parseWithZod(requestOtpSchema, req.body);
    const phone = normalizePhone(body.phone);


    await createAndSendOtpForPhone(phone);

    recordSendSuccess(key);

    return reply.send({ ok: true, message: 'OTP sent' });

  });


  app.post<{ Body: { phone: string; otp: string } }>(
    "/verify-otp",
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
        body: {
          type: 'object',
          required: ['phone', 'otp'],
          additionalProperties: false,
          properties: {
            phone: { type: 'string', minLength: 10, maxLength: 20, pattern: phonePattern.source },
            otp: { type: 'string', minLength: 4, maxLength: 8, pattern: otpPattern.source }
          }
        }
      }
    },
    async (req, reply) => {
      const key = otpRateLimiter(req, reply);
      if (!key) return;

      const { phone: rawPhone, otp } = parseWithZod(verifyOtpSchema, req.body);
      if (!rawPhone || !otp) {
        return reply.code(400).send({ success: false, error: "phone and otp required" });
      }

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
            .send({ success: false, message: result.error || "Invalid OTP" });
        }

        resetOtpAttempts(key);

        return reply.send({
          success: true,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        });
      } catch (err: any) {
        recordFailedVerification(key);
        return reply
          .code(500)
          .send({ success: false, message: "Internal Server Error" });
      }
    }
  );


  app.post(
    '/signup',
    {
      preHandler: [authMiddleware, app.accessControl.check('CREATE_USER')],
      schema: {
        tags: ['Auth'],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['role', 'phone', 'name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 120 },
            type: { type: 'string', maxLength: 50 },
            location: { type: 'string', minLength: 2, maxLength: 255 },
            email: { type: 'string', format: 'email', maxLength: 254 },
            phone: { type: 'string', minLength: 10, maxLength: 20, pattern: phonePattern.source },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            role: { type: 'string', enum: roleEnum },
            belongsToId: { type: 'integer' },
            createdBy: { type: 'integer' },
            planId: { type: ['integer', 'null'], minimum: 1 }
          }
        }
      }
    },
    async (req: any, reply) => {
      console.log(req.body);

      const actorRole = req.user?.role;
      const targetRole = req.body.role;

      // Permission check
      if (!canCreateRole(actorRole, targetRole)) {
        return reply.code(403).send({
          success: false,
          message: `Insufficient privilege to create role: ${targetRole}`
        });
      }

      // Normalize meta fields
      const payload = {
        ...req.body,
        belongsToId: req.body.belongsToId
          ? Number(req.body.belongsToId)
          : req.user?.belongsToId
            ? Number(req.user.belongsToId)
            : undefined,
        createdBy: req.user?.id ? Number(req.user.id) : undefined
      };
      console.log(payload);
      const created = await authService.signup(payload);


      return reply.code(201).send({
        success: true,
        message: 'User created successfully',
        data: created
      });


    }
  );

  // login route (keeps schema simple)

  app.post<{ Body: LoginBody }>('/login', {
    config: {
      swaggerPublic: true,
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000
      }
    },
    schema: {
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 254 },
          password: { type: 'string', minLength: 8, maxLength: 128 }
        }
      }
    }
  }, async (req, reply) => {
    const key = loginRateLimiter(req, reply);
    if (!key) return;

    const ip =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']
      )?.split(',')[0]?.trim()
      || req.ip;

    const body = parseWithZod(loginSchema, req.body);

    try {
      const { accessToken, refreshToken } =
        await authService.login(body, ip);

      resetAttempts(key);

      return reply.code(200).send({ accessToken, refreshToken });
    } catch (err: any) {
      recordFailedAttempt(key);

      return reply.status(401).send({
        success: false,
        message: err?.message || 'Invalid credentials'
      });
    }
  });



  // refresh route
  app.post<{ Body: RefreshBody }>(
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
        body: {
          type: 'object',
          required: ['refreshToken'],
          additionalProperties: false,
          properties: {
            refreshToken: { type: 'string', minLength: 1 }
          }
        }
      },

    },
    async (req, reply) => {

      const tokens = await authService.refreshTokenService(req.body.refreshToken,);
      return reply.send(tokens);
    }
  );

  app.post<any>(
    '/change-password',
    {
      schema: {
        tags: ['Auth'],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['userId', 'old_password', 'new_password'],
          properties: {
            userId: { type: 'integer', minimum: 1 },
            old_password: { type: 'string', minLength: 8, maxLength: 128 },
            new_password: { type: 'string', minLength: 8, maxLength: 128 }
          }
        }
      },
      preHandler: [authMiddleware, app.accessControl.check('CHANGE_PASSWORD')],

    },
    async (req: any, res) => {

      const authUserId = Number(req.user.id); // assuming user is authenticated
      const userId = Number(req.body.userId);
      const { old_password, new_password } = req.body;

      if (authUserId !== userId) {
        throw createHttpError(403, 'Unauthorized')
      }
      // 1. Fetch user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).send({ success: false, message: "User not found." });
      }

      // 2. Compare old password
      const isMatch = await bcrypt.compare(old_password, user.password!);
      console.log(isMatch);

      if (!isMatch) {
        return res.status(400).send({ success: false, message: "Old password is incorrect." });
      }

      // 3. Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      console.log(hashedPassword);


      // 4. Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return res.status(200).send({ success: true, message: "Password updated successfully." });

    }
  );

}
