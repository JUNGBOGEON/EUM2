import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MeetingSession, SummaryStatus } from './entities/meeting-session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Transcription } from './entities/transcription.entity';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from './dto/save-transcription.dto';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';
import { SummaryService } from './services/summary.service';
import { TranslationService } from './services/translation.service';

/**
 * MeetingsService
 *
 * 미팅 세션 관련 비즈니스 로직을 처리하는 파사드 서비스
 * - Chime 관련 작업은 ChimeService에 위임
 * - 트랜스크립션 관련 작업은 TranscriptionService에 위임
 */
@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private chimeService: ChimeService,
    private transcriptionService: TranscriptionService,
    private summaryService: SummaryService,
    private translationService: TranslationService,
  ) { }

  // ==========================================
  // 세션 관리 (ChimeService 위임)
  // ==========================================

  /**
   * 워크스페이스에서 미팅 세션 시작
   * - 진행 중인 세션이 있으면 해당 세션에 참가
   * - 없으면 새 세션 생성
   */
  async startSession(workspaceId: string, hostId: string, title?: string) {
    return this.chimeService.startSession(workspaceId, hostId, title);
  }

  /**
   * 세션 참가
   */
  async joinSession(sessionId: string, userId: string) {
    return this.chimeService.joinSession(sessionId, userId);
  }

  /**
   * 세션 나가기
   */
  async leaveSession(sessionId: string, userId: string) {
    return this.chimeService.leaveSession(sessionId, userId);
  }

  /**
   * 세션 종료
   * @param sessionId 세션 ID
   * @param hostId 호스트 ID
   * @param generateSummary AI 요약 생성 여부 (기본값: true)
   */
  async endSession(
    sessionId: string,
    hostId: string,
    generateSummary: boolean = true,
  ) {
    // 트랜스크립션 버퍼 플러시 후 세션 종료
    const flushResult =
      await this.transcriptionService.flushAllTranscriptionsOnSessionEnd(
        sessionId,
      );
    this.logger.log(
      `[Session End] Flushed ${flushResult.flushed} transcriptions for session ${sessionId}`,
    );

    const session = await this.chimeService.endSession(sessionId, hostId);

    // 요약 생성 (비동기 - 세션 종료 응답을 블로킹하지 않음)
    if (generateSummary) {
      this.logger.log(
        `[Session End] Generating AI summary for session ${sessionId}...`,
      );
      this.summaryService.generateAndSaveSummary(sessionId).catch((err) => {
        this.logger.error(
          `[Summary] Failed to generate summary for ${sessionId}:`,
          err,
        );
      });
    } else {
      this.logger.log(
        `[Session End] Skipping AI summary for session ${sessionId} (user opted out)`,
      );
      // 요약 상태를 SKIPPED로 업데이트하여 프론트엔드에서 무한 로딩 방지
      await this.sessionRepository.update(sessionId, {
        summaryStatus: SummaryStatus.SKIPPED,
      });
    }

    return session;
  }

  /**
   * 세션 조회
   */
  async findSession(sessionId: string): Promise<MeetingSession> {
    const session = await this.chimeService.findSession(sessionId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    return session;
  }

  /**
   * 워크스페이스의 활성 세션 조회
   */
  async getActiveSession(workspaceId: string) {
    return this.chimeService.getActiveSession(workspaceId);
  }

  /**
   * 워크스페이스의 세션 히스토리 조회
   */
  async getSessionHistory(workspaceId: string) {
    return this.chimeService.getSessionHistory(workspaceId);
  }

  /**
   * 세션 참가자 목록
   */
  async getParticipants(sessionId: string) {
    return this.chimeService.getParticipants(sessionId);
  }

  /**
   * 세션 정보 (Chime)
   */
  async getSessionInfo(sessionId: string) {
    return this.chimeService.getSessionInfo(sessionId);
  }

  /**
   * 세션 참가자 권한 확인
   * - 사용자가 해당 세션의 참가자인지 확인
   * @throws ForbiddenException 참가자가 아닌 경우
   */
  async verifyParticipant(sessionId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { sessionId, userId },
    });

    if (!participant) {
      throw new ForbiddenException(
        '세션 참가자만 이 기능을 사용할 수 있습니다.',
      );
    }
  }

  // ==========================================
  // 트랜스크립션 기능 (TranscriptionService 위임)
  // ==========================================

  async startTranscription(sessionId: string, languageCode?: string) {
    return this.transcriptionService.startTranscription(
      sessionId,
      languageCode,
    );
  }

  async stopTranscription(sessionId: string) {
    return this.transcriptionService.stopTranscription(sessionId);
  }

  /**
   * 트랜스크립션 언어 변경
   * - 세션 전체 음성 인식 언어 변경 (AWS Chime Transcribe)
   * - 사용자별 번역 타겟 언어도 함께 업데이트
   */
  async changeTranscriptionLanguage(
    sessionId: string,
    languageCode: string,
    userId?: string,
  ) {
    // 세션 레벨 트랜스크립션 언어 변경 + 사용자별 번역 언어 설정
    // userId를 전달하여 사용자별 언어 설정도 함께 저장
    return this.transcriptionService.changeLanguage(
      sessionId,
      languageCode,
      userId,
    );
  }

  async getCurrentTranscriptionLanguage(sessionId: string, userId?: string) {
    // 사용자별 언어 설정이 있으면 반환, 없으면 세션 기본 언어 반환
    if (userId) {
      const userLanguage = await this.translationService.getUserLanguage(
        sessionId,
        userId,
      );
      if (userLanguage) {
        return userLanguage;
      }
    }
    return this.transcriptionService.getCurrentLanguage(sessionId);
  }

  async saveTranscription(dto: SaveTranscriptionDto) {
    return this.transcriptionService.saveTranscription(dto);
  }

  async saveTranscriptionBatch(dto: SaveTranscriptionBatchDto) {
    return this.transcriptionService.saveTranscriptionBatch(dto);
  }

  async flushTranscriptionBuffer(sessionId: string) {
    return this.transcriptionService.flushTranscriptionBuffer(sessionId);
  }

  async getTranscriptionBufferStatus(sessionId: string) {
    return this.transcriptionService.getTranscriptionBufferStatus(sessionId);
  }

  async getTranscriptions(sessionId: string) {
    return this.transcriptionService.getTranscriptions(sessionId);
  }

  async getFinalTranscriptions(sessionId: string) {
    return this.transcriptionService.getFinalTranscriptions(sessionId);
  }

  async getTranscriptionsBySpeaker(sessionId: string) {
    return this.transcriptionService.getTranscriptionsBySpeaker(sessionId);
  }

  async getTranscriptForSummary(sessionId: string) {
    return this.transcriptionService.getTranscriptForSummary(sessionId);
  }

  async cleanupDuplicateTranscriptions() {
    return this.transcriptionService.cleanupDuplicateTranscriptions();
  }

  // ==========================================
  // 요약 기능 (SummaryService 위임)
  // ==========================================

  async getSummary(sessionId: string) {
    return this.summaryService.getSummary(sessionId);
  }

  async regenerateSummary(sessionId: string) {
    return this.summaryService.regenerateSummary(sessionId);
  }

  // ==========================================
  // 번역 기능 (TranslationService 위임)
  // ==========================================

  /**
   * 번역 활성화/비활성화
   */
  async toggleTranslation(sessionId: string, userId: string, enabled: boolean) {
    await this.translationService.setTranslationEnabled(
      sessionId,
      userId,
      enabled,
    );
    return { success: true, enabled };
  }

  /**
   * 번역 상태 조회
   */
  async getTranslationStatus(sessionId: string, userId: string) {
    return this.translationService.getTranslationStatus(sessionId, userId);
  }

  /**
   * 사용자 언어 설정
   */
  async setUserLanguage(
    sessionId: string,
    userId: string,
    languageCode: string,
  ) {
    await this.translationService.setUserLanguage(
      sessionId,
      userId,
      languageCode,
    );
    return { success: true, languageCode };
  }

  /**
   * 세션 참가자 언어 설정 목록
   */
  async getSessionLanguagePreferences(sessionId: string) {
    return this.translationService.getSessionLanguagePreferences(sessionId);
  }
}
