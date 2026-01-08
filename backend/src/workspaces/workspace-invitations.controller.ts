import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceInvitationsService } from './workspace-invitations.service';
import { CreateInvitationDto, RespondInvitationDto } from './dto/invitation.dto';
import { WorkspaceGateway } from './workspace.gateway';

@Controller()
@UseGuards(JwtAuthGuard)
export class WorkspaceInvitationsController {
  constructor(
    private readonly invitationsService: WorkspaceInvitationsService,
    private readonly workspaceGateway: WorkspaceGateway,
  ) {}

  /**
   * 워크스페이스에 멤버 초대
   */
  @Post('workspaces/:workspaceId/invitations')
  async createInvitation(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInvitationDto,
    @Req() req: any,
  ) {
    const invitation = await this.invitationsService.createInvitation(
      workspaceId,
      req.user.id,
      dto.userId,
      dto.message,
    );

    // WebSocket으로 초대받은 사용자에게 알림
    this.workspaceGateway.sendInvitationNotification(dto.userId, {
      type: 'invitation_received',
      invitation: {
        id: invitation.id,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          icon: invitation.workspace.icon,
          thumbnail: invitation.workspace.thumbnail,
        },
        inviter: {
          id: invitation.inviter.id,
          name: invitation.inviter.name,
          profileImage: invitation.inviter.profileImage,
        },
        message: invitation.message,
        createdAt: invitation.createdAt,
      },
    });

    return {
      id: invitation.id,
      invitee: {
        id: invitation.invitee.id,
        name: invitation.invitee.name,
        email: invitation.invitee.email,
        profileImage: invitation.invitee.profileImage,
      },
      status: invitation.status,
      createdAt: invitation.createdAt,
    };
  }

  /**
   * 워크스페이스의 대기 중인 초대 목록
   */
  @Get('workspaces/:workspaceId/invitations')
  async getWorkspaceInvitations(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const invitations = await this.invitationsService.getPendingInvitationsForWorkspace(
      workspaceId,
      req.user.id,
    );

    return invitations.map((inv) => ({
      id: inv.id,
      invitee: {
        id: inv.invitee.id,
        name: inv.invitee.name,
        email: inv.invitee.email,
        profileImage: inv.invitee.profileImage,
      },
      status: inv.status,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * 초대 취소
   */
  @Delete('workspaces/:workspaceId/invitations/:invitationId')
  async cancelInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: any,
  ) {
    // 취소 전에 초대 정보 조회
    const invitation = await this.invitationsService.getInvitation(invitationId);

    await this.invitationsService.cancelInvitation(invitationId, req.user.id);

    // WebSocket으로 초대받은 사용자에게 취소 알림
    this.workspaceGateway.sendInvitationNotification(invitation.inviteeId, {
      type: 'invitation_cancelled',
      invitationId,
    });

    return { success: true, message: '초대가 취소되었습니다' };
  }

  /**
   * 내가 받은 대기 중인 초대 목록
   */
  @Get('invitations/pending')
  async getMyPendingInvitations(@Req() req: any) {
    const invitations = await this.invitationsService.getPendingInvitationsForUser(
      req.user.id,
    );

    return invitations.map((inv) => ({
      id: inv.id,
      workspace: {
        id: inv.workspace.id,
        name: inv.workspace.name,
        icon: inv.workspace.icon,
        thumbnail: inv.workspace.thumbnail,
      },
      inviter: {
        id: inv.inviter.id,
        name: inv.inviter.name,
        profileImage: inv.inviter.profileImage,
      },
      message: inv.message,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * 초대 수락/거절
   */
  @Post('invitations/:invitationId/respond')
  async respondToInvitation(
    @Param('invitationId') invitationId: string,
    @Body() dto: RespondInvitationDto,
    @Req() req: any,
  ) {
    // 응답 전에 초대 정보 조회
    const invitation = await this.invitationsService.getInvitation(invitationId);

    if (dto.action === 'accept') {
      const result = await this.invitationsService.acceptInvitation(
        invitationId,
        req.user.id,
      );

      // WebSocket으로 워크스페이스 오너에게 수락 알림
      this.workspaceGateway.sendInvitationNotification(invitation.inviterId, {
        type: 'invitation_accepted',
        invitationId,
        user: {
          id: req.user.id,
          name: req.user.name,
          profileImage: req.user.profileImage,
        },
        workspaceId: invitation.workspaceId,
      });

      return {
        success: true,
        message: '초대를 수락했습니다',
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
        },
      };
    } else {
      await this.invitationsService.rejectInvitation(invitationId, req.user.id);

      // WebSocket으로 워크스페이스 오너에게 거절 알림
      this.workspaceGateway.sendInvitationNotification(invitation.inviterId, {
        type: 'invitation_rejected',
        invitationId,
        userId: req.user.id,
        workspaceId: invitation.workspaceId,
      });

      return { success: true, message: '초대를 거절했습니다' };
    }
  }
}
