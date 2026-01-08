import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  DeleteAttendeeCommand,
  GetMeetingCommand,
  StartMeetingTranscriptionCommand,
  StopMeetingTranscriptionCommand,
  TranscribeLanguageCode,
  TranscriptionConfiguration,
} from '@aws-sdk/client-chime-sdk-meetings';
import { v4 as uuidv4 } from 'uuid';

import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { MeetingParticipant, ParticipantRole } from './entities/meeting-participant.entity';
import { Transcription } from './entities/transcription.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MeetingsService {
  private chimeClient: ChimeSDKMeetingsClient;

  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(Transcription)
    private transcriptionRepository: Repository<Transcription>,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.chimeClient = new ChimeSDKMeetingsClient({
      region: this.configService.get('CHIME_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  // 미팅 생성 및 Chime Meeting 시작
  async createMeeting(createMeetingDto: CreateMeetingDto, hostId: string): Promise<Meeting> {
    const externalMeetingId = uuidv4();

    // 1. DB에 미팅 레코드 생성
    const meeting = new Meeting();
    meeting.title = createMeetingDto.title;
    meeting.description = createMeetingDto.description || '';
    meeting.workspaceId = createMeetingDto.workspaceId;
    meeting.hostId = hostId;
    meeting.externalMeetingId = externalMeetingId;
    if (createMeetingDto.scheduledStartTime) {
      meeting.scheduledStartTime = new Date(createMeetingDto.scheduledStartTime);
    }
    meeting.status = MeetingStatus.SCHEDULED;

    return this.meetingRepository.save(meeting);
  }

  // Chime 미팅 시작 (실제 미팅 활성화)
  async startChimeMeeting(meetingId: string, hostId: string): Promise<{
    meeting: Meeting;
    attendee: {
      attendeeId: string;
      joinToken: string;
    };
  }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    if (meeting.hostId !== hostId) {
      throw new BadRequestException('미팅 호스트만 미팅을 시작할 수 있습니다.');
    }

    // AWS Chime Meeting 생성
    const createMeetingCommand = new CreateMeetingCommand({
      ClientRequestToken: meeting.externalMeetingId,
      ExternalMeetingId: meeting.externalMeetingId,
      MediaRegion: this.configService.get('CHIME_REGION') || 'ap-northeast-2',
      MeetingFeatures: {
        Audio: {
          EchoReduction: 'AVAILABLE',
        },
        Video: {
          MaxResolution: 'FHD',
        },
        Content: {
          MaxResolution: 'FHD',
        },
        Attendee: {
          MaxCount: 10,
        },
      },
    });

    const chimeMeetingResponse = await this.chimeClient.send(createMeetingCommand);
    const chimeMeeting = chimeMeetingResponse.Meeting;

    if (!chimeMeeting) {
      throw new BadRequestException('Chime 미팅 생성에 실패했습니다.');
    }

    // 미팅 정보 업데이트
    meeting.chimeMeetingId = chimeMeeting.MeetingId;
    meeting.mediaPlacement = chimeMeeting.MediaPlacement as Record<string, any>;
    meeting.mediaRegion = chimeMeeting.MediaRegion;
    meeting.status = MeetingStatus.ACTIVE;
    meeting.startedAt = new Date();

    await this.meetingRepository.save(meeting);

    // 호스트를 첫 번째 참가자로 추가
    const attendee = await this.addAttendee(meeting, hostId, ParticipantRole.HOST);

    // Redis에 세션 정보 캐싱
    await this.redisService.setMeetingSession(meetingId, {
      chimeMeetingId: chimeMeeting.MeetingId!,
      mediaPlacement: chimeMeeting.MediaPlacement,
      participants: [hostId],
    });

    return {
      meeting,
      attendee: {
        attendeeId: attendee.chimeAttendeeId!,
        joinToken: attendee.joinToken!,
      },
    };
  }

  // 미팅 참가
  async joinMeeting(meetingId: string, userId: string): Promise<{
    meeting: Meeting;
    attendee: {
      attendeeId: string;
      joinToken: string;
    };
  }> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    if (meeting.status !== MeetingStatus.ACTIVE) {
      throw new BadRequestException('미팅이 아직 시작되지 않았습니다.');
    }

    // 이미 참가자인지 확인
    let participant = await this.participantRepository.findOne({
      where: { meetingId, userId },
    });

    if (participant && participant.chimeAttendeeId) {
      // 이미 참가한 경우, 기존 정보 반환
      return {
        meeting,
        attendee: {
          attendeeId: participant.chimeAttendeeId,
          joinToken: participant.joinToken!,
        },
      };
    }

    // 새 참가자 추가
    const attendee = await this.addAttendee(meeting, userId, ParticipantRole.PARTICIPANT);

    // Redis 세션 업데이트
    await this.redisService.addParticipant(meetingId, userId);

    return {
      meeting,
      attendee: {
        attendeeId: attendee.chimeAttendeeId!,
        joinToken: attendee.joinToken!,
      },
    };
  }

  // Chime Attendee 추가
  private async addAttendee(
    meeting: Meeting,
    userId: string,
    role: ParticipantRole,
  ): Promise<MeetingParticipant> {
    const externalUserId = `${userId}-${Date.now()}`;

    const createAttendeeCommand = new CreateAttendeeCommand({
      MeetingId: meeting.chimeMeetingId!,
      ExternalUserId: externalUserId,
    });

    const attendeeResponse = await this.chimeClient.send(createAttendeeCommand);
    const chimeAttendee = attendeeResponse.Attendee;

    if (!chimeAttendee) {
      throw new BadRequestException('Chime 참가자 추가에 실패했습니다.');
    }

    // 참가자 레코드 생성 또는 업데이트
    let participant = await this.participantRepository.findOne({
      where: { meetingId: meeting.id, userId },
    });

    if (!participant) {
      participant = this.participantRepository.create({
        meetingId: meeting.id,
        userId,
        role,
      });
    }

    participant.chimeAttendeeId = chimeAttendee.AttendeeId;
    participant.externalUserId = externalUserId;
    participant.joinToken = chimeAttendee.JoinToken;
    participant.joinedAt = new Date();

    await this.participantRepository.save(participant);

    return participant;
  }

  // 미팅 나가기
  async leaveMeeting(meetingId: string, userId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting || !meeting.chimeMeetingId) {
      return;
    }

    const participant = await this.participantRepository.findOne({
      where: { meetingId, userId },
    });

    if (participant && participant.chimeAttendeeId) {
      try {
        // Chime에서 참가자 제거
        await this.chimeClient.send(
          new DeleteAttendeeCommand({
            MeetingId: meeting.chimeMeetingId,
            AttendeeId: participant.chimeAttendeeId,
          }),
        );
      } catch (error) {
        console.error('Failed to delete attendee:', error);
      }

      participant.leftAt = new Date();
      await this.participantRepository.save(participant);

      // Redis 세션 업데이트
      await this.redisService.removeParticipant(meetingId, userId);
    }
  }

  // 미팅 종료
  async endMeeting(meetingId: string, hostId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    if (meeting.hostId !== hostId) {
      throw new BadRequestException('미팅 호스트만 미팅을 종료할 수 있습니다.');
    }

    if (meeting.chimeMeetingId) {
      try {
        // Chime 미팅 삭제
        await this.chimeClient.send(
          new DeleteMeetingCommand({
            MeetingId: meeting.chimeMeetingId,
          }),
        );
      } catch (error) {
        console.error('Failed to delete Chime meeting:', error);
      }
    }

    meeting.status = MeetingStatus.ENDED;
    meeting.endedAt = new Date();

    await this.meetingRepository.save(meeting);

    // Redis 세션 삭제
    await this.redisService.deleteMeetingSession(meetingId);

    return meeting;
  }

  // 트랜스크립션 시작
  async startTranscription(meetingId: string, languageCode: string = 'ko-KR'): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting || !meeting.chimeMeetingId) {
      throw new NotFoundException('활성화된 미팅을 찾을 수 없습니다.');
    }

    const transcriptionConfig: TranscriptionConfiguration = {
      EngineTranscribeSettings: {
        LanguageCode: languageCode as TranscribeLanguageCode,
        EnablePartialResultsStabilization: true,
        PartialResultsStability: 'high',
      },
    };

    await this.chimeClient.send(
      new StartMeetingTranscriptionCommand({
        MeetingId: meeting.chimeMeetingId,
        TranscriptionConfiguration: transcriptionConfig,
      }),
    );
  }

  // 트랜스크립션 중지
  async stopTranscription(meetingId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting || !meeting.chimeMeetingId) {
      throw new NotFoundException('활성화된 미팅을 찾을 수 없습니다.');
    }

    await this.chimeClient.send(
      new StopMeetingTranscriptionCommand({
        MeetingId: meeting.chimeMeetingId,
      }),
    );
  }

  // 트랜스크립션 저장
  async saveTranscription(
    meetingId: string,
    speakerId: string | undefined,
    chimeAttendeeId: string,
    text: string,
    language: string,
    startTime: number,
    endTime: number,
    confidence: number,
  ): Promise<Transcription> {
    const transcription = new Transcription();
    transcription.meetingId = meetingId;
    transcription.speakerId = speakerId;
    transcription.chimeAttendeeId = chimeAttendeeId;
    transcription.originalText = text;
    transcription.originalLanguage = language;
    transcription.startTime = startTime;
    transcription.endTime = endTime;
    transcription.confidence = confidence;

    return this.transcriptionRepository.save(transcription);
  }

  // 워크스페이스별 미팅 목록 조회
  async findByWorkspace(workspaceId: string): Promise<Meeting[]> {
    return this.meetingRepository.find({
      where: { workspaceId },
      relations: ['host', 'participants'],
      order: { createdAt: 'DESC' },
    });
  }

  // 미팅 상세 조회
  async findOne(meetingId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['host', 'participants', 'participants.user', 'workspace'],
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    return meeting;
  }

  // 미팅 참가자 목록
  async getParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    return this.participantRepository.find({
      where: { meetingId },
      relations: ['user'],
    });
  }

  // 미팅 트랜스크립션 조회
  async getTranscriptions(meetingId: string): Promise<Transcription[]> {
    return this.transcriptionRepository.find({
      where: { meetingId },
      relations: ['speaker'],
      order: { startTime: 'ASC' },
    });
  }

  // Chime 미팅 정보 조회 (클라이언트용)
  async getMeetingInfo(meetingId: string): Promise<{
    Meeting: any;
  } | null> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting || !meeting.chimeMeetingId) {
      return null;
    }

    return {
      Meeting: {
        MeetingId: meeting.chimeMeetingId,
        ExternalMeetingId: meeting.externalMeetingId,
        MediaPlacement: meeting.mediaPlacement,
        MediaRegion: meeting.mediaRegion,
      },
    };
  }
}
