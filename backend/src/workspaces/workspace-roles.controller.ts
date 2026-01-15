import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRolesService } from './workspace-roles.service';
import { MemberPermissions } from './entities/workspace-role.entity';

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
    constructor(private readonly rolesService: WorkspaceRolesService) { }

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
    ) {
        return this.rolesService.createRole(workspaceId, dto);
    }

    /**
     * 역할 수정
     */
    @Put(':roleId')
    async updateRole(
        @Param('roleId') roleId: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.rolesService.updateRole(roleId, dto);
    }

    /**
     * 역할 삭제
     */
    @Delete(':roleId')
    async deleteRole(@Param('roleId') roleId: string) {
        await this.rolesService.deleteRole(roleId);
        return { success: true };
    }

    /**
     * 멤버에게 역할 할당
     */
    @Put('members/:userId')
    async assignRole(
        @Param('workspaceId') workspaceId: string,
        @Param('userId') userId: string,
        @Body() dto: AssignRoleDto,
    ) {
        return this.rolesService.assignRole(workspaceId, userId, dto.roleId);
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
}
