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
      await this.translationService.setUserLanguage(sessionId, userId, newLanguageCode);
      this.logger.log(`[Transcription] User ${userId} language set to ${newLanguageCode}`);
    }

    // NOTE: Chime Transcription은 세션당 하나의 언어만 지원하므로
    // 개인 언어 변경 시 세션 전체 Transcription을 재시작하지 않음
    // (다른 참가자에게 영향을 주지 않기 위해)
    // 
    // 개인 언어 설정은 다음 용도로 사용됨:
    // 1. 발화 시: 이 사용자가 말하는 언어 (sourceLanguage)
    // 2. 수신 시: 이 사용자가 받을 번역 언어 (targetLanguage)

    console.log(`[Transcription] User language set to ${newLanguageCode} for user ${userId} in session ${sessionId}`);

    return {
      success: true,
      languageCode: newLanguageCode,
    };
  }

  /**
   * 세션의 현재 트랜스크립션 언어 조회
   */
  async getCurrentLanguage(sessionId: string): Promise<string> {
    const cached = await this.redisService.get<string>(`transcription:language:${sessionId}`);
    return cached || 'ko-KR'; // 기본값
  }

  // ==========================================
  // 트랜스크립션 저장
  // ==========================================

  async saveTranscription(
    dto: SaveTranscriptionDto,
  ): Promise<{ buffered: boolean; bufferSize: number; flushed?: boolean }> {
    const sessionId = dto.sessionId;
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (dto.isPartial) {
      return { buffered: false, bufferSize: 0 };
    }

    // 참가자 정보 조회 (발화자 userId와 이름을 버퍼에 저장하기 위해)
    const participant = await this.participantRepository.findOne({
      where: { sessionId, chimeAttendeeId: dto.attendeeId },
      relations: ['user'],
    });

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
    this.triggerTranslation(sessionId, dto).catch((err) => {
      this.logger.warn(`Translation trigger failed: ${err.message}`);
    });

    const shouldFlush = await this.shouldAutoFlush(sessionId, bufferSize);

    if (shouldFlush) {
      await this.flushTranscriptionBuffer(sessionId);
      return { buffered: true, bufferSize: 0, flushed: true };
    }

    return { buffered: true, bufferSize };
  }

  /**
   * 번역 트리거 (비동기)
   * Final 트랜스크립션이 저장될 때 호출됨
   */
  private async triggerTranslation(
    sessionId: string,
    dto: SaveTranscriptionDto,
  ): Promise<void> {
    // 발화자 정보 조회
    const participant = await this.participantRepository.findOne({
      where: { sessionId, chimeAttendeeId: dto.attendeeId },
      relations: ['user'],
    });

    if (!participant) {
      this.logger.debug(`Participant not found for attendeeId: ${dto.attendeeId}`);
      return;
    }

    // 세션 시작 시간 조회
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    const sessionStartMs = session?.startedAt?.getTime() || Date.now();

    // 발화자의 언어 설정 조회 (발화자가 설정한 언어 = 발화자가 말하는 언어)
    const speakerLanguage = await this.translationService.getUserLanguage(
      sessionId,
      participant.userId,
    );

    // 번역 요청 생성
    await this.translationService.processTranslation({
      sessionId,
      speakerUserId: participant.userId,
      speakerAttendeeId: dto.attendeeId,
      speakerName: participant.user?.name || '참가자',
      originalText: dto.transcript,
      sourceLanguage: speakerLanguage, // 발화자의 개인 언어 설정 사용
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
  // 버퍼 플러시
  // ==========================================

  private async shouldAutoFlush(
    sessionId: string,
    bufferSize: number,
  ): Promise<boolean> {
    if (bufferSize >= 30) return true;

    if (bufferSize > 0) {
      const lastFlushTime = await this.redisService.getLastFlushTime(sessionId);
      const now = Date.now();
      if (!lastFlushTime || now - lastFlushTime >= 30000) return true;
    }

    return false;
  }

  async flushTranscriptionBuffer(sessionId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return { flushed: 0, success: false };
    }

    const bufferedItems =
      await this.redisService.getFinalTranscriptionsFromBuffer(sessionId);

    if (bufferedItems.length === 0) {
      return { flushed: 0, success: true };
    }

    const participants = await this.participantRepository.find({
      where: { sessionId },
    });
    const attendeeToUserMap = new Map(
      participants.map((p) => [p.chimeAttendeeId, p.userId]),
    );

    const sessionStartMs = session.startedAt?.getTime() || Date.now();

    const transcriptions: Transcription[] = bufferedItems.map((item) => {
      const transcription = new Transcription();
      transcription.sessionId = sessionId;
      transcription.resultId = item.resultId;
      transcription.chimeAttendeeId = item.attendeeId;
      transcription.externalUserId = item.externalUserId;
      // 버퍼에 저장된 userId 우선 사용, 없으면 attendeeId로 조회
      transcription.speakerId = item.userId || attendeeToUserMap.get(item.attendeeId);
      transcription.originalText = item.transcript;
      transcription.languageCode = item.languageCode || 'ko-KR';
      transcription.startTimeMs = item.startTimeMs;
      transcription.endTimeMs = item.endTimeMs;
      transcription.isPartial = false;
      transcription.confidence = item.confidence;
      transcription.isStable = item.isStable || false;
      transcription.relativeStartSec =
        (item.startTimeMs - sessionStartMs) / 1000;
      return transcription;
    });

    try {
      const chunkSize = 100;
      for (let i = 0; i < transcriptions.length; i += chunkSize) {
        const chunk = transcriptions.slice(i, i + chunkSize);
        // upsert로 중복 시 업데이트 (sessionId + resultId unique)
        await this.transcriptionRepository.upsert(chunk, ['sessionId', 'resultId']);
      }

      await this.redisService.clearTranscriptionBuffer(sessionId);
      await this.redisService.setLastFlushTime(sessionId);

      console.log(
        `[Transcription] Flushed ${transcriptions.length} items for session ${sessionId}`,
      );

      return { flushed: transcriptions.length, success: true };
    } catch (error) {
      console.error('[Transcription] Failed to flush buffer:', error);
      return { flushed: 0, success: false };
    }
  }

  async flushAllTranscriptionsOnSessionEnd(sessionId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    const result = await this.flushTranscriptionBuffer(sessionId);
    await this.redisService.clearTranscriptionBuffer(sessionId);
    return result;
  }

  // ==========================================
  // 트랜스크립션 조회
  // ==========================================

  async getTranscriptionBufferStatus(sessionId: string): Promise<{
    bufferSize: number;
    lastFlushTime: number | null;
    timeSinceLastFlush: number | null;
  }> {
    const bufferSize =
      await this.redisService.getTranscriptionBufferSize(sessionId);
    const lastFlushTime = await this.redisService.getLastFlushTime(sessionId);

    return {
      bufferSize,
      lastFlushTime,
      timeSinceLastFlush: lastFlushTime ? Date.now() - lastFlushTime : null,
    };
  }

  async getTranscriptions(sessionId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.find({
      where: { sessionId },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });
  }

  async getFinalTranscriptions(sessionId: string): Promise<any[]> {
    // DB에서 저장된 트랜스크립션 조회
    const dbTranscriptions = await this.transcriptionRepository.find({
      where: { sessionId, isPartial: false },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });

    // Redis 버퍼에서 아직 플러시되지 않은 트랜스크립션 조회
    const bufferedItems = await this.redisService.getFinalTranscriptionsFromBuffer(sessionId);

    // 세션 정보 조회 (시작 시간 계산용)
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    const sessionStartMs = session?.startedAt?.getTime() || Date.now();

    // 참가자 정보 조회
    const participants = await this.participantRepository.find({
      where: { sessionId },
      relations: ['user'],
    });
    const attendeeToUserMap = new Map(
      participants.map((p) => [p.chimeAttendeeId, { id: p.userId, user: p.user }]),
    );

    // 버퍼 데이터를 DB 형식과 유사하게 변환
    const bufferedTranscriptions = bufferedItems.map((item) => {
      // attendeeId로 현재 참가자 조회 (재입장 시 새 attendeeId 발급됨)
      const userInfo = attendeeToUserMap.get(item.attendeeId);
      
      // userId로 직접 참가자 조회 (버퍼에 저장된 userId 사용)
      let speakerUser = userInfo?.user;
      if (!speakerUser && item.userId) {
        const participantByUserId = participants.find(p => p.userId === item.userId);
        speakerUser = participantByUserId?.user;
      }

      return {
        id: `buffer-${item.resultId}`,
        resultId: item.resultId,
        sessionId,
        chimeAttendeeId: item.attendeeId,
        externalUserId: item.externalUserId,
        speakerId: item.userId || userInfo?.id,
        originalText: item.transcript,
        languageCode: item.languageCode || 'ko-KR',
        startTimeMs: item.startTimeMs,
        endTimeMs: item.endTimeMs,
        isPartial: false,
        confidence: item.confidence,
        isStable: item.isStable || false,
        relativeStartSec: (item.startTimeMs - sessionStartMs) / 1000,
        // speaker 정보: user 객체 또는 저장된 이름으로 폴백 객체 생성
        speaker: speakerUser || (item.speakerName ? { name: item.speakerName } : null),
      };
    });

    // DB에 이미 있는 resultId는 제외 (중복 방지)
    const dbResultIds = new Set(dbTranscriptions.map((t) => t.resultId));
    const uniqueBufferedTranscriptions = bufferedTranscriptions.filter(
      (t) => !dbResultIds.has(t.resultId),
    );

    // 합쳐서 시간순 정렬
    const allTranscriptions = [...dbTranscriptions, ...uniqueBufferedTranscriptions];
    allTranscriptions.sort((a, b) => Number(a.startTimeMs) - Number(b.startTimeMs));

    return allTranscriptions;
  }

  async getTranscriptionsBySpeaker(
    sessionId: string,
  ): Promise<Record<string, Transcription[]>> {
    const transcriptions = await this.getFinalTranscriptions(sessionId);
    const grouped: Record<string, Transcription[]> = {};

    for (const t of transcriptions) {
      const speakerKey = t.speakerId || t.chimeAttendeeId || 'unknown';
      if (!grouped[speakerKey]) grouped[speakerKey] = [];
      grouped[speakerKey].push(t);
    }

    return grouped;
  }

  /**
   * 중복 트랜스크립션 삭제 (sessionId + resultId 기준)
   */
  async cleanupDuplicateTranscriptions(): Promise<{
    deletedCount: number;
    success: boolean;
  }> {
    try {
      // 중복 찾기: 같은 sessionId + resultId를 가진 레코드 중 첫 번째를 제외하고 삭제
      const duplicates = await this.transcriptionRepository.query(`
        DELETE FROM transcriptions
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
              ROW_NUMBER() OVER (PARTITION BY "sessionId", "resultId" ORDER BY "createdAt" ASC) as rn
            FROM transcriptions
            WHERE "resultId" IS NOT NULL
          ) t
          WHERE t.rn > 1
        )
        RETURNING id
      `);

      const deletedCount = Array.isArray(duplicates) ? duplicates.length : 0;
      console.log(`[Transcription] Cleaned up ${deletedCount} duplicate transcriptions`);

      return { deletedCount, success: true };
    } catch (error) {
      console.error('[Transcription] Failed to cleanup duplicates:', error);
      return { deletedCount: 0, success: false };
    }
  }

  async getTranscriptForSummary(sessionId: string): Promise<{
    sessionId: string;
    totalDurationMs: number;
    speakers: Array<{ id: string; name: string | null }>;
    transcripts: Array<{
      speakerId: string;
      speakerName: string | null;
      text: string;
      startTimeMs: number;
      endTimeMs: number;
      confidence: number | null;
    }>;
    fullText: string;
  }> {
    const transcriptions = await this.getFinalTranscriptions(sessionId);

    if (transcriptions.length === 0) {
      return {
        sessionId,
        totalDurationMs: 0,
        speakers: [],
        transcripts: [],
        fullText: '',
      };
    }

    const speakersMap = new Map<string, string | null>();
    for (const t of transcriptions) {
      const speakerId = t.speakerId || t.chimeAttendeeId || 'unknown';
      if (!speakersMap.has(speakerId)) {
        speakersMap.set(speakerId, t.speaker?.name || null);
      }
    }

    const speakers = Array.from(speakersMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    const transcripts = transcriptions.map((t) => ({
      speakerId: t.speakerId || t.chimeAttendeeId || 'unknown',
      speakerName: t.speaker?.name || null,
      text: t.originalText,
      startTimeMs: Number(t.startTimeMs),
      endTimeMs: Number(t.endTimeMs),
      confidence: t.confidence ?? null,
    }));

    const fullText = transcriptions.map((t) => t.originalText).join(' ');

    const startTime = Math.min(
      ...transcriptions.map((t) => Number(t.startTimeMs)),
    );
    const endTime = Math.max(
      ...transcriptions.map((t) => Number(t.endTimeMs)),
    );

    return {
      sessionId,
      totalDurationMs: endTime - startTime,
      speakers,
      transcripts,
      fullText,
    };
  }
}
