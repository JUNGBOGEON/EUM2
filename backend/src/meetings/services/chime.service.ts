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
} from '@aws-sdk/client-chime-sdk-meetings';

import { Meeting, MeetingStatus } from '../entities/meeting.entity';
import {
  MeetingParticipant,
  ParticipantRole,
} from '../entities/meeting-participant.entity';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ChimeService {
  private chimeClient: ChimeSDKMeetingsClient;

  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.chimeClient = new ChimeSDKMeetingsClient({
      region: this.configService.get('AWS_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Chime 미팅 시작 (호스트만)
   */
  async startChimeMeeting(
    meetingId: string,
    hostId: string,
  ): Promise<{
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
      MediaRegion: this.configService.get('AWS_REGION') || 'ap-northeast-2',
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

    const chimeMeetingResponse =
      await this.chimeClient.send(createMeetingCommand);
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

  /**
   * 미팅 참가
   */
  async joinMeeting(
    meetingId: string,
    userId: string,
  ): Promise<{
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
      throw new BadRequestException('아직 시작되지 않은 미팅입니다.');
    }

    // 이미 참가 중인지 확인
    let participant = await this.participantRepository.findOne({
      where: { meetingId, userId },
    });

    // 이미 참가 중인 경우 (joinedAt이 있고 leftAt이 없음) 기존 정보 반환
    if (participant && participant.joinedAt && !participant.leftAt && participant.joinToken) {
      return {
        meeting,
        attendee: {
          attendeeId: participant.chimeAttendeeId!,
          joinToken: participant.joinToken!,
        },
      };
    }

    // 새 참가자 추가
    const role =
      meeting.hostId === userId ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT;
    const attendee = await this.addAttendee(meeting, userId, role);

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

  /**
   * 미팅 나가기
   */
  async leaveMeeting(meetingId: string, userId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('미팅을 찾을 수 없습니다.');
    }

    const participant = await this.participantRepository.findOne({
      where: { meetingId, userId },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다.');
    }

    // Chime에서 참가자 제거
    if (meeting.chimeMeetingId && participant.chimeAttendeeId) {
      try {
        await this.chimeClient.send(
          new DeleteAttendeeCommand({
            MeetingId: meeting.chimeMeetingId,
            AttendeeId: participant.chimeAttendeeId,
          }),
        );
      } catch (error) {
        console.error('Failed to delete Chime attendee:', error);
      }
    }

    // 퇴장 시간 기록
    participant.leftAt = new Date();
    await this.participantRepository.save(participant);

    // Redis 세션에서 참가자 제거
    await this.redisService.removeParticipant(meetingId, userId);
  }

  /**
   * 미팅 종료 (호스트만)
   */
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

  /**
   * 참가자 추가 (내부 메서드)
   */
  async addAttendee(
    meeting: Meeting,
    userId: string,
    role: ParticipantRole,
  ): Promise<MeetingParticipant> {
    // Chime Attendee 생성
    const createAttendeeCommand = new CreateAttendeeCommand({
      MeetingId: meeting.chimeMeetingId!,
      ExternalUserId: userId,
    });

    const attendeeResponse = await this.chimeClient.send(createAttendeeCommand);
    const chimeAttendee = attendeeResponse.Attendee;

    if (!chimeAttendee) {
      throw new BadRequestException('Chime 참가자 생성에 실패했습니다.');
    }

    // DB에 참가자 저장
    let participant = await this.participantRepository.findOne({
      where: { meetingId: meeting.id, userId },
    });

    if (!participant) {
      participant = new MeetingParticipant();
      participant.meetingId = meeting.id;
      participant.userId = userId;
    }

    participant.chimeAttendeeId = chimeAttendee.AttendeeId;
    participant.joinToken = chimeAttendee.JoinToken;
    participant.role = role;
    participant.joinedAt = new Date();

    return this.participantRepository.save(participant);
  }

  /**
   * 참가자 목록 조회
   */
  async getParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    return this.participantRepository.find({
      where: { meetingId },
      relations: ['user'],
    });
  }

  /**
   * Chime 미팅 정보 조회
   */
  async getMeetingInfo(meetingId: string): Promise<{
    chimeMeetingId: string;
    mediaPlacement: Record<string, any>;
  } | null> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting || !meeting.chimeMeetingId) {
      return null;
    }

    return {
      chimeMeetingId: meeting.chimeMeetingId,
      mediaPlacement: meeting.mediaPlacement || {},
    };
  }


  /**
   * 미팅 트랜스크립션 시작 (Chime SDK Live Transcription)
   */
  async startMeetingTranscription(
    chimeMeetingId: string,
    languageCode: string = 'ko-KR',
  ): Promise<void> {
    const command = new StartMeetingTranscriptionCommand({
      MeetingId: chimeMeetingId,
      TranscriptionConfiguration: {
        EngineTranscribeSettings: {
          LanguageCode: languageCode as any,
          // ap-southeast-2 (시드니) - 아시아에서 가장 가까운 지원 리전
          Region: 'ap-southeast-2',
        },
      },
    });

    try {
      await this.chimeClient.send(command);
      console.log(`[Chime] Transcription started for meeting ${chimeMeetingId}`);
    } catch (error) {
      console.error('[Chime] Failed to start transcription:', error);
      throw error;
    }
  }

  /**
   * 미팅 트랜스크립션 중지
   */
  async stopMeetingTranscription(chimeMeetingId: string): Promise<void> {
    const command = new StopMeetingTranscriptionCommand({
      MeetingId: chimeMeetingId,
    });

    try {
      await this.chimeClient.send(command);
      console.log(`[Chime] Transcription stopped for meeting ${chimeMeetingId}`);
    } catch (error) {
      console.error('[Chime] Failed to stop transcription:', error);
      throw error;
    }
  }
}
