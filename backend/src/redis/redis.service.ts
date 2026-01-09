import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // 미팅 세션 정보 저장
  async setMeetingSession(
    meetingId: string,
    data: {
      chimeMeetingId: string;
      mediaPlacement: any;
      participants: string[];
    },
  ): Promise<void> {
    await this.cacheManager.set(
      `meeting:${meetingId}`,
      JSON.stringify(data),
      60 * 60 * 1000, // 1 hour
    );
  }

  // 미팅 세션 정보 조회
  async getMeetingSession(meetingId: string): Promise<{
    chimeMeetingId: string;
    mediaPlacement: any;
    participants: string[];
  } | null> {
    const data = await this.cacheManager.get<string>(`meeting:${meetingId}`);
    return data ? JSON.parse(data) : null;
  }

  // 미팅 세션 삭제
  async deleteMeetingSession(meetingId: string): Promise<void> {
    await this.cacheManager.del(`meeting:${meetingId}`);
  }

  // 참가자 추가
  async addParticipant(meetingId: string, participantId: string): Promise<void> {
    const session = await this.getMeetingSession(meetingId);
    if (session) {
      if (!session.participants.includes(participantId)) {
        session.participants.push(participantId);
        await this.setMeetingSession(meetingId, session);
      }
    }
  }

  // 참가자 제거
  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    const session = await this.getMeetingSession(meetingId);
    if (session) {
      session.participants = session.participants.filter((p) => p !== participantId);
      await this.setMeetingSession(meetingId, session);
    }
  }

  // 활성 참가자 수 조회
  async getActiveParticipantCount(meetingId: string): Promise<number> {
    const session = await this.getMeetingSession(meetingId);
    return session ? session.participants.length : 0;
  }

  // 일반 캐시 작업
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<string>(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, JSON.stringify(value), ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }


  // ==========================================
  // 트랜스크립션 버퍼 관리
  // ==========================================

  /**
   * 트랜스크립션을 Redis 버퍼에 추가
   * List 구조로 저장하여 순서 보장
   */
  async addTranscriptionToBuffer(
    meetingId: string,
    transcription: {
      resultId: string;
      isPartial: boolean;
      transcript: string;
      attendeeId: string;
      externalUserId?: string;
      startTimeMs: number;
      endTimeMs: number;
      languageCode?: string;
      confidence?: number;
      isStable?: boolean;
      userId?: string;        // 발화자 userId (히스토리 조회용)
      speakerName?: string;   // 발화자 이름 (폴백용)
    },
  ): Promise<number> {
    const key = `transcription:buffer:${meetingId}`;
    const existingBuffer = await this.getTranscriptionBuffer(meetingId);

    // 같은 resultId가 있으면 업데이트 (부분 결과 → 최종 결과)
    const existingIndex = existingBuffer.findIndex(
      (t) => t.resultId === transcription.resultId,
    );

    if (existingIndex >= 0) {
      existingBuffer[existingIndex] = transcription;
    } else {
      existingBuffer.push(transcription);
    }

    // 버퍼 저장 (2시간 TTL)
    await this.cacheManager.set(
      key,
      JSON.stringify(existingBuffer),
      2 * 60 * 60 * 1000,
    );

    return existingBuffer.length;
  }

  /**
   * 미팅의 트랜스크립션 버퍼 조회
   */
  async getTranscriptionBuffer(meetingId: string): Promise<
    Array<{
      resultId: string;
      isPartial: boolean;
      transcript: string;
      attendeeId: string;
      externalUserId?: string;
      startTimeMs: number;
      endTimeMs: number;
      languageCode?: string;
      confidence?: number;
      isStable?: boolean;
      userId?: string;
      speakerName?: string;
    }>
  > {
    const key = `transcription:buffer:${meetingId}`;
    const data = await this.cacheManager.get<string>(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * 최종 결과만 필터링하여 조회 (isPartial = false)
   */
  async getFinalTranscriptionsFromBuffer(meetingId: string): Promise<
    Array<{
      resultId: string;
      isPartial: boolean;
      transcript: string;
      attendeeId: string;
      externalUserId?: string;
      startTimeMs: number;
      endTimeMs: number;
      languageCode?: string;
      confidence?: number;
      isStable?: boolean;
      userId?: string;
      speakerName?: string;
    }>
  > {
    const buffer = await this.getTranscriptionBuffer(meetingId);
    return buffer.filter((t) => !t.isPartial);
  }

  /**
   * 트랜스크립션 버퍼 삭제
   */
  async clearTranscriptionBuffer(meetingId: string): Promise<void> {
    const key = `transcription:buffer:${meetingId}`;
    await this.cacheManager.del(key);
  }

  /**
   * 버퍼 크기 조회
   */
  async getTranscriptionBufferSize(meetingId: string): Promise<number> {
    const buffer = await this.getTranscriptionBuffer(meetingId);
    return buffer.length;
  }

  /**
   * 마지막 플러시 타임스탬프 저장
   */
  async setLastFlushTime(meetingId: string): Promise<void> {
    const key = `transcription:lastFlush:${meetingId}`;
    await this.cacheManager.set(
      key,
      JSON.stringify(Date.now()),
      2 * 60 * 60 * 1000,
    );
  }

  /**
   * 마지막 플러시 타임스탬프 조회
   */
  async getLastFlushTime(meetingId: string): Promise<number | null> {
    const key = `transcription:lastFlush:${meetingId}`;
    const data = await this.cacheManager.get<string>(key);
    return data ? JSON.parse(data) : null;
  }
}
