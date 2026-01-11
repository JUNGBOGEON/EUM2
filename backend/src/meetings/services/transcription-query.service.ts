import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MeetingSession } from '../entities/meeting-session.entity';
import { SessionParticipant } from '../entities/session-participant.entity';
import { Transcription } from '../entities/transcription.entity';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TranscriptionQueryService {
  private readonly logger = new Logger(TranscriptionQueryService.name);

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
   * 세션의 모든 트랜스크립션 조회
   */
  async getTranscriptions(sessionId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.find({
      where: { sessionId },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });
  }

  /**
   * 세션의 최종(non-partial) 트랜스크립션 조회
   * DB와 Redis 버퍼를 모두 조회하여 병합
   */
  async getFinalTranscriptions(sessionId: string): Promise<any[]> {
    // DB에서 저장된 트랜스크립션 조회
    const dbTranscriptions = await this.transcriptionRepository.find({
      where: { sessionId, isPartial: false },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });

    // Redis 버퍼에서 아직 플러시되지 않은 트랜스크립션 조회
    const bufferedItems =
      await this.redisService.getFinalTranscriptionsFromBuffer(sessionId);

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
      participants.map((p) => [
        p.chimeAttendeeId,
        { id: p.userId, user: p.user },
      ]),
    );

    // 버퍼 데이터를 DB 형식과 유사하게 변환
    const bufferedTranscriptions = bufferedItems.map((item) => {
      // attendeeId로 현재 참가자 조회 (재입장 시 새 attendeeId 발급됨)
      const userInfo = attendeeToUserMap.get(item.attendeeId);

      // userId로 직접 참가자 조회 (버퍼에 저장된 userId 사용)
      let speakerUser = userInfo?.user;
      if (!speakerUser && item.userId) {
        const participantByUserId = participants.find(
          (p) => p.userId === item.userId,
        );
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
        speaker:
          speakerUser || (item.speakerName ? { name: item.speakerName } : null),
      };
    });

    // DB에 이미 있는 resultId는 제외 (중복 방지)
    const dbResultIds = new Set(dbTranscriptions.map((t) => t.resultId));
    const uniqueBufferedTranscriptions = bufferedTranscriptions.filter(
      (t) => !dbResultIds.has(t.resultId),
    );

    // 합쳐서 시간순 정렬
    const allTranscriptions = [
      ...dbTranscriptions,
      ...uniqueBufferedTranscriptions,
    ];
    allTranscriptions.sort(
      (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
    );

    return allTranscriptions;
  }

  /**
   * 발화자별로 그룹화된 트랜스크립션 조회
   */
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
      this.logger.log(`Cleaned up ${deletedCount} duplicate transcriptions`);

      return { deletedCount, success: true };
    } catch (error) {
      this.logger.error('Failed to cleanup duplicates:', error);
      return { deletedCount: 0, success: false };
    }
  }

  /**
   * 요약 생성을 위한 트랜스크립트 데이터 조회
   */
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

    const transcripts = transcriptions.map((t, idx) => ({
      resultId: t.resultId || `t-${idx}`,
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
    const endTime = Math.max(...transcriptions.map((t) => Number(t.endTimeMs)));

    return {
      sessionId,
      totalDurationMs: endTime - startTime,
      speakers,
      transcripts,
      fullText,
    };
  }
}
