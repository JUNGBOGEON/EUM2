import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingChatModule } from './chat/meeting-chat.module';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingSession } from './entities/meeting-session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Transcription } from './entities/transcription.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceEvent } from '../workspaces/entities/workspace-event.entity';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { ChimeService } from './services/chime.service';
import { ChimeSdkService } from './services/chime-sdk.service';
import { TranscriptionService } from './services/transcription.service';
import { TranscriptionBufferService } from './services/transcription-buffer.service';
import { TranscriptionQueryService } from './services/transcription-query.service';
import { SummaryService } from './services/summary.service';
import { TranslationService } from './services/translation.service';
import { ParticipantPreferenceService } from './services/participant-preference.service';
import { TranslationCacheService } from './services/translation-cache.service';
import { TranslationContextService } from './services/translation-context.service';
import { SentenceDetectorService } from './services/sentence-detector.service';
import { TextChunkingService } from './services/text-chunking.service';
import { TranscribeUrlService } from './services/transcribe-url.service';
import { PollyService } from './services/polly.service';
import { PollyCacheService } from './services/polly-cache.service';
import { TTSPreferenceService } from './services/tts-preference.service';
import { VoiceDubbingTTSService } from './services/voice-dubbing-tts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeetingSession,
      SessionParticipant,
      Transcription,
      Workspace,
      WorkspaceEvent,
      User,
    ]),
    RedisModule,
    WorkspacesModule,
    AiModule,
    StorageModule,
    MeetingChatModule,
  ],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    ChimeService,
    ChimeSdkService,
    TranscriptionService,
    TranscriptionBufferService,
    TranscriptionQueryService,
    SummaryService,
    TranslationService,
    ParticipantPreferenceService,
    TranslationCacheService,
    TranslationContextService,
    SentenceDetectorService,
    TextChunkingService,
    TranscribeUrlService,
    PollyService,
    PollyCacheService,
    TTSPreferenceService,
    VoiceDubbingTTSService,
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
