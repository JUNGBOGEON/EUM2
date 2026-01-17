import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

import { WorkspaceGateway, TTSReadyPayload } from '../../workspaces/workspace.gateway';
import { ParticipantPreferenceService } from './participant-preference.service';
import { TranslationCacheService } from './translation-cache.service';
import { TranslationContextService } from './translation-context.service';
import {
  SentenceDetectorService,
  SentenceAnalysis,
} from './sentence-detector.service';
import { TTSPreferenceService } from './tts-preference.service';
import { PollyCacheService } from './polly-cache.service';
import { VoiceDubbingTTSService } from './voice-dubbing-tts.service';

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
  translationMethod?: 'direct' | 'context-aware'; // 번역 방식
}

/**
 * Translation Service
 * Orchestrates translation processing and delivery
 * Delegates preferences to ParticipantPreferenceService
 * Delegates AWS calls to TranslationCacheService
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    private participantPreferenceService: ParticipantPreferenceService,
    private translationCacheService: TranslationCacheService,
    private translationContextService: TranslationContextService,
    private sentenceDetectorService: SentenceDetectorService,
    private ttsPreferenceService: TTSPreferenceService,
    private pollyCacheService: PollyCacheService,
    private voiceDubbingTTSService: VoiceDubbingTTSService,
    @Inject(forwardRef(() => WorkspaceGateway))
    private workspaceGateway: WorkspaceGateway,
  ) {}

  // ==========================================
  // 번역 설정 관리 (위임)
  // ==========================================

  async isTranslationEnabled(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    return this.participantPreferenceService.isTranslationEnabled(
      sessionId,
      userId,
    );
  }

  async setTranslationEnabled(
    sessionId: string,
    userId: string,
    enabled: boolean,
  ): Promise<void> {
    return this.participantPreferenceService.setTranslationEnabled(
      sessionId,
      userId,
      enabled,
    );
  }

  async getTranslationStatus(
    sessionId: string,
    userId: string,
  ): Promise<{ enabled: boolean; userLanguage: string }> {
    return this.participantPreferenceService.getTranslationStatus(
      sessionId,
      userId,
    );
  }

  // ==========================================
  // 사용자 언어 설정 관리 (위임)
  // ==========================================

  async getUserLanguage(sessionId: string, userId: string): Promise<string> {
    return this.participantPreferenceService.getUserLanguage(sessionId, userId);
  }

  async setUserLanguage(
    sessionId: string,
    userId: string,
    languageCode: string,
  ): Promise<void> {
    return this.participantPreferenceService.setUserLanguage(
      sessionId,
      userId,
      languageCode,
    );
  }

  async getSessionLanguagePreferences(sessionId: string): Promise<
    Array<{
      userId: string;
      userName: string;
      language: string;
      translationEnabled: boolean;
    }>
  > {
    return this.participantPreferenceService.getSessionLanguagePreferences(
      sessionId,
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
      `[Translation] Processing: speaker=${speakerName}(${speakerUserId}), sourceLanguage=${sourceLanguage}, text="${originalText.substring(0, 30)}..."`,
    );

    try {
      // 1. 세션의 모든 참가자 조회 (캐싱 적용)
      const participants =
        await this.participantPreferenceService.getSessionParticipants(
          sessionId,
        );

      this.logger.log(
        `[Translation] Found ${participants.length} participants in session`,
      );

      // 발화자 제외한 참가자 목록
      const otherParticipants = participants.filter(
        (p) => p.userId !== speakerUserId,
      );

      if (otherParticipants.length === 0) {
        this.logger.log(
          '[Translation] No other participants in session, skipping',
        );
        return;
      }

      // 2. 배치로 모든 참가자의 번역 설정 조회
      const participantPreferences =
        await this.participantPreferenceService.getParticipantPreferencesBatch(
          sessionId,
          otherParticipants.map((p) => p.userId),
        );

      // 3. 번역 활성화 + 다른 언어 사용자만 필터링
      const translationTargets = this.filterTranslationTargets(
        participantPreferences,
        sourceLanguage,
      );

      if (translationTargets.length === 0) {
        this.logger.log('[Translation] No translation targets found');
        return;
      }

      // 4. 타겟 언어별 그룹핑
      const languageGroups = this.groupByTargetLanguage(translationTargets);

      // 5. 언어별로 번역 수행 및 전송
      await this.translateAndSend(languageGroups, {
        sessionId,
        speakerAttendeeId,
        speakerUserId,
        speakerName,
        originalText,
        sourceLanguage,
        resultId,
        timestamp,
      });
    } catch (error) {
      // 조용히 실패 - 전체 프로세스 실패해도 원본 자막은 정상 표시됨
      this.logger.error(
        `[Translation] Translation processing failed: ${error.message}`,
      );
    }
  }

  /**
   * 번역 대상 필터링 (번역 활성화 + 다른 언어 사용자)
   */
  private filterTranslationTargets(
    preferences: Array<{
      userId: string;
      language: string;
      translationEnabled: boolean;
    }>,
    sourceLanguage: string,
  ): Array<{ userId: string; targetLanguage: string }> {
    const targets: Array<{ userId: string; targetLanguage: string }> = [];

    for (const pref of preferences) {
      // 번역 비활성화면 스킵
      if (!pref.translationEnabled) {
        this.logger.debug(`Skipping ${pref.userId}: translation disabled`);
        continue;
      }

      // 소스 언어와 타겟 언어가 같으면 번역 불필요
      if (pref.language === sourceLanguage) {
        this.logger.debug(
          `Skipping ${pref.userId}: same language (${pref.language})`,
        );
        continue;
      }

      this.logger.log(
        `[Translation] Will translate for ${pref.userId}: ${sourceLanguage} → ${pref.language}`,
      );
      targets.push({
        userId: pref.userId,
        targetLanguage: pref.language,
      });
    }

    return targets;
  }

  /**
   * 타겟 언어별로 그룹핑
   */
  private groupByTargetLanguage(
    targets: Array<{ userId: string; targetLanguage: string }>,
  ): Map<string, string[]> {
    const languageGroups = new Map<string, string[]>();

    for (const target of targets) {
      const { targetLanguage, userId } = target;
      if (!languageGroups.has(targetLanguage)) {
        languageGroups.set(targetLanguage, []);
      }
      languageGroups.get(targetLanguage)!.push(userId);
    }

    return languageGroups;
  }

  /**
   * 언어별로 번역 수행 및 WebSocket 전송
   * 문맥 인식 번역을 사용하여 연속된 발화의 번역 품질을 향상시킵니다.
   */
  private async translateAndSend(
    languageGroups: Map<string, string[]>,
    context: {
      sessionId: string;
      speakerAttendeeId: string;
      speakerUserId: string;
      speakerName: string;
      originalText: string;
      sourceLanguage: string;
      resultId: string;
      timestamp: number;
    },
  ): Promise<void> {
    const {
      sessionId,
      speakerAttendeeId,
      speakerUserId,
      speakerName,
      originalText,
      sourceLanguage,
      resultId,
      timestamp,
    } = context;

    // 문장 완료 여부 분석
    const sentenceAnalysis = this.sentenceDetectorService.analyzeSentence(
      originalText,
      sourceLanguage,
    );

    this.logger.debug(
      `[Translation] Sentence analysis: isComplete=${sentenceAnalysis.isComplete}, ` +
        `confidence=${sentenceAnalysis.confidence}, reason=${sentenceAnalysis.reason}`,
    );

    // 발화자의 문맥 조회
    const speakerContext = await this.translationContextService.getContext(
      sessionId,
      speakerUserId,
    );

    // 연속 발화인지 확인
    const isContinuous =
      this.translationContextService.isContinuousSpeech(speakerContext);

    for (const [targetLanguage, userIds] of languageGroups) {
      try {
        this.logger.log(
          `[Translation] Translating to ${targetLanguage} for users: ${userIds.join(', ')}`,
        );

        // 항상 직접 번역 사용 (문맥 인식 번역은 추출 오류로 비활성화)
        const translatedText =
          await this.translationCacheService.translateWithCache(
            originalText,
            sourceLanguage,
            targetLanguage,
          );
        const translationMethod = 'direct';

        this.logger.log(
          `[Translation] Direct: "${originalText.substring(0, 20)}..." → "${translatedText.substring(0, 20)}..."`,
        );

        // 해당 언어 사용자들에게 WebSocket으로 전송
        const payload: TranslatedTranscriptPayload = {
          type: 'translated_transcript',
          resultId,
          speakerId: speakerAttendeeId,
          speakerUserId,
          speakerName,
          originalText,
          translatedText,
          sourceLanguage,
          targetLanguage,
          timestamp,
          translationMethod,
        };

        for (const userId of userIds) {
          this.logger.debug(
            `[Translation] Sending translated transcript to user: ${userId}`,
          );
          await this.workspaceGateway.sendTranslatedTranscript(userId, payload);
        }

        this.logger.log(
          `[Translation] Sent ${targetLanguage} translation (${translationMethod}) to ${userIds.length} user(s)`,
        );

        // TTS 처리 (비동기, 번역 전송과 별개로 처리)
        this.processTTSForUsers(
          sessionId,
          userIds,
          translatedText,
          targetLanguage,
          resultId,
          speakerName,
          speakerUserId, // 발화자 userId 추가 (음성 더빙 확인용)
          timestamp,
        ).catch((err) => {
          this.logger.error(`[TTS] TTS processing failed: ${err.message}`, err.stack);
        });
      } catch (error) {
        // 조용히 실패 - 개별 언어 번역 실패해도 다른 언어는 계속 처리
        this.logger.warn(
          `[Translation] Translation to ${targetLanguage} failed: ${error.message}`,
        );
      }
    }

    // 문맥 업데이트 (모든 번역 완료 후)
    // 첫 번째 타겟 언어의 번역 결과를 문맥에 저장
    const firstLanguage = languageGroups.keys().next().value;
    if (firstLanguage) {
      try {
        const translatedForContext =
          await this.translationCacheService.translateWithCache(
            originalText,
            sourceLanguage,
            firstLanguage,
          );

        await this.translationContextService.updateContext(
          sessionId,
          speakerUserId,
          originalText,
          translatedForContext,
        );
      } catch (error) {
        // 문맥 번역 캐싱 실패 - 로그 후 번역 없이 원문만으로 문맥 업데이트
        this.logger.warn(
          `[Translation] Context caching failed for session ${sessionId}: ${error.message}`,
        );
        await this.translationContextService.updateContext(
          sessionId,
          speakerUserId,
          originalText,
        );
      }
    }
  }

  // ==========================================
  // TTS Processing
  // ==========================================

  /**
   * TTS 활성화된 사용자들에게 TTS 오디오 생성 및 전송
   *
   * 발화자가 음성 더빙을 활성화한 경우:
   * - AI Server (XTTS v2)를 사용하여 발화자 목소리로 TTS 생성
   *
   * 발화자가 음성 더빙을 비활성화한 경우:
   * - AWS Polly를 사용하여 TTS 생성
   */
  private async processTTSForUsers(
    sessionId: string,
    userIds: string[],
    translatedText: string,
    targetLanguage: string,
    resultId: string,
    speakerName: string,
    speakerUserId: string,
    timestamp: number,
  ): Promise<void> {
    // TTS 활성화된 사용자만 필터링
    const ttsEnabledUsers = await this.ttsPreferenceService.getTTSEnabledUsers(
      sessionId,
      userIds,
    );

    if (ttsEnabledUsers.length === 0) {
      this.logger.debug('[TTS] No TTS-enabled users for this translation');
      return;
    }

    this.logger.log(
      `[TTS] Processing TTS for ${ttsEnabledUsers.length} user(s), lang=${targetLanguage}`,
    );

    // 발화자의 음성 더빙 활성화 여부 확인
    const voiceDubbingEnabled = await this.voiceDubbingTTSService.isVoiceDubbingEnabled(
      speakerUserId,
    );

    // 일본어는 voice dubbing 품질이 낮아 Polly 사용
    const isJapanese = targetLanguage === 'ja-JP' || targetLanguage === 'ja';
    const useVoiceDubbing = voiceDubbingEnabled && !isJapanese;

    this.logger.log(
      `[TTS] Speaker ${speakerUserId} voice dubbing: ${voiceDubbingEnabled ? 'ENABLED' : 'DISABLED'}${isJapanese ? ' (skipped for Japanese)' : ''}`,
    );

    // 음성 더빙 사용 시: 한 번만 생성하고 모든 청취자에게 전송 (동일 언어)
    if (useVoiceDubbing) {
      try {
        const voiceDubbingResult = await this.voiceDubbingTTSService.synthesizeWithVoiceDubbing(
          translatedText,
          targetLanguage,
          speakerUserId,
          sessionId,
        );

        if (voiceDubbingResult) {
          // 모든 TTS 활성화 사용자에게 동일한 오디오 전송
          for (const userId of ttsEnabledUsers) {
            const payload: TTSReadyPayload = {
              type: 'tts_ready',
              resultId,
              audioUrl: voiceDubbingResult.audioUrl,
              durationMs: voiceDubbingResult.durationMs,
              voiceId: 'voice-dubbing',
              targetLanguage,
              speakerName,
              translatedText,
              timestamp,
            };

            await this.workspaceGateway.sendTTSReady(userId, payload);

            this.logger.debug(
              `[TTS] Sent voice-dubbing TTS to user ${userId}: duration=${voiceDubbingResult.durationMs}ms`,
            );
          }
          return; // 음성 더빙 성공 시 여기서 종료
        }

        // 음성 더빙 실패 시 Polly로 폴백
        this.logger.warn('[TTS] Voice dubbing failed, falling back to Polly');
      } catch (error) {
        this.logger.warn(
          `[TTS] Voice dubbing error, falling back to Polly: ${error.message}`,
        );
      }
    }

    // Polly 사용: 각 사용자별로 음성 설정에 따라 TTS 생성
    for (const userId of ttsEnabledUsers) {
      try {
        // 사용자의 음성 설정 가져오기
        const voiceId = await this.ttsPreferenceService.getVoicePreference(
          sessionId,
          userId,
          targetLanguage,
        );

        // TTS 생성 (캐싱 적용)
        const ttsResult = await this.pollyCacheService.synthesizeWithCache(
          translatedText,
          voiceId,
          targetLanguage,
          sessionId,
        );

        // TTS Ready 이벤트 전송
        const payload: TTSReadyPayload = {
          type: 'tts_ready',
          resultId,
          audioUrl: ttsResult.audioUrl,
          durationMs: ttsResult.durationMs,
          voiceId: ttsResult.voiceId,
          targetLanguage,
          speakerName,
          translatedText,
          timestamp,
        };

        await this.workspaceGateway.sendTTSReady(userId, payload);

        this.logger.debug(
          `[TTS] Sent Polly TTS to user ${userId}: voice=${voiceId}, duration=${ttsResult.durationMs}ms`,
        );
      } catch (error) {
        // 개별 사용자 TTS 실패는 무시
        this.logger.warn(
          `[TTS] Failed to generate TTS for user ${userId}: ${error.message}`,
        );
      }
    }
  }
}
