import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingChatMessage } from './entities/meeting-chat-message.entity';
import { MeetingChatService } from './meeting-chat.service';
import { MeetingChatGateway } from './meeting-chat.gateway';
import { TranslationCacheService } from '../services/translation-cache.service';
import { ParticipantPreferenceService } from '../services/participant-preference.service';
import { RedisModule } from '../../redis/redis.module';
import { SessionParticipant } from '../entities/session-participant.entity';
import { MeetingChatController } from './meeting-chat.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeetingChatMessage, SessionParticipant]),
        RedisModule,
    ],
    controllers: [MeetingChatController],
    providers: [
        MeetingChatService,
        MeetingChatGateway,
        TranslationCacheService,
        ParticipantPreferenceService,
    ],
    exports: [MeetingChatService],
})
export class MeetingChatModule { }
