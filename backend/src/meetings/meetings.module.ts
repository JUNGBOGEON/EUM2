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
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';
import { SummaryService } from './services/summary.service';
import { TranslationService } from './services/translation.service';
import { TranscribeUrlService } from './services/transcribe-url.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingSession,
      SessionParticipant,
      Transcription,
      Workspace,
    ]),
    RedisModule,
    WorkspacesModule,
    AiModule,
    StorageModule,
  ],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
    SummaryService,
    TranslationService,
    TranscribeUrlService,
  ],
  exports: [
    MeetingsService,
    ChimeService,
    TranscriptionService,
    SummaryService,
    TranslationService,
    TranscribeUrlService,
  ],
})
export class MeetingsModule {}
