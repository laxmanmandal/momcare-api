import prisma from '../prisma/client';
import { signRefreshToken, signToken, verifyToken } from '../utils/jwt';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { resolveRoleName } from '../utils/roles';
import createHttpError, { BadRequest, Unauthorized } from 'http-errors';
import { recordLastLogin } from './loginActivity';
import { randomUUID } from 'crypto';
function generateCustomId(role: Role | string): string {
  const prefixes: Record<Role | string, string> = {
    SUPER_ADMIN: "SA",
    ADMIN: "AD",
    CHANNEL_SUPER_ADMIN: "CH",
    CHANNEL_ADMIN: "CA",
    PARTNER_SUPER_ADMIN: "PS",
    PARTNER_ADMIN: "PA",
    USER: "U",
  };

  const key = typeof role === 'string' ? role : String(role);
  const prefix = prefixes[key as keyof typeof prefixes];

  if (!prefix) throw new Error(`Unknown role: ${role}`);

  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${randomNumber}`;
}


// user registration 
export async function signup(data: any) {

  /* ─────────────── 1️⃣ Resolve & validate role ─────────────── */
  const rawRole = data?.role;
  if (!rawRole) throw new BadRequest('Role is required');

  const canonicalRole = resolveRoleName(rawRole);
  const roleForDb = canonicalRole as Role;

  /* ─────────────── 2️⃣ Required fields ─────────────── */
  if (!data?.name) {
    throw new BadRequest('Name is required');
  }

  // 🔥 ONLY USER gets email exception
  if (roleForDb !== 'USER') {
    if (!data?.email) {
      throw new BadRequest('Email is required');
    }
    if (!data?.password) {
      throw new BadRequest('Password is required');
    }
  }

  /* ─────────────── 3️⃣ Normalize numbers ─────────────── */
  const toNumber = (v: any): number | undefined =>
    v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v);

  const belongsToId = toNumber(data.belongsToId);
  const createdBy = toNumber(data.createdBy);

  /* ─────────────── 4️⃣ Prepare auth fields ─────────────── */
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : undefined;
  const phone = typeof data.phone === 'string' ? data.phone.trim() : data.phone;
  const name = typeof data.name === 'string' ? data.name.trim() : data.name;
  const location = typeof data.location === 'string' ? data.location.trim() : data.location;
  const type = typeof data.type === 'string' ? data.type.trim() : data.type;
  const hashedPassword =
    data.password ? await bcrypt.hash(String(data.password), 10) : undefined;

  const uuid = await generateCustomId(roleForDb);

  /* ─────────────── 5️⃣ DB transaction ─────────────── */
  const user = await prisma.$transaction(async (tx) => {

    const createdUser = await tx.user.create({
      data: {
        name,
        email: email ?? null,
        password: roleForDb !== 'USER' ? hashedPassword : null,
        phone,
        type: type ?? undefined,
        location: location ?? undefined,
        role: roleForDb,
        uuid,
        createdBy,
        belongsToId
      }
    });
    return createdUser;
  });

  /* ─────────────── 6️⃣ Safe response ─────────────── */
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}



export async function login(data: any, ip: string) {

  if (!data.email || !data.password) {
    throw new Unauthorized("Unauthorized");
  }

  const email = String(data.email).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      uuid: true,
      name: true,
      password: true,
      role: true,
      belongsToId: true,
      createdBy: true,
    },
  });

  if (!user || !user.password) {
    throw new Unauthorized("Invalid credentials");
  }

  if (user.role === Role.USER) {
    throw new Unauthorized("Access denied");
  }

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new Unauthorized("Invalid credentials");
  }

  const sessionId = randomUUID();

  const accessPayload = {
    id: user.id,
    uuid: user.uuid,
    name: user.name ?? "",
    role: user.role,
    belongsToId: user.belongsToId,
    createdBy: user.createdBy,
    sid: sessionId,
  };

  const refreshPayload = {
    id: user.id,
    sid: sessionId,
  };

  const accessToken = signToken(accessPayload, "7d");
  const refreshToken = signRefreshToken(refreshPayload, "30d");

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
      ip,
    });
  }

  return { accessToken, refreshToken };
}

export async function refreshTokenService(refreshToken: string) {

  if (!refreshToken) {
    const err = createHttpError(401, 'Session expired');
    (err as any).code = 'SESSION_EXPIRED';
    throw err;
  }

  /* 1️⃣ Verify refresh token */
  let decoded: any;
  try {
    decoded = verifyToken(refreshToken);

  } catch {
    const err = createHttpError(401, 'Session expired');
    (err as any).code = 'SESSION_EXPIRED';
    throw err;
  }

  if (decoded.type !== 'refresh' || !decoded.id || !decoded.sid) {
    const err = createHttpError(401, 'Session expired');
    (err as any).code = 'SESSION_EXPIRED';
    throw err;
  }
  /* 2️⃣ Find session by USER (not refresh token) */
  const session = await prisma.userSessions.findUnique({
    where: { userId: decoded.id },
    include: { User: true },
  });

  if (!session) {
    const err = createHttpError(401, 'Session expired');
    (err as any).code = 'SESSION_EXPIRED';
    throw err;
  }

  /* 3️⃣ Detect remote login */
  if (decoded.sid !== session.sessionId) {
    const err = createHttpError(409, 'Logged in from another device');
    (err as any).code = 'REMOTE_LOGIN';
    throw err;
  }

  /* 4️⃣ Create new tokens */
  const payload = {
    id: session.User.id,
    uuid: session.User.uuid,
    sid: session.sessionId,
    role: session.User.role,
    name: session.User.name,
    belongsToId: session.User.belongsToId,
    createdBy: session.User.createdBy,
  };

  const newAccessToken = signToken(payload, '7d');
  const newRefreshToken = signRefreshToken(payload, '30d');

  /* 5️⃣ Rotate tokens */
  await prisma.userSessions.update({
    where: { userId: session.userId },
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}







export async function getUserFromPayload(uuid: string) {
  const user = await prisma.user.findUnique({
    where: { uuid },
    select: {
      uuid: true,
      name: true,
      email: true,
      role: true,
      belongsToId: true,
      createdBy: true,
      imageUrl: true,
      isActive: true,
    }
  });

  if (!user) throw new BadRequest('User not found');
  return user;
}


