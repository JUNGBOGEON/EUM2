import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자 검색 (이름 또는 이메일)
   */
  @Get('search')
  async search(@Query('q') query: string) {
    const users = await this.usersService.search(query);
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
