import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { redis } from '../../infrastructure/redis/client';
import { HTTP } from '../../lib/errors';
import { AuthRepository } from './repository';
import { NotificationService } from '../../infrastructure/providers/notification';

const OTP_TTL = Number(process.env.OTP_TTL_SECONDS ?? 300);
const MAX_ATTEMPTS = 3;

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    // Optionnel pour ne pas casser les tests existants ; requis en prod pour
    // que l'OTP parte réellement par WhatsApp/SMS.
    private readonly notif?: NotificationService,
  ) {}

  async requestOtp(phone: string): Promise<{ expiresIn: number }> {
    // Générateur cryptographique : un OTP issu de Math.random() est prédictible.
    const code = randomInt(100_000, 1_000_000).toString();
    await redis.set(`otp:${phone}`, `${code}:0`, { EX: OTP_TTL });

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[OTP DEV] ${phone} → ${code}`);
    }

    // Envoi réel (WhatsApp avec repli SMS). Sans provider configuré, le stub
    // logue — le flux reste utilisable en développement.
    await this.notif?.send({
      to: phone,
      message: `MBOLO Santé — votre code de connexion : ${code}\nValable ${Math.round(OTP_TTL / 60)} min. Ne le partagez jamais.`,
    });

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

    const signOptions: jwt.SignOptions = {
      algorithm: 'HS256',
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET!,
      signOptions,
    );

    return { token, user: { id: user.id, phone: user.phone, role: user.role, name: user.name } };
  }
}
