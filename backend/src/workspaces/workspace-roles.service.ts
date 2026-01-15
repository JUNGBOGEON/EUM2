import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceRole, MemberPermissions, DEFAULT_PERMISSIONS } from './entities/workspace-role.entity';
import { WorkspaceMemberRole } from './entities/workspace-member-role.entity';
import { Workspace } from './entities/workspace.entity';

/**
 * 기본 역할 템플릿
 */
const DEFAULT_ROLES = [
    {
        name: '관리자',
        color: '#f59e0b',
        permissions: {
            sendMessages: true,
            joinCalls: true,
            editCalendar: true,
            uploadFiles: true,
            managePermissions: true,
        },
        isSystem: true,
        isDefault: false,
    },
    {
        name: '멤버',
        color: '#3b82f6',
        permissions: {
            sendMessages: true,
            joinCalls: true,
            editCalendar: true,
            uploadFiles: true,
            managePermissions: false,
        },
        isSystem: false,
        isDefault: true,
    },
    {
        name: '게스트',
        color: '#6b7280',
        permissions: {
            sendMessages: true,
            joinCalls: true,
            editCalendar: false,
            uploadFiles: false,
            managePermissions: false,
        },
        isSystem: false,
        isDefault: false,
    },
];

@Injectable()
export class WorkspaceRolesService {
    constructor(
        @InjectRepository(WorkspaceRole)
        private roleRepository: Repository<WorkspaceRole>,
        @InjectRepository(WorkspaceMemberRole)
        private memberRoleRepository: Repository<WorkspaceMemberRole>,
        @InjectRepository(Workspace)
        private workspaceRepository: Repository<Workspace>,
    ) { }

    /**
     * 워크스페이스의 기본 역할 초기화
     */
    async initializeDefaultRoles(workspaceId: string): Promise<WorkspaceRole[]> {
        const existingRoles = await this.roleRepository.find({ where: { workspaceId } });
        if (existingRoles.length > 0) {
            return existingRoles;
        }

        const roles: WorkspaceRole[] = [];
        for (const template of DEFAULT_ROLES) {
            const role = this.roleRepository.create({
                workspaceId,
                ...template,
            });
            roles.push(await this.roleRepository.save(role));
        }
        return roles;
    }

    /**
     * 워크스페이스의 모든 역할 조회
     */
    async getRoles(workspaceId: string): Promise<WorkspaceRole[]> {
        let roles = await this.roleRepository.find({
            where: { workspaceId },
            order: { isSystem: 'DESC', isDefault: 'DESC', name: 'ASC' },
        });

        // 역할이 없으면 기본 역할 초기화
        if (roles.length === 0) {
            roles = await this.initializeDefaultRoles(workspaceId);
        }

        return roles;
    }

    /**
     * 역할 생성
     */
    async createRole(
        workspaceId: string,
        data: { name: string; color?: string; permissions?: Partial<MemberPermissions>; isDefault?: boolean },
    ): Promise<WorkspaceRole> {
        // isDefault가 true이면 기존 기본 역할 해제
        if (data.isDefault) {
            await this.roleRepository.update(
                { workspaceId, isDefault: true },
                { isDefault: false },
            );
        }

        const role = this.roleRepository.create({
            workspaceId,
            name: data.name,
            color: data.color || '#6b7280',
            permissions: { ...DEFAULT_PERMISSIONS, ...data.permissions },
            isDefault: data.isDefault || false,
            isSystem: false,
        });

        return this.roleRepository.save(role);
    }

    /**
     * 역할 수정
     */
    async updateRole(
        roleId: string,
        data: { name?: string; color?: string; permissions?: Partial<MemberPermissions>; isDefault?: boolean },
    ): Promise<WorkspaceRole> {
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // 시스템 역할은 이름 변경 불가
        if (role.isSystem && data.name) {
            delete data.name;
        }

        // isDefault가 true이면 기존 기본 역할 해제
        if (data.isDefault) {
            await this.roleRepository.update(
                { workspaceId: role.workspaceId, isDefault: true },
                { isDefault: false },
            );
        }

        if (data.permissions) {
            role.permissions = { ...role.permissions, ...data.permissions };
        }
        if (data.name) role.name = data.name;
        if (data.color) role.color = data.color;
        if (data.isDefault !== undefined) role.isDefault = data.isDefault;

        return this.roleRepository.save(role);
    }

    /**
     * 역할 삭제
     */
    async deleteRole(roleId: string): Promise<void> {
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        if (role.isSystem) {
            throw new BadRequestException('Cannot delete system role');
        }

        // 해당 역할을 가진 멤버들을 기본 역할로 변경
        const defaultRole = await this.roleRepository.findOne({
            where: { workspaceId: role.workspaceId, isDefault: true },
        });

        if (defaultRole) {
            await this.memberRoleRepository.update(
                { roleId },
                { roleId: defaultRole.id },
            );
        } else {
            // 기본 역할이 없으면 멤버 역할 삭제
            await this.memberRoleRepository.delete({ roleId });
        }

        await this.roleRepository.delete(roleId);
    }

    /**
     * 멤버에게 역할 할당
     */
    async assignRole(workspaceId: string, userId: string, roleId: string): Promise<WorkspaceMemberRole> {
        const role = await this.roleRepository.findOne({ where: { id: roleId, workspaceId } });
        if (!role) {
            throw new NotFoundException('Role not found in this workspace');
        }

        // 기존 역할 확인
        let memberRole = await this.memberRoleRepository.findOne({
            where: { workspaceId, userId },
        });

        if (memberRole) {
            memberRole.roleId = roleId;
            return this.memberRoleRepository.save(memberRole);
        }

        memberRole = this.memberRoleRepository.create({
            workspaceId,
            userId,
            roleId,
        });

        return this.memberRoleRepository.save(memberRole);
    }

    /**
     * 멤버의 역할 조회
     */
    async getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
        const memberRole = await this.memberRoleRepository.findOne({
            where: { workspaceId, userId },
            relations: ['role'],
        });

        if (memberRole) {
            return memberRole.role;
        }

        // 역할이 없으면 기본 역할 반환
        return this.roleRepository.findOne({
            where: { workspaceId, isDefault: true },
        });
    }

    /**
     * 멤버의 특정 권한 확인
     */
    async checkPermission(
        workspaceId: string,
        userId: string,
        permission: keyof MemberPermissions,
    ): Promise<boolean> {
        // 워크스페이스 오너인지 확인
        const workspace = await this.workspaceRepository.findOne({
            where: { id: workspaceId },
        });

        if (workspace?.ownerId === userId) {
            return true; // 오너는 모든 권한 있음
        }

        const role = await this.getMemberRole(workspaceId, userId);
        if (!role) {
            return false;
        }

        return role.permissions[permission] === true;
    }

    /**
     * 멤버들의 역할 목록 조회 (멤버 리스트용)
     */
    async getMembersWithRoles(workspaceId: string): Promise<{ userId: string; roleId: string }[]> {
        const memberRoles = await this.memberRoleRepository.find({
            where: { workspaceId },
            select: ['userId', 'roleId'],
        });

        return memberRoles;
    }
}
