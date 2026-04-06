import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/* ===================== ACCESS TOKEN ===================== */
export function signToken(
  payload: {
    id: number;
    name: string | null;
    createdBy: number | null;
    belongsToId: number | null;
    sid: string;            // ✅ NOT nullable
    uuid: string;
    role: string;
  },
  expiresIn = "7d"
) {
  return jwt.sign(
    {
      id: payload.id,
      createdBy: payload.createdBy,
      belongsToId: payload.belongsToId,
      sid: payload.sid,
      name: payload.name,
      uuid: payload.uuid,
      role: payload.role,
      type: "access",
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/* ===================== REFRESH TOKEN ===================== */
export function signRefreshToken(
  payload: {
    id: number;
    sid: string;            // ✅ NOT nullable
  },
  expiresIn = "30d"
) {
  return jwt.sign(
    {
      id: payload.id,
      sid: payload.sid,
      type: "refresh",
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/* ===================== VERIFY ===================== */
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    id: number;
    sid: string;
    type: "access" | "refresh";
    role?: string;
    uuid?: string;
    name?: string | null;
    createdBy?: number | null;
    belongsToId?: number | null;
    iat: number;
    exp: number;
  };
}
