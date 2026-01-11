import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { User } from '../users/entities/user.entity';
import { WorkspaceEventTypesService } from './workspace-event-types.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspacesRepository: Repository<Workspace>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => WorkspaceEventTypesService))
    private eventTypesService: WorkspaceEventTypesService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    ownerId: string,
  ): Promise<Workspace> {
    const workspace = this.workspacesRepository.create({
      ...createWorkspaceDto,
      ownerId,
      members: [], // 초기 멤버는 빈 배열
    });
    const savedWorkspace = await this.workspacesRepository.save(workspace);

    // 기본 이벤트 타입 생성
    await this.eventTypesService.createDefaultTypes(savedWorkspace.id, ownerId);

    return savedWorkspace;
  }

  /**
   * 사용자가 속한 모든 워크스페이스 조회 (오너 + 멤버)
   */
  async findAllByUser(userId: string): Promise<Workspace[]> {
    // 오너인 워크스페이스
    const ownedWorkspaces = await this.workspacesRepository.find({
      where: { ownerId: userId },
      relations: ['owner', 'members'],
      order: { createdAt: 'DESC' },
    });

    // 멤버인 워크스페이스
    const memberWorkspaces = await this.workspacesRepository
      .createQueryBuilder('workspace')
      .leftJoinAndSelect('workspace.owner', 'owner')
      .leftJoinAndSelect('workspace.members', 'members')
      .innerJoin('workspace.members', 'member', 'member.id = :userId', { userId })
      .orderBy('workspace.createdAt', 'DESC')
      .getMany();

    // 중복 제거하고 병합
    const workspaceMap = new Map<string, Workspace>();
    [...ownedWorkspaces, ...memberWorkspaces].forEach((ws) => {
      if (!workspaceMap.has(ws.id)) {
        workspaceMap.set(ws.id, ws);
      }
    });

    return Array.from(workspaceMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id },
      relations: ['owner', 'members'],
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }
    return workspace;
  }

  async update(
    id: string,
    updateData: Partial<CreateWorkspaceDto>,
  ): Promise<Workspace> {
    await this.workspacesRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.workspacesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }
  }

  /**
   * 멤버 추방
   */
  async kickMember(
    workspaceId: string,
    memberId: string,
    requesterId: string,
  ): Promise<void> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id: workspaceId },
      relations: ['members'],
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    // 오너만 추방 가능
    if (workspace.ownerId !== requesterId) {
      throw new ForbiddenException('워크스페이스 오너만 멤버를 추방할 수 있습니다');
    }

    // 자기 자신을 추방할 수 없음
    if (memberId === requesterId) {
      throw new ForbiddenException('자기 자신을 추방할 수 없습니다');
    }

    // 멤버 목록에서 제거
    workspace.members = workspace.members.filter((m) => m.id !== memberId);
    await this.workspacesRepository.save(workspace);
  }

  /**
   * 워크스페이스 나가기 (멤버가 스스로 나감)
   */
  async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id: workspaceId },
      relations: ['members'],
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    // 오너는 나갈 수 없음
    if (workspace.ownerId === userId) {
      throw new ForbiddenException('워크스페이스 오너는 나갈 수 없습니다. 워크스페이스를 삭제하세요.');
    }

    // 멤버 목록에서 제거
    workspace.members = workspace.members.filter((m) => m.id !== userId);
    await this.workspacesRepository.save(workspace);
  }
}
