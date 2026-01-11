import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import { createHash } from 'crypto';

import { RedisService } from '../../redis/redis.service';
import { SessionParticipant } from '../entities/session-participant.entity';
import { WorkspaceGateway } from '../../workspaces/workspace.gateway';

/**
 * 번역 요청 DTO
 */
export interface TranslationRequest {
  sessionId: string;
  speakerUserId: string;
  speakerAttendeeId: string;
  speakerName: string;
  originalText: string;
  sourceLanguage: string;
  resultId: string;
  timestamp: number;
}

/**
 * 번역된 자막 WebSocket 페이로드
 */
export interface TranslatedTranscriptPayload {
  type: 'translated_transcript';
  resultId: string;
  speakerId: string; // attendeeId (프론트엔드 조회용)
  speakerUserId: string; // userId (본인 필터링용)
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private translateClient: TranslateClient;

  // 언어 코드 매핑 (Chime/Transcribe → AWS Translate)
  private readonly LANGUAGE_MAP: Record<string, string> = {
    'ko-KR': 'ko',
    'en-US': 'en',
    'zh-CN': 'zh',
    'ja-JP': 'ja',
  };

  // AWS Translate → 원본 언어 코드 역매핑
  private readonly REVERSE_LANGUAGE_MAP: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
    ja: 'ja-JP',
  };

  constructor(
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    private configService: ConfigService,
    private redisService: RedisService,
    @Inject(forwardRef(() => WorkspaceGateway))
    private workspaceGateway: WorkspaceGateway,
  ) {
    const region = this.configService.get('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured for Translate');
    }

    this.translateClient = new TranslateClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

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
      2 * 60 * 60 * 1000, // 2시간 TTL
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
      2 * 60 * 60 * 1000, // 2시간 TTL
    );
    this.logger.log(
      `Language set to ${languageCode} for user ${userId} in session ${sessionId}`,
    );
  }

  // ==========================================
  // 번역 처리
  // ==========================================

  /**
   * 트랜스크립션에 대해 번역 처리 및 배포
   *
   * 1. 발화자 제외한 참가자 조회
   * 2. 번역 활성화된 참가자만 필터링 (배치 쿼리로 N+1 문제 해결)
   * 3. 타겟 언어별 그룹핑
   * 4. 번역 수행 (캐싱 적용)
   * 5. WebSocket으로 각 사용자에게 전송
   */
  async processTranslation(request: TranslationRequest): Promise<void> {
    const {
      sessionId,
      speakerUserId,
      speakerAttendeeId,
      originalText,
      sourceLanguage,
      resultId,
      timestamp,
      speakerName,
    } = request;

    this.logger.log(
      `[Translation] 🚀 Processing translation request: speaker=${speakerName}(${speakerUserId}), sourceLanguage=${sourceLanguage}, text="${originalText.substring(0, 30)}..."`,
    );

    try {
      // 1. 세션의 모든 참가자 조회 (캐시에서 조회, 30초 TTL)
      const participantsCacheKey = `participants:all:${sessionId}`;
      let participants =
        await this.redisService.get<SessionParticipant[]>(participantsCacheKey);

      if (!participants) {
        participants = await this.participantRepository.find({
          where: { sessionId },
          relations: ['user'],
        });

        if (participants.length > 0) {
          // 캐시에 저장 (30초 TTL - 참가자가 자주 변경될 수 있음)
          await this.redisService.set(
            participantsCacheKey,
            participants,
            30 * 1000,
          );
        }
      }

      this.logger.log(
        `[Translation] 📋 Found ${participants.length} participants in session`,
      );

      // 발화자 제외한 참가자 목록
      const otherParticipants = participants.filter(
        (p) => p.userId !== speakerUserId,
      );

      if (otherParticipants.length === 0) {
        this.logger.log(
          '[Translation] ⚠️ No other participants in session, skipping translation',
        );
        return; // 다른 참가자 없음
      }

      this.logger.log(
        `[Translation] 👥 Other participants: ${otherParticipants.map((p) => p.user?.name || p.userId).join(', ')}`,
      );

      // 2. 배치로 모든 참가자의 번역 설정 조회 (N+1 쿼리 문제 해결)
      const participantPreferences = await this.getParticipantPreferencesBatch(
        sessionId,
        otherParticipants.map((p) => p.userId),
      );

      // 디버그: 각 참가자의 설정 로깅
      for (const pref of participantPreferences) {
        const participant = otherParticipants.find(
          (p) => p.userId === pref.userId,
        );
        this.logger.log(
          `[Translation] 🔧 Participant ${participant?.user?.name || pref.userId}: translationEnabled=${pref.translationEnabled}, language=${pref.language}, sourceLanguage=${sourceLanguage}`,
        );
      }

      // 3. 번역 활성화 + 다른 언어 사용자만 필터링
      const translationTargets: Array<{
        userId: string;
        targetLanguage: string;
      }> = [];

      for (const pref of participantPreferences) {
        // 번역 비활성화면 스킵
        if (!pref.translationEnabled) {
          this.logger.log(
            `[Translation] ⏭️ Skipping ${pref.userId}: translation disabled`,
          );
          continue;
        }

        // 소스 언어와 타겟 언어가 같으면 번역 불필요
        if (pref.language === sourceLanguage) {
          this.logger.log(
            `[Translation] ⏭️ Skipping ${pref.userId}: same language (${pref.language})`,
          );
          continue;
        }

        this.logger.log(
          `[Translation] ✅ Will translate for ${pref.userId}: ${sourceLanguage} → ${pref.language}`,
        );
        translationTargets.push({
          userId: pref.userId,
          targetLanguage: pref.language,
        });
      }

      if (translationTargets.length === 0) {
        this.logger.log('[Translation] ⚠️ No translation targets found');
        return; // 번역할 대상이 없음
      }

      // 3. 타겟 언어별 그룹핑 (같은 언어로 번역받을 사용자들 묶음)
      const languageGroups = new Map<string, string[]>();
      for (const target of translationTargets) {
        const { targetLanguage, userId } = target;
        if (!languageGroups.has(targetLanguage)) {
          languageGroups.set(targetLanguage, []);
        }
        languageGroups.get(targetLanguage)!.push(userId);
      }

      // 4. 언어별로 번역 수행 및 전송
      for (const [targetLanguage, userIds] of languageGroups) {
        try {
          this.logger.log(
            `[Translation] 🔄 Translating to ${targetLanguage} for users: ${userIds.join(', ')}`,
          );

          const translatedText = await this.translateWithCache(
            originalText,
            sourceLanguage,
            targetLanguage,
          );

          this.logger.log(
            `[Translation] ✅ Translated: "${originalText.substring(0, 20)}..." → "${translatedText.substring(0, 20)}..."`,
          );

          // 5. 해당 언어 사용자들에게 WebSocket으로 전송
          const payload: TranslatedTranscriptPayload = {
            type: 'translated_transcript',
            resultId,
            speakerId: speakerAttendeeId, // attendeeId (프론트엔드 조회용)
            speakerUserId, // userId (본인 필터링용)
            speakerName,
            originalText,
            translatedText,
            sourceLanguage,
            targetLanguage,
            timestamp,
          };

          for (const userId of userIds) {
            this.logger.log(
              `[Translation] 📤 Sending translated transcript to user: ${userId}`,
            );
            this.workspaceGateway.sendTranslatedTranscript(userId, payload);
          }

          this.logger.log(
            `[Translation] ✅ Sent ${targetLanguage} translation to ${userIds.length} user(s)`,
          );
        } catch (error) {
          // 조용히 실패 - 개별 언어 번역 실패해도 다른 언어는 계속 처리
          this.logger.warn(
            `[Translation] ❌ Translation to ${targetLanguage} failed: ${error.message}`,
          );
        }
      }
    } catch (error) {
      // 조용히 실패 - 전체 프로세스 실패해도 원본 자막은 정상 표시됨
      this.logger.error(
        `[Translation] ❌ Translation processing failed: ${error.message}`,
      );
    }
  }

  // ==========================================
  // AWS Translate 호출 (캐싱 적용)
  // ==========================================

  /**
   * 텍스트 번역 (캐싱 적용)
   */
  private async translateWithCache(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    // 캐시 키 생성: 전체 MD5 해시 + 소스언어 + 타겟 언어 (해시 충돌 방지)
    const textHash = createHash('md5').update(text).digest('hex'); // 전체 32자 사용
    const sourceLangCode = this.LANGUAGE_MAP[sourceLang] || sourceLang;
    const targetLangCode = this.LANGUAGE_MAP[targetLang] || targetLang;
    const cacheKey = `translation:cache:${textHash}:${sourceLangCode}:${targetLangCode}`;

    // 캐시 확인
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for translation: ${cacheKey}`);
      return cached;
    }

    // AWS Translate 호출
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLangCode,
      TargetLanguageCode: targetLangCode,
    });

    const response = await this.translateClient.send(command);
    const translatedText = response.TranslatedText || text;

    // 캐시 저장 (1시간 TTL)
    await this.redisService.set(cacheKey, translatedText, 60 * 60 * 1000);

    this.logger.debug(
      `Translated: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..." (${sourceLang} → ${targetLang})`,
    );

    return translatedText;
  }

  // ==========================================
  // 참가자 언어 정보 조회
  // ==========================================

  /**
   * 여러 사용자의 번역 설정을 배치로 조회 (N+1 쿼리 문제 해결)
   * Promise.all을 사용하여 병렬 처리
   */
  private async getParticipantPreferencesBatch(
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
