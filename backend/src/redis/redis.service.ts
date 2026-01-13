import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

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
  async addParticipant(
    meetingId: string,
    participantId: string,
  ): Promise<void> {
    const session = await this.getMeetingSession(meetingId);
    if (session) {
      if (!session.participants.includes(participantId)) {
        session.participants.push(participantId);
        await this.setMeetingSession(meetingId, session);
      }
    }
  }

  // 참가자 제거
  async removeParticipant(
    meetingId: string,
    participantId: string,
  ): Promise<void> {
    const session = await this.getMeetingSession(meetingId);
    if (session) {
      session.participants = session.participants.filter(
        (p) => p !== participantId,
      );
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
      userId?: string; // 발화자 userId (히스토리 조회용)
      speakerName?: string; // 발화자 이름 (폴백용)
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
  // ==========================================
  // 화이트보드 데이터 관리
  // ==========================================

  /**
   * 화이트보드 아이템 추가 (Append)
   * Redis Key: whiteboard:items:{meetingId} -> List of JSON strings? Or one huge JSON array?
   * For simplicity and atomicity with cache-manager's simpler API, we will read-modify-write the full array
   * or usage a specific redis command if possible. 
   * Given the constraints, we will store the items as a single JSON array for now. 
   * Optimization: In a high-traffic scenario, we should use a Hash or List structure directly.
   */
  async addWhiteboardItem(meetingId: string, item: any): Promise<void> {
    const key = `whiteboard:items:${meetingId}`;
    // TODO: Lock or atomic operation would be better, but for MVP we assume low race condition probability on single item append
    const items = (await this.get<any[]>(key)) || [];
    items.push(item);
    // 24 hours TTL for whiteboard data
    await this.set(key, items, 24 * 60 * 60 * 1000);
  }

  async getWhiteboardItems(meetingId: string): Promise<any[]> {
    const key = `whiteboard:items:${meetingId}`;
    return (await this.get<any[]>(key)) || [];
  }

  async updateWhiteboardItem(meetingId: string, itemId: string, updateData: any): Promise<void> {
    const key = `whiteboard:items:${meetingId}`;
    const items = (await this.get<any[]>(key)) || [];
    const index = items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      items[index] = { ...items[index], ...updateData };
      await this.set(key, items, 24 * 60 * 60 * 1000);
    }
  }

  async removeWhiteboardItem(meetingId: string, itemId: string): Promise<void> {
    const key = `whiteboard:items:${meetingId}`;
    let items = (await this.get<any[]>(key)) || [];
    // Soft delete or hard delete? The repo uses soft delete (isDeleted=true).
    // optimizing: actually remove from redis if we want to save space, OR mark isDeleted.
    // Let's mark isDeleted to match DB logic.
    const index = items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      items[index].isDeleted = true;
      await this.set(key, items, 24 * 60 * 60 * 1000);
    }
  }

  async clearWhiteboardItems(meetingId: string): Promise<void> {
    const key = `whiteboard:items:${meetingId}`;
    await this.del(key);
  }
}
