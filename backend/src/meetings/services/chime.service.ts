import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  MeetingSession,
  SessionStatus,
} from '../entities/meeting-session.entity';
import {
  SessionParticipant,
  ParticipantRole,
} from '../entities/session-participant.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { RedisService } from '../../redis/redis.service';
import { WorkspaceGateway } from '../../workspaces/workspace.gateway';
import { ChimeSdkService } from './chime-sdk.service';
import { CACHE_TTL } from '../../common/constants';

/**
 * Chime Session Lifecycle Service
 * Handles meeting session creation, joining, leaving, and ending
 * Delegates AWS SDK operations to ChimeSdkService
 */
@Injectable()
export class ChimeService {
  private readonly logger = new Logger(ChimeService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    @InjectRepository(SessionParticipant)
    private participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private redisService: RedisService,
    private workspaceGateway: WorkspaceGateway,
    private chimeSdkService: ChimeSdkService,
  ) {}

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

    // AWS Chime Meeting 생성 (SDK 서비스 사용)
    const chimeMeeting =
      await this.chimeSdkService.createMeeting(externalMeetingId);

    // 세션 저장
    const session = new MeetingSession();
    session.title = title || `${workspace.name} 회의`;
    session.workspaceId = workspaceId;
    session.hostId = hostId;
    session.externalMeetingId = externalMeetingId;
    session.chimeMeetingId = chimeMeeting.meetingId;
    session.mediaPlacement = chimeMeeting.mediaPlacement;
    session.mediaRegion = chimeMeeting.mediaRegion;
    session.status = SessionStatus.ACTIVE;
    session.startedAt = new Date();

    await this.sessionRepository.save(session);

    // 호스트를 첫 번째 참가자로 추가
    const attendee = await this.addAttendee(
      session,
      hostId,
      ParticipantRole.HOST,
    );

    // Redis에 세션 정보 캐싱
    await this.redisService.setMeetingSession(session.id, {
      chimeMeetingId: chimeMeeting.meetingId,
      mediaPlacement: chimeMeeting.mediaPlacement,
      participants: [hostId],
    });

    // 자동으로 트랜스크립션 시작 (기본 언어: ko-KR)
    const defaultLanguage = 'ko-KR';
    try {
      await this.startSessionTranscription(
        chimeMeeting.meetingId,
        defaultLanguage,
      );
      // Redis에 현재 언어 저장
      await this.redisService.set(
        `transcription:language:${session.id}`,
        defaultLanguage,
        CACHE_TTL.TRANSLATION_PREFERENCE,
      );
      this.logger.log(`Auto-started transcription for session ${session.id}`);
    } catch (error) {
      this.logger.error('Failed to auto-start transcription:', error);
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
        startedAt: session.startedAt,
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
    let session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('종료된 세션입니다.');
    }

    // 이미 참가 중인지 확인
    const participant = await this.participantRepository.findOne({
      where: { sessionId, userId },
    });

    if (participant?.joinedAt && !participant.leftAt && participant.joinToken) {
      return {
        session,
        attendee: {
          attendeeId: participant.chimeAttendeeId!,
          joinToken: participant.joinToken,
        },
      };
    }

    // 새 참가자 추가
    const role =
      session.hostId === userId
        ? ParticipantRole.HOST
        : ParticipantRole.PARTICIPANT;

    let attendee: SessionParticipant;

    try {
      attendee = await this.addAttendee(session, userId, role);
    } catch (error: any) {
      // AWS Chime Meeting이 만료되었거나 삭제된 경우 새로 생성
      if (
        error?.Code === 'NotFound' ||
        error?.name === 'NotFoundException' ||
        error?.$metadata?.httpStatusCode === 404
      ) {
        this.logger.log(
          `Chime meeting ${session.chimeMeetingId} not found, recreating...`,
        );

        // 새 Chime Meeting 생성
        session = await this.recreateChimeMeeting(session);

        // 재시도
        attendee = await this.addAttendee(session, userId, role);
      } else {
        throw error;
      }
    }

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

    // Chime에서 참가자 제거 (SDK 서비스 사용)
    if (session.chimeMeetingId && participant.chimeAttendeeId) {
      await this.chimeSdkService.deleteAttendee(
        session.chimeMeetingId,
        participant.chimeAttendeeId,
      );
    }

