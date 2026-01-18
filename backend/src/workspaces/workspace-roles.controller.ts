import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesService } from './workspace-roles.service';
import { MemberPermissions } from './entities/workspace-role.entity';
import { getAuthUser } from '../auth/interfaces';

class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsObject()
  permissions?: Partial<MemberPermissions>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsObject()
  permissions?: Partial<MemberPermissions>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // Extra fields from frontend (ignored but allowed)
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;
}

class AssignRoleDto {
  @IsString()
  roleId: string;
}

@Controller('workspaces/:workspaceId/roles')
@UseGuards(JwtAuthGuard)
export class WorkspaceRolesController {
  constructor(private readonly rolesService: WorkspaceRolesService) {}

  /**
   * 워크스페이스의 모든 역할 조회
   */
  @Get()
  async getRoles(@Param('workspaceId') workspaceId: string) {
    return this.rolesService.getRoles(workspaceId);
  }

  /**
   * 역할 생성
   */
  @Post()
  async createRole(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateRoleDto,
    @Req() req: any,
  ) {
    const userId = getAuthUser(req).id;
    const hasPermission = await this.rolesService.checkPermission(
      workspaceId,
      userId,
      'managePermissions',
    );
    if (!hasPermission) {
      throw new ForbiddenException('역할을 생성할 권한이 없습니다');
    }
    return this.rolesService.createRole(workspaceId, dto);
  }

  /**
   * 역할 수정
   */
  @Put(':roleId')
  async updateRole(
    @Param('workspaceId') workspaceId: string, // Controller-level prefix requires this if we want it, but wait, prefix is :workspaceId.
    // Actually the controller is @Controller('workspaces/:workspaceId/roles')
    // So @Param('workspaceId') is available.
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
  ) {
    // Need workspaceId. It is in the path.
    // We need to inject @Param('workspaceId') workspaceId: string
    const userId = getAuthUser(req).id;
    const hasPermission = await this.rolesService.checkPermission(
      // We need workspaceId here.
      // The method signature in original didn't have workspaceId param explicitly?
      // Wait, look at original: async updateRole(@Param('roleId') roleId: string, @Body() dto: UpdateRoleDto)
      // It missed workspaceId. I must add it.
      // But wait, checkPermission needs workspaceId.
      // Does the request have it? Yes from route.
      // I will simply add @Param('workspaceId') workspaceId: string to the arguments.
      workspaceId,
      userId,
      'managePermissions',
    );
    if (!hasPermission) {
      throw new ForbiddenException('역할을 수정할 권한이 없습니다');
    }
    return this.rolesService.updateRole(roleId, dto);
  }

  /**
   * 역할 삭제
   */
  @Delete(':roleId')
  async deleteRole(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Req() req: any,
  ) {
    const userId = getAuthUser(req).id;
    const hasPermission = await this.rolesService.checkPermission(
      workspaceId,
      userId,
      'managePermissions',
    );
    if (!hasPermission) {
      throw new ForbiddenException('역할을 삭제할 권한이 없습니다');
    }
    await this.rolesService.deleteRole(roleId);
    return { success: true };
  }

  /**
   * 멤버에게 역할 할당
   */
  @Put('members/:userId')
  async assignRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string, // Renamed to avoid confusion if needed, but original is userId.
    @Body() dto: AssignRoleDto,
    @Req() req: any,
  ) {
    const requesterId = getAuthUser(req).id;
    const hasPermission = await this.rolesService.checkPermission(
      workspaceId,
      requesterId,
      'managePermissions',
    );
    if (!hasPermission) {
      throw new ForbiddenException('역할을 할당할 권한이 없습니다');
    }
    return this.rolesService.assignRole(workspaceId, targetUserId, dto.roleId);
  }

  /**
   * 멤버의 역할 조회
   */
  @Get('members/:userId')
  async getMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.getMemberRole(workspaceId, userId);
  }

  /**
   * 역할 상태 디버깅용 엔드포인트
   */
  @Get('debug/:userId')
  async getDebugRoleState(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.debugRoleState(workspaceId, userId);
  }
}
