import { HTTP } from '../../lib/errors';
import { UserRepository } from './repository';
import { UpdateMeInput, SavePushTokenInput } from './schema';

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw HTTP.notFound('Utilisateur introuvable');
    return user;
  }

  async updateMe(userId: string, data: UpdateMeInput) {
    return this.repo.update(userId, data);
  }

  async savePushToken(userId: string, data: SavePushTokenInput) {
    return this.repo.savePushToken(userId, data.pushToken);
  }
}
