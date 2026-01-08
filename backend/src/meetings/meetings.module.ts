import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingSession } from './entities/meeting-session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Transcription } from './entities/transcription.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { RedisModule } from '../redis/redis.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingSession, SessionParticipant, Transcription, Workspace]),
    RedisModule,
    WorkspacesModule,
  ],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
  ],
  exports: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
  ],
})
export class MeetingsModule {}
