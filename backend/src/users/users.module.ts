import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { VoiceEnrollmentController } from './controllers/voice-enrollment.controller';
import { VoiceEnrollmentService } from './services/voice-enrollment.service';
import { User } from './entities/user.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StorageModule, // S3StorageService 사용
  ],
  controllers: [UsersController, VoiceEnrollmentController],
  providers: [UsersService, VoiceEnrollmentService],
  exports: [UsersService, VoiceEnrollmentService],
})
export class UsersModule {}
