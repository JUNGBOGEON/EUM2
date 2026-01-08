import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  DeleteAttendeeCommand,
  StartMeetingTranscriptionCommand,
  StopMeetingTranscriptionCommand,
} from '@aws-sdk/client-chime-sdk-meetings';

import { MeetingSession, SessionStatus } from '../entities/meeting-session.entity';
import {
  SessionParticipant,
  ParticipantRole,
} from '../entities/session-participant.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { RedisService } from '../../redis/redis.service';
import { WorkspaceGateway } from '../../workspaces/workspace.gateway';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ChimeService {
  private chimeClient: ChimeSDKMeetingsClient;

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private configService: ConfigService,
    private redisService: RedisService,
    private workspaceGateway: WorkspaceGateway,
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
   * 워크스페이스에서 새 미팅 세션 시작
   * Google Meet 방식: 워크스페이스에 입장하면 바로 세션 생성/참가
   */
  async startSession(
    workspaceId: string,
    hostId: string,
    title?: string,
  ): Promise<{
    session: MeetingSession;
    attendee: {
      attendeeId: string;
      joinToken: string;
    };
  }> {
    // 워크스페이스 확인
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
    }

    // 진행 중인 세션이 있는지 확인
    const activeSession = await this.sessionRepository.findOne({
      where: { workspaceId, status: SessionStatus.ACTIVE },
    });

    if (activeSession) {
      // 이미 진행 중인 세션이 있으면 해당 세션에 참가
      return this.joinSession(activeSession.id, hostId);
    }

    // 새 세션 생성
    const externalMeetingId = uuidv4();

    // AWS Chime Meeting 생성
    const createMeetingCommand = new CreateMeetingCommand({
      ClientRequestToken: externalMeetingId,
      ExternalMeetingId: externalMeetingId,
      MediaRegion: this.configService.get('AWS_REGION') || 'ap-northeast-2',
      MeetingFeatures: {
        Audio: { EchoReduction: 'AVAILABLE' },
        Video: { MaxResolution: 'FHD' },
        Content: { MaxResolution: 'FHD' },
        Attendee: { MaxCount: 10 },
      },
    });

    const chimeMeetingResponse = await this.chimeClient.send(createMeetingCommand);
    const chimeMeeting = chimeMeetingResponse.Meeting;

    if (!chimeMeeting) {
      throw new BadRequestException('Chime 미팅 생성에 실패했습니다.');
    }

    // 세션 저장
    const session = new MeetingSession();
    session.title = title || `${workspace.name} 회의`;
    session.workspaceId = workspaceId;
    session.hostId = hostId;
    session.externalMeetingId = externalMeetingId;
    session.chimeMeetingId = chimeMeeting.MeetingId;
    session.mediaPlacement = chimeMeeting.MediaPlacement as Record<string, any>;
    session.mediaRegion = chimeMeeting.MediaRegion;
    session.status = SessionStatus.ACTIVE;
    session.startedAt = new Date();

    await this.sessionRepository.save(session);

    // 호스트를 첫 번째 참가자로 추가
    const attendee = await this.addAttendee(session, hostId, ParticipantRole.HOST);

    // Redis에 세션 정보 캐싱
    await this.redisService.setMeetingSession(session.id, {
      chimeMeetingId: chimeMeeting.MeetingId!,
      mediaPlacement: chimeMeeting.MediaPlacement,
      participants: [hostId],
    });

    // 자동으로 트랜스크립션 시작
    try {
      await this.startSessionTranscription(chimeMeeting.MeetingId!, 'ko-KR');
      console.log(`[Chime] Auto-started transcription for session ${session.id}`);
    } catch (error) {
      console.error('[Chime] Failed to auto-start transcription:', error);
      // 트랜스크립션 시작 실패해도 세션은 정상 진행
    }

    // WebSocket으로 세션 시작 브로드캐스트
    const host = await this.getHostInfo(hostId);
    this.workspaceGateway.broadcastSessionUpdate({
      workspaceId,
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        hostId: session.hostId,
        startedAt: session.startedAt!,
        participantCount: 1,
        host,
      },
    });

    return {
      session,
      attendee: {
        attendeeId: attendee.chimeAttendeeId!,
        joinToken: attendee.joinToken!,
      },
    };
  }

  /**
   * 세션 참가
   */
  async joinSession(
    sessionId: string,
    userId: string,
  ): Promise<{
    session: MeetingSession;
    attendee: {
      attendeeId: string;
      joinToken: string;
    };
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('종료된 세션입니다.');
    }

    // 이미 참가 중인지 확인
    let participant = await this.participantRepository.findOne({
      where: { sessionId, userId },
    });

    if (participant?.joinedAt && !participant.leftAt && participant.joinToken) {
      return {
        session,
        attendee: {
          attendeeId: participant.chimeAttendeeId!,
          joinToken: participant.joinToken!,
        },
      };
    }

    // 새 참가자 추가
    const role = session.hostId === userId 
      ? ParticipantRole.HOST 
      : ParticipantRole.PARTICIPANT;
    const attendee = await this.addAttendee(session, userId, role);

    // Redis 세션 업데이트
    await this.redisService.addParticipant(sessionId, userId);

    return {
      session,
      attendee: {
        attendeeId: attendee.chimeAttendeeId!,
        joinToken: attendee.joinToken!,
      },
    };
  }

  /**
   * 세션 나가기
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    const participant = await this.participantRepository.findOne({
      where: { sessionId, userId },
    });

    if (!participant) {
      throw new NotFoundException('참가자를 찾을 수 없습니다.');
    }

    // Chime에서 참가자 제거
    if (session.chimeMeetingId && participant.chimeAttendeeId) {
      try {
        await this.chimeClient.send(
          new DeleteAttendeeCommand({
            MeetingId: session.chimeMeetingId,
            AttendeeId: participant.chimeAttendeeId,
          }),
        );
      } catch (error) {
        console.error('Failed to delete Chime attendee:', error);
      }
    }

    // 퇴장 시간 및 참가 시간 기록
    participant.leftAt = new Date();
    if (participant.joinedAt) {
      participant.durationSec = Math.floor(
        (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000
      );
    }
    await this.participantRepository.save(participant);

    // Redis 세션에서 참가자 제거
    await this.redisService.removeParticipant(sessionId, userId);
  }

  /**
   * 세션 종료 (호스트만)
   */
  async endSession(sessionId: string, hostId: string): Promise<MeetingSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (session.hostId !== hostId) {
      throw new BadRequestException('호스트만 세션을 종료할 수 있습니다.');
    }

    if (session.chimeMeetingId) {
      // 먼저 트랜스크립션 중지
      try {
        await this.stopSessionTranscription(session.chimeMeetingId);
        console.log(`[Chime] Auto-stopped transcription for session ${sessionId}`);
      } catch (error) {
        console.error('[Chime] Failed to auto-stop transcription:', error);
        // 트랜스크립션 중지 실패해도 세션 종료 진행
      }

      // Chime 미팅 삭제
      try {
        await this.chimeClient.send(
          new DeleteMeetingCommand({
            MeetingId: session.chimeMeetingId,
          }),
        );
      } catch (error) {
        console.error('Failed to delete Chime meeting:', error);
      }
    }

    // 세션 종료 처리
    session.status = SessionStatus.ENDED;
    session.endedAt = new Date();
    if (session.startedAt) {
      session.durationSec = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
      );
    }

    await this.sessionRepository.save(session);

    // Redis 세션 삭제
    await this.redisService.deleteMeetingSession(sessionId);

    // WebSocket으로 세션 종료 브로드캐스트
    this.workspaceGateway.broadcastSessionUpdate({
      workspaceId: session.workspaceId,
      session: null, // null = 세션 종료됨
    });

    return session;
  }

  /**
   * 호스트 정보 조회 (내부 메서드)
   */
  private async getHostInfo(hostId: string): Promise<{
    id: string;
    name: string;
    profileImage?: string;
  } | undefined> {
    const participant = await this.participantRepository.findOne({
      where: { userId: hostId },
      relations: ['user'],
    });

    if (participant?.user) {
      return {
        id: participant.user.id,
        name: participant.user.name,
        profileImage: participant.user.profileImage ?? undefined,
      };
    }

    return undefined;
  }

  /**
   * 참가자 추가 (내부 메서드)
   */
  private async addAttendee(
    session: MeetingSession,
    userId: string,
    role: ParticipantRole,
  ): Promise<SessionParticipant> {
    const createAttendeeCommand = new CreateAttendeeCommand({
      MeetingId: session.chimeMeetingId!,
      ExternalUserId: userId,
    });

    const attendeeResponse = await this.chimeClient.send(createAttendeeCommand);
    const chimeAttendee = attendeeResponse.Attendee;

    if (!chimeAttendee) {
      throw new BadRequestException('Chime 참가자 생성에 실패했습니다.');
    }

    let participant = await this.participantRepository.findOne({
      where: { sessionId: session.id, userId },
    });

    if (!participant) {
      participant = new SessionParticipant();
      participant.sessionId = session.id;
      participant.userId = userId;
    }

    participant.chimeAttendeeId = chimeAttendee.AttendeeId;
    participant.joinToken = chimeAttendee.JoinToken;
    participant.role = role;
    participant.joinedAt = new Date();
    participant.leftAt = undefined;

    return this.participantRepository.save(participant);
  }

  /**
   * 세션 참가자 목록 조회
   */
  async getParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return this.participantRepository.find({
      where: { sessionId },
      relations: ['user'],
    });
  }

  /**
   * 세션 정보 조회
   */
  async getSessionInfo(sessionId: string): Promise<{
    chimeMeetingId: string;
    mediaPlacement: Record<string, any>;
  } | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session || !session.chimeMeetingId) {
      return null;
    }

    return {
      chimeMeetingId: session.chimeMeetingId,
      mediaPlacement: session.mediaPlacement || {},
    };
  }

  /**
   * 워크스페이스의 활성 세션 조회
   */
  async getActiveSession(workspaceId: string): Promise<MeetingSession | null> {
    return this.sessionRepository.findOne({
      where: { workspaceId, status: SessionStatus.ACTIVE },
      relations: ['host', 'participants', 'participants.user'],
    });
  }

  /**
   * 세션 조회
   */
  async findSession(sessionId: string): Promise<MeetingSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['host', 'workspace', 'participants', 'participants.user'],
    });
  }

  /**
   * 워크스페이스의 세션 히스토리 조회
   */
  async getSessionHistory(workspaceId: string): Promise<MeetingSession[]> {
    return this.sessionRepository.find({
      where: { workspaceId },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================================
  // 트랜스크립션 관련
  // ==========================================

  async startSessionTranscription(
    chimeMeetingId: string,
    languageCode: string = 'ko-KR',
  ): Promise<void> {
    const command = new StartMeetingTranscriptionCommand({
      MeetingId: chimeMeetingId,
      TranscriptionConfiguration: {
        EngineTranscribeSettings: {
          LanguageCode: languageCode as any,
          Region: 'ap-southeast-2',
        },
      },
    });

    try {
      await this.chimeClient.send(command);
      console.log(`[Chime] Transcription started for session`);
    } catch (error) {
      console.error('[Chime] Failed to start transcription:', error);
      throw error;
    }
  }

  async stopSessionTranscription(chimeMeetingId: string): Promise<void> {
    const command = new StopMeetingTranscriptionCommand({
      MeetingId: chimeMeetingId,
    });

    try {
      await this.chimeClient.send(command);
      console.log(`[Chime] Transcription stopped`);
    } catch (error) {
      console.error('[Chime] Failed to stop transcription:', error);
      throw error;
    }
  }
}
