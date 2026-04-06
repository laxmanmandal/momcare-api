import { Role } from '@prisma/client';
import { generateOTP } from './otpUtils';
import { generateCustomId } from '../../utils/roles';
import { signToken, signRefreshToken } from '../../utils/jwt';
import prisma from '../../prisma/client';
import { BadRequest } from 'http-errors';
import { recordLastLogin } from '../loginActivity';
import { randomUUID } from 'crypto';
function normalizePhone(phone: string) {
  phone = phone.replace(/^\+/, "").replace(/\s+/g, "");

  if (phone.startsWith("91") && phone.length === 12) {
    return phone.slice(2); // store last 10 digits
  }

  if (phone.length === 10) {
    return phone;
  }

  throw new BadRequest("Invalid Indian phone number");
}

export async function createAndSendOtpForPhone(phone: string) {
  const uuid = await generateCustomId('USER');
  const otp = generateOTP(4);
  const otpHash = otp;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  phone = normalizePhone(phone);

  const user = await prisma.user.upsert({
    where: { phone },
    update: { otpHash, otpExpires: expiresAt },
    create: { role: Role.USER, uuid, phone, otpHash, otpExpires: expiresAt }
    //
  });
}

export async function verifyOtpForPhone(
  phone: string,
  otp: string,
  ip: string
) {
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user || user.role !== Role.USER) {
    return { success: false, code: 400, error: "Unauthorised,Access denied" };
  }

  if (!user.otpHash || !user.otpExpires) {
    return { success: false, code: 400, error: "OTP not requested" };
  }

  if (new Date() > new Date(user.otpExpires)) {
    return { success: false, code: 400, error: "OTP expired" };
  }

  if (otp !== process.env.OTP && otp !== user.otpHash) {
    return { success: false, code: 401, error: "Invalid OTP" };
  }

  // ✅ clear OTP fields
  await prisma.user.update({
    where: { phone },
    data: {
      isPhoneVerified: true,
      otpHash: null,
      otpExpires: null,
      isActive: true,
    },
  });
  const sessionId = randomUUID();

  // 🔐 SAME payload as normal login
  const payload = {
    id: user.id,
    uuid: user.uuid,
    sid: sessionId,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
    belongsToId: user.belongsToId ?? 1,
    createdBy: user.createdBy ?? null,
  };

  const accessToken = signToken(payload, "7d");
  const refreshToken = signRefreshToken(payload, "30d");

  // 🔥 SINGLE SESSION (overwrite if exists)
  const login = await prisma.userSessions.upsert({
    where: { userId: user.id },
    update: {
      sessionId,
      accessToken,
      refreshToken,
    },
    create: {
      userId: user.id,
      sessionId,
      accessToken,
      refreshToken,
    },
  });
  if (login) {
    recordLastLogin({
      userId: user.id,
      uuid: user.uuid,
      ip: ip// IP can be passed from request context if needed
    });
  }
  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
    },
  };
}

