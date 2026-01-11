import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { MeetingSession } from '../entities/meeting-session.entity';
import { SessionParticipant } from '../entities/session-participant.entity';
import { Transcription } from '../entities/transcription.entity';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from '../dto/save-transcription.dto';
import { RedisService } from '../../redis/redis.service';
import { ChimeService } from './chime.service';
import { TranslationService } from './translation.service';
import { TranscriptionBufferService } from './transcription-buffer.service';
import { TranscriptionQueryService } from './transcription-query.service';
import { WorkspaceGateway } from '../../workspaces/workspace.gateway';
import { CACHE_TTL } from '../../common/constants';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private configService: ConfigService,
    private redisService: RedisService,
    @Inject(forwardRef(() => ChimeService))
    private chimeService: ChimeService,
    @Inject(forwardRef(() => TranslationService))
    private translationService: TranslationService,
    @Inject(forwardRef(() => WorkspaceGateway))
    private workspaceGateway: WorkspaceGateway,
    private transcriptionBufferService: TranscriptionBufferService,
    private transcriptionQueryService: TranscriptionQueryService,
  ) {}

  // ==========================================
  // 트랜스크립션 시작/중지
  // ==========================================

  async startTranscription(
    sessionId: string,
    languageCode: string = 'ko-KR',
  ): Promise<{ success: boolean; sessionId: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (!session.chimeMeetingId) {
      throw new BadRequestException('Chime 세션이 아직 시작되지 않았습니다.');
    }

    await this.chimeService.startSessionTranscription(
      session.chimeMeetingId,
      languageCode,
    );

    return {
      success: true,
      sessionId: session.id,
    };
  }

  async stopTranscription(sessionId: string): Promise<{ success: boolean }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (!session.chimeMeetingId) {
      throw new BadRequestException('Chime 세션이 아직 시작되지 않았습니다.');
    }

    await this.chimeService.stopSessionTranscription(session.chimeMeetingId);

    return { success: true };
  }

  /**
   * 트랜스크립션 언어 변경 (실시간)
   * 현재 트랜스크립션을 중지하고 새 언어로 재시작
   */
  async changeLanguage(
    sessionId: string,
    newLanguageCode: string,
    userId?: string,
  ): Promise<{ success: boolean; languageCode: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (!session.chimeMeetingId) {
      throw new BadRequestException('Chime 세션이 아직 시작되지 않았습니다.');
    }

    // 사용자별 언어 설정 저장 (번역용)
    // 이 설정은 개인의 "말하는 언어" 및 "받을 번역 언어"를 의미
    if (userId) {
      await this.translationService.setUserLanguage(
        sessionId,
        userId,
        newLanguageCode,
      );
      this.logger.log(
        `[Transcription] User ${userId} language set to ${newLanguageCode}`,
      );

      // 참가자 정보 조회 (attendeeId, userName)
      const participant = await this.participantRepository.findOne({
        where: { sessionId, userId },
        relations: ['user'],
      });

      // 세션 참가자들에게 언어 변경 브로드캐스트
      this.workspaceGateway.broadcastLanguageChange(sessionId, {
        type: 'language_changed',
        sessionId,
        userId,
        attendeeId: participant?.chimeAttendeeId,
        userName: participant?.user?.name || 'Participant',
        languageCode: newLanguageCode,
        timestamp: Date.now(),
      });
    }

    // NOTE: Chime Transcription은 세션당 하나의 언어만 지원하므로
    // 개인 언어 변경 시 세션 전체 Transcription을 재시작하지 않음
    // (다른 참가자에게 영향을 주지 않기 위해)
    //
    // 개인 언어 설정은 다음 용도로 사용됨:
    // 1. 발화 시: 이 사용자가 말하는 언어 (sourceLanguage)
    // 2. 수신 시: 이 사용자가 받을 번역 언어 (targetLanguage)

    console.log(
      `[Transcription] User language set to ${newLanguageCode} for user ${userId} in session ${sessionId}`,
    );

    return {
      success: true,
      languageCode: newLanguageCode,
    };
  }

  /**
   * 세션의 현재 트랜스크립션 언어 조회
   */
  async getCurrentLanguage(sessionId: string): Promise<string> {
    const cached = await this.redisService.get<string>(
      `transcription:language:${sessionId}`,
    );
    return cached || 'ko-KR'; // 기본값
  }

  // ==========================================
  // 트랜스크립션 저장
  // ==========================================

  async saveTranscription(dto: SaveTranscriptionDto): Promise<{
    buffered: boolean;
    bufferSize: number;
    flushed?: boolean;
    serverTimestamp?: number;
  }> {
    const sessionId = dto.sessionId;
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    // 세션 정보 캐시에서 조회 (5분 TTL)
    const sessionCacheKey = `session:info:${sessionId}`;
    let session = await this.redisService.get<MeetingSession>(sessionCacheKey);

    if (!session) {
      session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('세션을 찾을 수 없습니다.');
      }

      // 캐시에 저장 (5분 TTL)
      await this.redisService.set(
        sessionCacheKey,
        session,
        CACHE_TTL.SESSION_INFO,
      );
    }

    // 서버 기준 상대 타임스탬프 계산 (모든 클라이언트 동기화용)
    const sessionStartMs = session.startedAt
      ? new Date(session.startedAt).getTime()
      : Date.now();
    const serverTimestamp = Math.max(0, dto.startTimeMs - sessionStartMs);

    // 참가자 정보 캐시에서 조회 (1분 TTL - 참가자 변경 가능성 있음)
    const participantCacheKey = `participant:info:${sessionId}:${dto.attendeeId}`;
    let participant = await this.redisService.get<
      SessionParticipant & {
        user?: { id: string; name: string; profileImage?: string };
      }
    >(participantCacheKey);

    if (!participant) {
      participant = await this.participantRepository.findOne({
        where: { sessionId, chimeAttendeeId: dto.attendeeId },
        relations: ['user'],
      });

      if (participant) {
        // 캐시에 저장 (1분 TTL)
        await this.redisService.set(
          participantCacheKey,
          participant,
          CACHE_TTL.PARTICIPANT_INFO,
        );
      }
    }

    // 모든 세션 참가자에게 트랜스크립트 브로드캐스트 (실시간 동기화)
    // Partial 트랜스크립트도 브로드캐스트하여 실시간 타이핑 효과 제공
    this.workspaceGateway.broadcastNewTranscript(sessionId, {
      type: 'new_transcript',
      resultId: dto.resultId,
      sessionId,
      speakerId: dto.attendeeId,
      speakerUserId: participant?.userId || '',
      speakerName: participant?.user?.name || '참가자',
      speakerProfileImage: participant?.user?.profileImage,
      text: dto.transcript,
      timestamp: serverTimestamp, // 서버 계산 타임스탬프
      isPartial: dto.isPartial,
      languageCode: dto.languageCode || 'ko-KR',
    });

    // Partial 결과는 버퍼에 저장하지 않음
    if (dto.isPartial) {
      return { buffered: false, bufferSize: 0, serverTimestamp };
    }

    const bufferSize = await this.redisService.addTranscriptionToBuffer(
      sessionId,
      {
        resultId: dto.resultId,
        isPartial: dto.isPartial,
        transcript: dto.transcript,
        attendeeId: dto.attendeeId,
        externalUserId: dto.externalUserId,
        startTimeMs: dto.startTimeMs,
        endTimeMs: dto.endTimeMs,
        languageCode: dto.languageCode,
        confidence: dto.confidence,
        isStable: dto.isStable,
        // 발화자 정보 추가 (히스토리 조회 시 사용)
        userId: participant?.userId,
        speakerName: participant?.user?.name || '참가자',
      },
    );

    // 최종 결과에 대해 번역 트리거 (비동기)
    // session과 participant를 전달하여 중복 쿼리 방지
    this.triggerTranslation(sessionId, dto, session, participant).catch(
      (err) => {
        this.logger.warn(`Translation trigger failed: ${err.message}`);
      },
    );

    const shouldFlush = await this.transcriptionBufferService.shouldAutoFlush(
      sessionId,
      bufferSize,
    );

    if (shouldFlush) {
      await this.transcriptionBufferService.flushTranscriptionBuffer(sessionId);
      return { buffered: true, bufferSize: 0, flushed: true, serverTimestamp };
    }

    return { buffered: true, bufferSize, serverTimestamp };
  }

  /**
   * 번역 트리거 (비동기)
   * Final 트랜스크립션이 저장될 때 호출됨
   * @param session - 이미 조회된 세션 (중복 쿼리 방지)
   * @param participant - 이미 조회된 참가자 (중복 쿼리 방지)
   */
  private async triggerTranslation(
    sessionId: string,
    dto: SaveTranscriptionDto,
    session: MeetingSession,
    participant: SessionParticipant | null,
  ): Promise<void> {
    this.logger.log(
      `[Translation Trigger] 🎯 attendeeId=${dto.attendeeId}, dto.languageCode=${dto.languageCode}, transcript="${dto.transcript.substring(0, 30)}..."`,
    );

    if (!participant) {
      this.logger.warn(
        `[Translation Trigger] ⚠️ Participant not found for attendeeId: ${dto.attendeeId}`,
      );
      return;
    }

    this.logger.log(
      `[Translation Trigger] 👤 Participant found: userId=${participant.userId}, name=${participant.user?.name}`,
    );

    // 전달받은 세션에서 시작 시간 사용 (중복 쿼리 제거)
    // Redis 캐시에서 가져온 경우 Date가 문자열로 역직렬화되어 있을 수 있음
    let sessionStartMs: number;
    if (session.startedAt) {
      // Date 객체인 경우와 문자열인 경우 모두 처리
      sessionStartMs =
        typeof session.startedAt === 'string'
          ? new Date(session.startedAt).getTime()
          : session.startedAt.getTime();
    } else {
      sessionStartMs = Date.now();
    }

    // 소스 언어 결정 (우선순위)
    // 1. Chime Transcription이 자동 감지한 언어 (dto.languageCode)
    // 2. 발화자의 개인 언어 설정 (폴백)
    let sourceLanguage = dto.languageCode;

    if (!sourceLanguage) {
      // 자동 감지 실패 시 발화자의 개인 설정 사용
      sourceLanguage = await this.translationService.getUserLanguage(
        sessionId,
        participant.userId,
      );
      this.logger.log(
        `[Translation Trigger] 🌐 Using user language setting: ${sourceLanguage}`,
      );
    } else {
      this.logger.log(
        `[Translation Trigger] 🌐 Using dto.languageCode: ${sourceLanguage}`,
      );
    }

    this.logger.log(
      `[Translation Trigger] ➡️ Calling processTranslation with sourceLanguage=${sourceLanguage}`,
    );

    // 번역 요청 생성
    await this.translationService.processTranslation({
      sessionId,
      speakerUserId: participant.userId,
      speakerAttendeeId: dto.attendeeId,
      speakerName: participant.user?.name || '참가자',
      originalText: dto.transcript,
      sourceLanguage, // 자동 감지된 언어 또는 개인 설정
      resultId: dto.resultId,
      timestamp: dto.startTimeMs - sessionStartMs,
    });
  }

  async saveTranscriptionBatch(dto: SaveTranscriptionBatchDto): Promise<{
    buffered: number;
    totalItems: number;
    flushed: boolean;
  }> {
    let buffered = 0;
    let flushed = false;

    for (const item of dto.transcriptions) {
      const result = await this.saveTranscription({
        ...item,
        sessionId: dto.sessionId,
      });
      if (result.buffered) buffered++;
      if (result.flushed) flushed = true;
    }

    return { buffered, totalItems: dto.transcriptions.length, flushed };
  }

  // ==========================================
  // 버퍼 플러시 (위임)
  // ==========================================

  async flushTranscriptionBuffer(sessionId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    return this.transcriptionBufferService.flushTranscriptionBuffer(sessionId);
  }

  async flushAllTranscriptionsOnSessionEnd(sessionId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    return this.transcriptionBufferService.flushAllTranscriptionsOnSessionEnd(
      sessionId,
    );
  }

  // ==========================================
  // 트랜스크립션 조회 (위임)
  // ==========================================

  async getTranscriptionBufferStatus(sessionId: string): Promise<{
    bufferSize: number;
    lastFlushTime: number | null;
    timeSinceLastFlush: number | null;
  }> {
    return this.transcriptionBufferService.getTranscriptionBufferStatus(
      sessionId,
    );
  }

  async getTranscriptions(sessionId: string): Promise<Transcription[]> {
    return this.transcriptionQueryService.getTranscriptions(sessionId);
  }

  async getFinalTranscriptions(sessionId: string): Promise<any[]> {
    return this.transcriptionQueryService.getFinalTranscriptions(sessionId);
  }

  async getTranscriptionsBySpeaker(
    sessionId: string,
  ): Promise<Record<string, Transcription[]>> {
    return this.transcriptionQueryService.getTranscriptionsBySpeaker(sessionId);
  }

  async cleanupDuplicateTranscriptions(): Promise<{
    deletedCount: number;
    success: boolean;
  }> {
    return this.transcriptionQueryService.cleanupDuplicateTranscriptions();
  }

  async getTranscriptForSummary(sessionId: string): Promise<{
    sessionId: string;
    totalDurationMs: number;
    speakers: Array<{ id: string; name: string | null }>;
    transcripts: Array<{
      resultId: string;
      speakerId: string;
      speakerName: string | null;
      text: string;
      startTimeMs: number;
      endTimeMs: number;
      confidence: number | null;
    }>;
    fullText: string;
  }> {
    return this.transcriptionQueryService.getTranscriptForSummary(sessionId);
  }
}
