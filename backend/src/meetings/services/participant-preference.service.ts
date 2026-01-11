import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../../redis/redis.service';
import { SessionParticipant } from '../entities/session-participant.entity';
import { CACHE_TTL } from '../../common/constants';

/**
 * Participant Preference Service
 * Manages user language settings and translation preferences
 */
@Injectable()
export class ParticipantPreferenceService {
  private readonly logger = new Logger(ParticipantPreferenceService.name);

  constructor(
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    private redisService: RedisService,
  ) {}

  // ==========================================
  // 번역 활성화 상태 관리
  // ==========================================

  /**
   * 사용자의 번역 활성화 여부 확인
   */
  async isTranslationEnabled(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    const enabled = await this.redisService.get<boolean>(
      `translation:enabled:${sessionId}:${userId}`,
    );
    return enabled === true;
  }

  /**
   * 사용자의 번역 활성화/비활성화 설정
   */
  async setTranslationEnabled(
    sessionId: string,
    userId: string,
    enabled: boolean,
  ): Promise<void> {
    await this.redisService.set(
      `translation:enabled:${sessionId}:${userId}`,
      enabled,
      CACHE_TTL.TRANSLATION_PREFERENCE,
    );
    this.logger.log(
      `Translation ${enabled ? 'enabled' : 'disabled'} for user ${userId} in session ${sessionId}`,
    );
  }

  /**
   * 번역 상태 조회 (활성화 여부 + 사용자 언어)
   */
  async getTranslationStatus(
    sessionId: string,
    userId: string,
  ): Promise<{ enabled: boolean; userLanguage: string }> {
    const enabled = await this.isTranslationEnabled(sessionId, userId);
    const userLanguage = await this.getUserLanguage(sessionId, userId);
    return { enabled, userLanguage };
  }

  // ==========================================
  // 사용자 언어 설정 관리
  // ==========================================

  /**
   * 세션에서 사용자의 언어 설정 조회
   */
  async getUserLanguage(sessionId: string, userId: string): Promise<string> {
    const language = await this.redisService.get<string>(
      `transcription:language:${sessionId}:${userId}`,
    );
    return language || 'ko-KR'; // 기본값
  }

  /**
   * 세션에서 사용자의 언어 설정 저장
   */
  async setUserLanguage(
    sessionId: string,
    userId: string,
    languageCode: string,
  ): Promise<void> {
    await this.redisService.set(
      `transcription:language:${sessionId}:${userId}`,
      languageCode,
      CACHE_TTL.TRANSLATION_PREFERENCE,
    );
    this.logger.log(
      `Language set to ${languageCode} for user ${userId} in session ${sessionId}`,
    );
  }

  // ==========================================
  // 참가자 정보 조회
  // ==========================================

  /**
   * 세션의 모든 참가자 조회 (캐싱 적용)
   */
  async getSessionParticipants(
    sessionId: string,
  ): Promise<SessionParticipant[]> {
    const participantsCacheKey = `participants:all:${sessionId}`;
    let participants =
      await this.redisService.get<SessionParticipant[]>(participantsCacheKey);

    if (!participants) {
      participants = await this.participantRepository.find({
        where: { sessionId },
        relations: ['user'],
      });

      if (participants.length > 0) {
        await this.redisService.set(
          participantsCacheKey,
          participants,
          CACHE_TTL.PARTICIPANTS_LIST,
        );
      }
    }

    return participants;
  }

  /**
   * 여러 사용자의 번역 설정을 배치로 조회 (N+1 쿼리 문제 해결)
   */
  async getParticipantPreferencesBatch(
    sessionId: string,
    userIds: string[],
  ): Promise<
    Array<{ userId: string; language: string; translationEnabled: boolean }>
  > {
    const preferences = await Promise.all(
      userIds.map(async (userId) => {
        const [language, translationEnabled] = await Promise.all([
          this.getUserLanguage(sessionId, userId),
          this.isTranslationEnabled(sessionId, userId),
        ]);
        return { userId, language, translationEnabled };
      }),
    );

    return preferences;
  }

  /**
   * 세션 참가자들의 언어 설정 목록 조회
   */
  async getSessionLanguagePreferences(sessionId: string): Promise<
    Array<{
      userId: string;
      userName: string;
      language: string;
      translationEnabled: boolean;
    }>
  > {
    const participants = await this.participantRepository.find({
      where: { sessionId },
      relations: ['user'],
    });

    const preferences = await Promise.all(
      participants.map(async (p) => ({
        userId: p.userId,
        userName: p.user?.name || 'Unknown',
        language: await this.getUserLanguage(sessionId, p.userId),
        translationEnabled: await this.isTranslationEnabled(
          sessionId,
          p.userId,
        ),
      })),
    );

    return preferences;
  }
}
