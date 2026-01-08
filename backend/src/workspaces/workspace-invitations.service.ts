import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceInvitation, InvitationStatus } from './entities/workspace-invitation.entity';
import { Workspace } from './entities/workspace.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WorkspaceInvitationsService {
  private readonly logger = new Logger(WorkspaceInvitationsService.name);

  constructor(
    @InjectRepository(WorkspaceInvitation)
    private invitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 워크스페이스 초대 생성
   */
  async createInvitation(
    workspaceId: string,
    inviterId: string,
    inviteeId: string,
    message?: string,
  ): Promise<WorkspaceInvitation> {
    // 워크스페이스 확인
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['owner'],
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    // 초대 권한 확인 (오너만 초대 가능)
    if (workspace.ownerId !== inviterId) {
      throw new ForbiddenException('워크스페이스 오너만 멤버를 초대할 수 있습니다');
    }

    // 초대받을 유저 확인
    const invitee = await this.userRepository.findOne({
      where: { id: inviteeId },
    });

    if (!invitee) {
      throw new NotFoundException('초대할 사용자를 찾을 수 없습니다');
    }

    // 자기 자신을 초대하는 경우
    if (inviterId === inviteeId) {
      throw new BadRequestException('자기 자신을 초대할 수 없습니다');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.workspaceRepository
      .createQueryBuilder('workspace')
      .innerJoin('workspace.members', 'member', 'member.id = :inviteeId', { inviteeId })
      .where('workspace.id = :workspaceId', { workspaceId })
      .getOne();

    if (existingMember) {
      throw new ConflictException('이미 워크스페이스 멤버입니다');
    }

    // 이미 대기 중인 초대가 있는지 확인
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        workspaceId,
        inviteeId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException('이미 초대를 보냈습니다');
    }

    // 초대 생성
    const invitation = this.invitationRepository.create({
      workspaceId,
      inviterId,
      inviteeId,
      message,
      status: InvitationStatus.PENDING,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // 관계 데이터와 함께 반환
    const result = await this.invitationRepository.findOne({
      where: { id: savedInvitation.id },
      relations: ['workspace', 'inviter', 'invitee'],
    });

    if (!result) {
      throw new NotFoundException('초대 생성 중 오류가 발생했습니다');
    }

    return result;
  }

  /**
   * 초대 취소 (초대한 사람만 가능)
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['workspace'],
    });

    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    if (invitation.inviterId !== userId && invitation.workspace.ownerId !== userId) {
      throw new ForbiddenException('초대를 취소할 권한이 없습니다');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('대기 중인 초대만 취소할 수 있습니다');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepository.save(invitation);

    this.logger.log(`Invitation cancelled: ${invitationId}`);
  }

  /**
   * 초대 수락
   */
  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ workspace: Workspace }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['workspace', 'workspace.members'],
    });

    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('이 초대에 응답할 권한이 없습니다');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('대기 중인 초대만 수락할 수 있습니다');
    }

    // 멤버로 추가
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 워크스페이스 멤버 추가
    const workspace = await this.workspaceRepository.findOne({
      where: { id: invitation.workspaceId },
      relations: ['members'],
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    if (!workspace.members) {
      workspace.members = [];
    }
    workspace.members.push(user);
    await this.workspaceRepository.save(workspace);

    // 초대 상태 업데이트
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    this.logger.log(`Invitation accepted: ${invitationId}, user ${userId} joined workspace ${invitation.workspaceId}`);

    return { workspace };
  }

  /**
   * 초대 거절
   */
  async rejectInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('이 초대에 응답할 권한이 없습니다');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('대기 중인 초대만 거절할 수 있습니다');
    }

    invitation.status = InvitationStatus.REJECTED;
    await this.invitationRepository.save(invitation);

    this.logger.log(`Invitation rejected: ${invitationId}`);
  }

  /**
   * 사용자의 대기 중인 초대 목록 조회
   */
  async getPendingInvitationsForUser(userId: string): Promise<WorkspaceInvitation[]> {
    return this.invitationRepository.find({
      where: {
        inviteeId: userId,
        status: InvitationStatus.PENDING,
      },
      relations: ['workspace', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 워크스페이스의 대기 중인 초대 목록 조회
   */
  async getPendingInvitationsForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceInvitation[]> {
    // 권한 확인 (오너만 조회 가능)
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('워크스페이스 오너만 초대 목록을 볼 수 있습니다');
    }

    return this.invitationRepository.find({
      where: {
        workspaceId,
        status: InvitationStatus.PENDING,
      },
      relations: ['invitee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 특정 초대 상세 조회
   */
  async getInvitation(invitationId: string): Promise<WorkspaceInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['workspace', 'inviter', 'invitee'],
    });

    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다');
    }

    return invitation;
  }
}
