import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MeetingSession } from './entities/meeting-session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Transcription } from './entities/transcription.entity';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from './dto/save-transcription.dto';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';
import { SummaryService } from './services/summary.service';

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
  ) {}

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
   */
  async endSession(sessionId: string, hostId: string) {
    // 트랜스크립션 버퍼 플러시 후 세션 종료
    const flushResult =
      await this.transcriptionService.flushAllTranscriptionsOnSessionEnd(sessionId);
    this.logger.log(
      `[Session End] Flushed ${flushResult.flushed} transcriptions for session ${sessionId}`,
    );

    const session = await this.chimeService.endSession(sessionId, hostId);

    // 요약 생성 (비동기 - 세션 종료 응답을 블로킹하지 않음)
    this.summaryService.generateAndSaveSummary(sessionId).catch((err) => {
      this.logger.error(`[Summary] Failed to generate summary for ${sessionId}:`, err);
    });

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

  // ==========================================
  // 트랜스크립션 기능 (TranscriptionService 위임)
  // ==========================================

  async startTranscription(sessionId: string, languageCode?: string) {
    return this.transcriptionService.startTranscription(sessionId, languageCode);
  }

  async stopTranscription(sessionId: string) {
    return this.transcriptionService.stopTranscription(sessionId);
  }

  async changeTranscriptionLanguage(sessionId: string, languageCode: string) {
    return this.transcriptionService.changeLanguage(sessionId, languageCode);
  }

  async getCurrentTranscriptionLanguage(sessionId: string) {
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

  // ==========================================
  // 요약 기능 (SummaryService 위임)
  // ==========================================

  async getSummary(sessionId: string) {
    return this.summaryService.getSummary(sessionId);
  }

  async regenerateSummary(sessionId: string) {
    return this.summaryService.regenerateSummary(sessionId);
  }
}
