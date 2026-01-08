import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';
import { Transcription } from './entities/transcription.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from './dto/save-transcription.dto';
import { ChimeService } from './services/chime.service';
import { TranscriptionService } from './services/transcription.service';

/**
 * MeetingsService
 *
 * 미팅 관련 비즈니스 로직을 처리하는 파사드 서비스
 * - 코어 미팅 CRUD 작업은 직접 처리
 * - Chime 관련 작업은 ChimeService에 위임
 * - 트랜스크립션 관련 작업은 TranscriptionService에 위임
 */
@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private chimeService: ChimeService,
    private transcriptionService: TranscriptionService,
  ) {}

  // ==========================================
  // 미팅 CRUD (코어 기능)
  // ==========================================

  /**
   * 미팅 생성
   */
  async createMeeting(
    createMeetingDto: CreateMeetingDto,
    hostId: string,
  ): Promise<Meeting> {
    const externalMeetingId = uuidv4();

    const meeting = new Meeting();
    meeting.title = createMeetingDto.title;
    meeting.description = createMeetingDto.description || '';
    meeting.workspaceId = createMeetingDto.workspaceId;
    meeting.hostId = hostId;
    meeting.externalMeetingId = externalMeetingId;
    meeting.status = MeetingStatus.SCHEDULED;

    if (createMeetingDto.scheduledStartTime) {
      meeting.scheduledStartTime = new Date(createMeetingDto.scheduledStartTime);
    }

    return this.meetingRepository.save(meeting);
  }

  /**
   * 미팅 조회
   */
  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['host', 'participants', 'participants.user', 'workspace'],
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    return meeting;
  }

  /**
   * 워크스페이스별 미팅 목록 조회
   */
  async findByWorkspace(workspaceId: string): Promise<Meeting[]> {
    return this.meetingRepository.find({
      where: { workspaceId },
      relations: ['host', 'participants'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================================
  // Chime 관련 기능 (ChimeService 위임)
  // ==========================================

  async startChimeMeeting(meetingId: string, hostId: string) {
    return this.chimeService.startChimeMeeting(meetingId, hostId);
  }

  async joinMeeting(meetingId: string, userId: string) {
    return this.chimeService.joinMeeting(meetingId, userId);
  }

  async leaveMeeting(meetingId: string, userId: string) {
    return this.chimeService.leaveMeeting(meetingId, userId);
  }

  async endMeeting(meetingId: string, hostId: string) {
    // 트랜스크립션 버퍼 플러시 후 미팅 종료
    const flushResult =
      await this.transcriptionService.flushAllTranscriptionsOnMeetingEnd(meetingId);
    console.log(
      `[Meeting End] Flushed ${flushResult.flushed} transcriptions for meeting ${meetingId}`,
    );

    return this.chimeService.endMeeting(meetingId, hostId);
  }

  async getParticipants(meetingId: string) {
    return this.chimeService.getParticipants(meetingId);
  }

  async getMeetingInfo(meetingId: string) {
    return this.chimeService.getMeetingInfo(meetingId);
  }

  // ==========================================
  // 트랜스크립션 기능 (TranscriptionService 위임)
  // ==========================================

  async startTranscription(meetingId: string, languageCode?: string) {
    return this.transcriptionService.startTranscription(meetingId, languageCode);
  }

  async stopTranscription(meetingId: string) {
    return this.transcriptionService.stopTranscription(meetingId);
  }

  async saveTranscription(dto: SaveTranscriptionDto) {
    return this.transcriptionService.saveTranscription(dto);
  }

  async saveTranscriptionBatch(dto: SaveTranscriptionBatchDto) {
    return this.transcriptionService.saveTranscriptionBatch(dto);
  }

  async flushTranscriptionBuffer(meetingId: string) {
    return this.transcriptionService.flushTranscriptionBuffer(meetingId);
  }

  async getTranscriptionBufferStatus(meetingId: string) {
    return this.transcriptionService.getTranscriptionBufferStatus(meetingId);
  }

  async getTranscriptions(meetingId: string) {
    return this.transcriptionService.getTranscriptions(meetingId);
  }

  async getFinalTranscriptions(meetingId: string) {
    return this.transcriptionService.getFinalTranscriptions(meetingId);
  }

  async getTranscriptionsBySpeaker(meetingId: string) {
    return this.transcriptionService.getTranscriptionsBySpeaker(meetingId);
  }

  async getTranscriptForSummary(meetingId: string) {
    return this.transcriptionService.getTranscriptForSummary(meetingId);
  }
}