    // 퇴장 시간 및 참가 시간 기록
    participant.leftAt = new Date();
    if (participant.joinedAt) {
      participant.durationSec = Math.floor(
        (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
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
        this.logger.log(`Auto-stopped transcription for session ${sessionId}`);
      } catch (error) {
        this.logger.error('Failed to auto-stop transcription:', error);
        // 트랜스크립션 중지 실패해도 세션 종료 진행
      }

      // Chime 미팅 삭제 (SDK 서비스 사용)
      try {
        await this.chimeSdkService.deleteMeeting(session.chimeMeetingId);
      } catch (error) {
        this.logger.error('Failed to delete Chime meeting:', error);
      }
    }

    // 세션 종료 처리
    session.status = SessionStatus.ENDED;
    session.endedAt = new Date();
    if (session.startedAt) {
      session.durationSec = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
      );
    }

    await this.sessionRepository.save(session);

    // Redis 세션 삭제
    await this.redisService.deleteMeetingSession(sessionId);

    // 1. 세션 참가자들에게 세션 종료 알림 (미팅 페이지에서 자동 퇴장용)
    this.workspaceGateway.broadcastSessionEnded(sessionId, 'host_ended');

    // 2. 워크스페이스 멤버들에게 세션 상태 업데이트 (UI 업데이트용)
    this.workspaceGateway.broadcastSessionUpdate({
      workspaceId: session.workspaceId,
      session: null, // null = 세션 종료됨
    });

    return session;
  }

  /**
   * 호스트 정보 조회 (내부 메서드)
   */
  private async getHostInfo(hostId: string): Promise<
    | {
        id: string;
        name: string;
        profileImage?: string;
      }
    | undefined
  > {
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
   * Chime Meeting이 만료된 경우 새로 생성 (내부 메서드)
   */
  private async recreateChimeMeeting(
    session: MeetingSession,
  ): Promise<MeetingSession> {
    const externalMeetingId = uuidv4();

    // 새 AWS Chime Meeting 생성 (SDK 서비스 사용)
    const chimeMeeting =
      await this.chimeSdkService.createMeeting(externalMeetingId);

    // 세션 업데이트
    session.externalMeetingId = externalMeetingId;
    session.chimeMeetingId = chimeMeeting.meetingId;
    session.mediaPlacement = chimeMeeting.mediaPlacement;
    session.mediaRegion = chimeMeeting.mediaRegion;

    await this.sessionRepository.save(session);

    // Redis 캐시 업데이트
    await this.redisService.setMeetingSession(session.id, {
      chimeMeetingId: chimeMeeting.meetingId,
      mediaPlacement: chimeMeeting.mediaPlacement,
      participants: [],
    });

    // 자동으로 트랜스크립션 시작
    try {
      const savedLanguage = await this.redisService.get(
        `transcription:language:${session.id}`,
      );
      const languageCode =
        (typeof savedLanguage === 'string' ? savedLanguage : null) || 'ko-KR';
      await this.startSessionTranscription(
        chimeMeeting.meetingId,
        languageCode,
      );
    } catch (err) {
      this.logger.error('Failed to restart transcription:', err);
    }

    this.logger.log(
      `Recreated Chime meeting: ${chimeMeeting.meetingId} for session ${session.id}`,
    );

    return session;
  }

  /**
   * 참가자 추가 (내부 메서드)
   */
  private async addAttendee(
    session: MeetingSession,
    userId: string,
    role: ParticipantRole,
  ): Promise<SessionParticipant> {
    // AWS Chime Attendee 생성 (SDK 서비스 사용)
    const chimeAttendee = await this.chimeSdkService.createAttendee(
      session.chimeMeetingId!,
      userId,
    );

    let participant = await this.participantRepository.findOne({
      where: { sessionId: session.id, userId },
    });

    if (!participant) {
      participant = new SessionParticipant();
      participant.sessionId = session.id;
      participant.userId = userId;
    }

    participant.chimeAttendeeId = chimeAttendee.attendeeId;
    participant.joinToken = chimeAttendee.joinToken;
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
  // 트랜스크립션 관련 (SDK 서비스에 위임)
  // ==========================================

  async startSessionTranscription(
    chimeMeetingId: string,
    languageCode: string = 'ko-KR',
  ): Promise<void> {
    await this.chimeSdkService.startTranscription(chimeMeetingId, languageCode);
  }

  async stopSessionTranscription(chimeMeetingId: string): Promise<void> {
    await this.chimeSdkService.stopTranscription(chimeMeetingId);
  }
}
