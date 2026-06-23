import { HTTP } from '../../lib/errors';
import { UserRepository } from './repository';
import { UpdateMeInput } from './schema';

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
}
