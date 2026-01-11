import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MeetingSession } from '../entities/meeting-session.entity';
import { SessionParticipant } from '../entities/session-participant.entity';
import { Transcription } from '../entities/transcription.entity';
import { RedisService } from '../../redis/redis.service';
import { BUFFER_CONFIG } from '../../common/constants';

@Injectable()
export class TranscriptionBufferService {
  private readonly logger = new Logger(TranscriptionBufferService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private redisService: RedisService,
  ) {}

  /**
   * 자동 플러시 조건 확인
   */
  async shouldAutoFlush(
    sessionId: string,
    bufferSize: number,
  ): Promise<boolean> {
    if (bufferSize >= BUFFER_CONFIG.TRANSCRIPTION_FLUSH_SIZE) return true;

    if (bufferSize > 0) {
      const lastFlushTime = await this.redisService.getLastFlushTime(sessionId);
      const now = Date.now();
      if (
        !lastFlushTime ||
        now - lastFlushTime >= BUFFER_CONFIG.TRANSCRIPTION_FLUSH_INTERVAL
      )
        return true;
    }

    return false;
  }

  /**
   * 트랜스크립션 버퍼 플러시
   */
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

    // Redis 캐시에서 가져온 경우 Date가 문자열로 역직렬화되어 있을 수 있음
    const sessionStartMs = session.startedAt
      ? typeof session.startedAt === 'string'
        ? new Date(session.startedAt).getTime()
        : session.startedAt.getTime()
      : Date.now();

    const transcriptions: Transcription[] = bufferedItems.map((item) => {
      const transcription = new Transcription();
      transcription.sessionId = sessionId;
      transcription.resultId = item.resultId;
      transcription.chimeAttendeeId = item.attendeeId;
      transcription.externalUserId = item.externalUserId;
      // 버퍼에 저장된 userId 우선 사용, 없으면 attendeeId로 조회
      transcription.speakerId =
        item.userId || attendeeToUserMap.get(item.attendeeId);
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
      const chunkSize = BUFFER_CONFIG.CHUNK_SIZE;
      for (let i = 0; i < transcriptions.length; i += chunkSize) {
        const chunk = transcriptions.slice(i, i + chunkSize);
        // upsert로 중복 시 업데이트 (sessionId + resultId unique)
        await this.transcriptionRepository.upsert(chunk, [
          'sessionId',
          'resultId',
        ]);
      }

      await this.redisService.clearTranscriptionBuffer(sessionId);
      await this.redisService.setLastFlushTime(sessionId);

      this.logger.log(
        `Flushed ${transcriptions.length} items for session ${sessionId}`,
      );

      return { flushed: transcriptions.length, success: true };
    } catch (error) {
      this.logger.error('Failed to flush buffer:', error);
      return { flushed: 0, success: false };
    }
  }

  /**
   * 세션 종료 시 모든 트랜스크립션 플러시
   */
  async flushAllTranscriptionsOnSessionEnd(sessionId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    const result = await this.flushTranscriptionBuffer(sessionId);
    await this.redisService.clearTranscriptionBuffer(sessionId);
    return result;
  }

  /**
   * 버퍼 상태 조회
   */
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
}
