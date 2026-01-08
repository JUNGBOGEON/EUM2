import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Meeting } from '../entities/meeting.entity';
import { MeetingParticipant } from '../entities/meeting-participant.entity';
import { Transcription } from '../entities/transcription.entity';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from '../dto/save-transcription.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TranscriptionService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // ==========================================
  // 트랜스크립션 시작/중지
  // ==========================================

  /**
   * 트랜스크립션 시작 (Presigned URL 반환)
   */
  async startTranscription(
    meetingId: string,
    languageCode: string = 'ko-KR',
  ): Promise<{ presignedUrl: string; meetingId: string }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    // AWS Transcribe Streaming Presigned URL 생성
    const presignedUrl = this.createTranscribePresignedUrl(languageCode);

    return {
      presignedUrl,
      meetingId: meeting.id,
    };
  }

  /**
   * 트랜스크립션 중지
   */
  async stopTranscription(meetingId: string): Promise<{ success: boolean }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    // 프론트엔드에서 WebSocket 연결 종료 처리
    // 백엔드에서는 별도 처리 필요 없음
    return { success: true };
  }

  // ==========================================
  // Presigned URL 생성
  // ==========================================

  /**
   * AWS Transcribe Streaming용 Presigned URL 생성
   * AWS Signature V4를 사용하여 WebSocket 연결에 필요한 인증된 URL 생성
   */
  private createTranscribePresignedUrl(
    languageCode: string = 'ko-KR',
    sampleRate: number = 16000,
  ): string {
    const region = this.configService.get('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY') || '';

    const service = 'transcribe';
    // Host에 포트 포함 (AWS Transcribe Streaming 요구사항)
    const host = `transcribestreaming.${region}.amazonaws.com:8443`;
    const path = '/stream-transcription-websocket';

    // 현재 시간 (UTC)
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Credential scope
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const algorithm = 'AWS4-HMAC-SHA256';

    // 모든 쿼리 파라미터 (X-Amz-Signature 제외, 정렬 필요)
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '300',
      'X-Amz-SignedHeaders': 'host',
      'language-code': languageCode,
      'media-encoding': 'pcm',
      'sample-rate': sampleRate.toString(),
    };

    // Canonical query string (정렬된 순서, URL 인코딩)
    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`,
      )
      .join('&');

    // Canonical headers (host에 포트 포함)
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    // Payload hash (빈 문자열의 SHA256)
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');

    // Canonical request
    const canonicalRequest = [
      'GET',
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Signing key 생성
    const getSignatureKey = (
      key: string,
      dateStamp: string,
      regionName: string,
      serviceName: string,
    ): Buffer => {
      const kDate = crypto
        .createHmac('sha256', `AWS4${key}`)
        .update(dateStamp)
        .digest();
      const kRegion = crypto
        .createHmac('sha256', kDate)
        .update(regionName)
        .digest();
      const kService = crypto
        .createHmac('sha256', kRegion)
        .update(serviceName)
        .digest();
      const kSigning = crypto
        .createHmac('sha256', kService)
        .update('aws4_request')
        .digest();
      return kSigning;
    };

    const signingKey = getSignatureKey(
      secretAccessKey,
      dateStamp,
      region,
      service,
    );
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    // Presigned URL 조합 (쿼리 파라미터 + 서명)
    const presignedUrl =
      `wss://${host}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return presignedUrl;
  }

  // ==========================================
  // 트랜스크립션 저장 (Redis 버퍼링)
  // ==========================================

  /**
   * 트랜스크립션 저장 (Redis 버퍼에 추가)
   */
  async saveTranscription(
    dto: SaveTranscriptionDto,
  ): Promise<{ buffered: boolean; bufferSize: number; flushed?: boolean }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: dto.meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    // 최종 결과만 버퍼에 저장 (부분 결과는 무시하여 저장 효율화)
    if (dto.isPartial) {
      return { buffered: false, bufferSize: 0 };
    }

    // Redis 버퍼에 추가
    const bufferSize = await this.redisService.addTranscriptionToBuffer(
      dto.meetingId,
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
      },
    );

    // 자동 플러시 조건 확인 (30개 이상 또는 30초 경과)
    const shouldFlush = await this.shouldAutoFlush(dto.meetingId, bufferSize);

    if (shouldFlush) {
      await this.flushTranscriptionBuffer(dto.meetingId);
      return { buffered: true, bufferSize: 0, flushed: true };
    }

    return { buffered: true, bufferSize };
  }

  /**
   * 트랜스크립션 일괄 저장
   */
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
        meetingId: dto.meetingId,
      });
      if (result.buffered) {
        buffered++;
      }
      if (result.flushed) {
        flushed = true;
      }
    }

    return {
      buffered,
      totalItems: dto.transcriptions.length,
      flushed,
    };
  }

  // ==========================================
  // 버퍼 플러시
  // ==========================================

  /**
   * 자동 플러시 조건 확인
   */
  private async shouldAutoFlush(
    meetingId: string,
    bufferSize: number,
  ): Promise<boolean> {
    // 버퍼 크기 조건
    if (bufferSize >= 30) {
      return true;
    }

    // 시간 조건 (버퍼에 데이터가 있을 때만)
    if (bufferSize > 0) {
      const lastFlushTime = await this.redisService.getLastFlushTime(meetingId);
      const now = Date.now();

      if (!lastFlushTime || now - lastFlushTime >= 30000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Redis 버퍼를 DB에 일괄 저장
   */
  async flushTranscriptionBuffer(meetingId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { flushed: 0, success: false };
    }

    // 최종 결과만 가져오기
    const bufferedItems =
      await this.redisService.getFinalTranscriptionsFromBuffer(meetingId);

    if (bufferedItems.length === 0) {
      return { flushed: 0, success: true };
    }

    // 참가자 정보 미리 조회 (N+1 쿼리 방지)
    const participants = await this.participantRepository.find({
      where: { meetingId },
    });
    const attendeeToUserMap = new Map(
      participants.map((p) => [p.chimeAttendeeId, p.userId]),
    );

    // 미팅 시작 시간
    const meetingStartMs = meeting.startedAt?.getTime() || Date.now();

    // 배치 엔티티 생성
    const transcriptions: Transcription[] = bufferedItems.map((item) => {
      const transcription = new Transcription();
      transcription.meetingId = meetingId;
      transcription.resultId = item.resultId;
      transcription.chimeAttendeeId = item.attendeeId;
      transcription.externalUserId = item.externalUserId;
      transcription.speakerId = attendeeToUserMap.get(item.attendeeId);
      transcription.originalText = item.transcript;
      transcription.languageCode = item.languageCode || 'ko-KR';
      transcription.startTimeMs = item.startTimeMs;
      transcription.endTimeMs = item.endTimeMs;
      transcription.isPartial = false;
      transcription.confidence = item.confidence;
      transcription.isStable = item.isStable || false;
      transcription.relativeStartSec =
        (item.startTimeMs - meetingStartMs) / 1000;
      return transcription;
    });

    try {
      // 배치 insert (청크 단위로 분할하여 저장)
      const chunkSize = 100;
      for (let i = 0; i < transcriptions.length; i += chunkSize) {
        const chunk = transcriptions.slice(i, i + chunkSize);
        await this.transcriptionRepository.insert(chunk);
      }

      // 버퍼 초기화 및 플러시 시간 기록
      await this.redisService.clearTranscriptionBuffer(meetingId);
      await this.redisService.setLastFlushTime(meetingId);

      console.log(
        `[Transcription] Flushed ${transcriptions.length} items for meeting ${meetingId}`,
      );

      return { flushed: transcriptions.length, success: true };
    } catch (error) {
      console.error('[Transcription] Failed to flush buffer:', error);
      return { flushed: 0, success: false };
    }
  }

  /**
   * 회의 종료 시 남은 버퍼 모두 저장
   */
  async flushAllTranscriptionsOnMeetingEnd(meetingId: string): Promise<{
    flushed: number;
    success: boolean;
  }> {
    const result = await this.flushTranscriptionBuffer(meetingId);

    // 버퍼 정리
    await this.redisService.clearTranscriptionBuffer(meetingId);

    return result;
  }

  // ==========================================
  // 트랜스크립션 조회
  // ==========================================

  /**
   * 트랜스크립션 버퍼 상태 조회
   */
  async getTranscriptionBufferStatus(meetingId: string): Promise<{
    bufferSize: number;
    lastFlushTime: number | null;
    timeSinceLastFlush: number | null;
  }> {
    const bufferSize =
      await this.redisService.getTranscriptionBufferSize(meetingId);
    const lastFlushTime = await this.redisService.getLastFlushTime(meetingId);

    return {
      bufferSize,
      lastFlushTime,
      timeSinceLastFlush: lastFlushTime ? Date.now() - lastFlushTime : null,
    };
  }

  /**
   * 미팅 트랜스크립션 조회
   */
  async getTranscriptions(meetingId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.find({
      where: { meetingId },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });
  }

  /**
   * 최종 트랜스크립션만 조회 (isPartial = false)
   */
  async getFinalTranscriptions(meetingId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.find({
      where: { meetingId, isPartial: false },
      order: { startTimeMs: 'ASC' },
      relations: ['speaker'],
    });
  }

  /**
   * 발화자별 트랜스크립션 그룹화 조회
   */
  async getTranscriptionsBySpeaker(
    meetingId: string,
  ): Promise<Record<string, Transcription[]>> {
    const transcriptions = await this.getFinalTranscriptions(meetingId);

    const grouped: Record<string, Transcription[]> = {};

    for (const t of transcriptions) {
      const speakerKey = t.speakerId || t.chimeAttendeeId || 'unknown';
      if (!grouped[speakerKey]) {
        grouped[speakerKey] = [];
      }
      grouped[speakerKey].push(t);
    }

    return grouped;
  }

  /**
   * AI 요약용 트랜스크립트 조회
   */
  async getTranscriptForSummary(meetingId: string): Promise<{
    meetingId: string;
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
    const transcriptions = await this.getFinalTranscriptions(meetingId);

    if (transcriptions.length === 0) {
      return {
        meetingId,
        totalDurationMs: 0,
        speakers: [],
        transcripts: [],
        fullText: '',
      };
    }

    // 고유 발화자 추출
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

    // 트랜스크립트 정리
    const transcripts = transcriptions.map((t) => ({
      speakerId: t.speakerId || t.chimeAttendeeId || 'unknown',
      speakerName: t.speaker?.name || null,
      text: t.originalText,
      startTimeMs: Number(t.startTimeMs),
      endTimeMs: Number(t.endTimeMs),
      confidence: t.confidence ?? null,
    }));

    // 전체 텍스트 (시간순으로 연결)
    const fullText = transcriptions.map((t) => t.originalText).join(' ');

    // 총 시간
    const startTime = Math.min(...transcriptions.map((t) => Number(t.startTimeMs)));
    const endTime = Math.max(...transcriptions.map((t) => Number(t.endTimeMs)));

    return {
      meetingId,
      totalDurationMs: endTime - startTime,
      speakers,
      transcripts,
      fullText,
    };
  }
}
