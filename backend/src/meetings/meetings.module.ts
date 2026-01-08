import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { Transcription } from './entities/transcription.entity';
import { RedisModule } from '../redis/redis.module';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';
import { TranscriptionGateway } from './gateways/transcription.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingParticipant, Transcription]),
    RedisModule,
  ],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
    TranscriptionGateway,
  ],
  exports: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
  ],
})
export class MeetingsModule {}
