import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * 사용자 검색 (이름 또는 이메일)
   */
  async search(query: string, limit: number = 10): Promise<User[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchQuery = `%${query.trim()}%`;

    return this.usersRepository.find({
      where: [
        { name: ILike(searchQuery) },
        { email: ILike(searchQuery) },
      ],
      take: limit,
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'profileImage'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(data: {
    googleId: string;
    email: string;
    name: string;
    profileImage?: string;
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, data);
    return this.findById(id);
  }
}
