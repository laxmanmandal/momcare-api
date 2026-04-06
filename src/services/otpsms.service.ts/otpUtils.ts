import bcrypt from 'bcryptjs';

export function generateOTP(len = 6): string {
  let otp = '';
  for (let i = 0; i < len; i++) otp += Math.floor(Math.random() * 10);
  return otp;
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
