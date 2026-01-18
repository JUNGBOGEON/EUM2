import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingChatMessage } from './entities/meeting-chat-message.entity';
import { TranslationCacheService } from '../services/translation-cache.service';
import { ParticipantPreferenceService } from '../services/participant-preference.service';

@Injectable()
export class MeetingChatService {
    private readonly logger = new Logger(MeetingChatService.name);

    constructor(
        @InjectRepository(MeetingChatMessage)
        private chatRepository: Repository<MeetingChatMessage>,
        private translationCacheService: TranslationCacheService,
        private participantPreferenceService: ParticipantPreferenceService,
    ) { }

    async saveMessage(
        meetingId: string,
        senderId: string,
        content: string,
        sourceLanguage: string,
    ): Promise<MeetingChatMessage> {
        const message = this.chatRepository.create({
            meetingId,
            senderId,
            content,
            sourceLanguage,
            translations: {}, // 빈 객체로 초기화 (NOT NULL 제약 조건 충족)
        });
        return this.chatRepository.save(message);
    }

    async getMessages(meetingId: string): Promise<MeetingChatMessage[]> {
        return this.chatRepository.find({
            where: { meetingId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
        });
    }

    /**
     * Process message translation for all participants in the meeting
     * Returns a map of language code -> translated text
     */
    async processTranslations(
        meetingId: string,
        content: string,
        sourceLanguage: string,
    ): Promise<Record<string, string>> {
        const translations: Record<string, string> = {};

        // Get all participants to determine required target languages
        const participants = await this.participantPreferenceService.getSessionParticipants(meetingId);

        // Collect unique target languages (excluding source language)
        const targetLanguages = new Set<string>();

        for (const participant of participants) {
            const pref = await this.participantPreferenceService.getTranslationStatus(meetingId, participant.userId);
            if (pref.enabled && pref.userLanguage !== sourceLanguage) {
                targetLanguages.add(pref.userLanguage);
            }
        }

        // Translate for each target language
        for (const targetLang of targetLanguages) {
            try {
                const translatedText = await this.translationCacheService.translateWithCache(
                    content,
                    sourceLanguage,
                    targetLang
                );
                translations[targetLang] = translatedText;
            } catch (error) {
                this.logger.error(`Failed to translate to ${targetLang}: ${error.message}`);
            }
        }

        return translations;
    }

    async updateMessageTranslations(messageId: string, translations: Record<string, string>) {
        await this.chatRepository.update(messageId, { translations });
    }
}
