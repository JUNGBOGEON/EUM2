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
}
