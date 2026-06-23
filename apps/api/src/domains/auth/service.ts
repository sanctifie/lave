import jwt from 'jsonwebtoken';
import { redis } from '../../infrastructure/redis/client';
import { HTTP } from '../../lib/errors';
import { AuthRepository } from './repository';

const OTP_TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);
const MAX_ATTEMPTS = 3;

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async requestOtp(phone: string): Promise<{ expiresIn: number }> {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    await redis.set(`otp:${phone}`, `${code}:0`, { EX: OTP_TTL });

    // En dev, on logue l'OTP. En prod, NotificationService prend le relais (étape 4)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[OTP DEV] ${phone} → ${code}`);
    }

    return { expiresIn: OTP_TTL };
  }

  async verifyOtp(phone: string, code: string) {
    const stored = await redis.get(`otp:${phone}`);
    if (!stored) throw HTTP.unauthorized('Code OTP expiré ou inexistant');

    const [storedCode, attemptsStr] = stored.split(':');
    const attempts = Number(attemptsStr);

    if (attempts >= MAX_ATTEMPTS) {
      await redis.del(`otp:${phone}`);
      throw HTTP.unauthorized('Trop de tentatives — demandez un nouveau code');
    }

    if (storedCode !== code) {
      await redis.set(`otp:${phone}`, `${storedCode}:${attempts + 1}`, { KEEPTTL: true });
      throw HTTP.unauthorized(`Code incorrect — ${MAX_ATTEMPTS - attempts - 1} essai(s) restant(s)`);
    }

    await redis.del(`otp:${phone}`);

    const user = await this.repo.findOrCreateUser(phone);
    if (!user.isActive) throw HTTP.forbidden('Compte désactivé');

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as string },
    );

    return { token, user: { id: user.id, phone: user.phone, role: user.role, name: user.name } };
  }
}
