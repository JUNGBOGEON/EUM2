import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkspaceEventType,
  DEFAULT_EVENT_TYPES,
} from './entities/workspace-event-type.entity';
import { Workspace } from './entities/workspace.entity';
import {
  CreateEventTypeDto,
  UpdateEventTypeDto,
} from './dto/workspace-event-type.dto';

@Injectable()
export class WorkspaceEventTypesService {
  constructor(
    @InjectRepository(WorkspaceEventType)
    private eventTypesRepository: Repository<WorkspaceEventType>,
    @InjectRepository(Workspace)
    private workspacesRepository: Repository<Workspace>,
  ) {}

  /**
   * 워크스페이스의 기본 이벤트 타입들을 생성합니다.
   * 워크스페이스 생성 시 호출됩니다.
   */
  async createDefaultTypes(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceEventType[]> {
    const types = DEFAULT_EVENT_TYPES.map((type, index) =>
      this.eventTypesRepository.create({
        workspaceId,
        createdById: userId,
        name: type.name,
        color: type.color,
        icon: type.icon,
        order: index,
        isDefault: true,
      }),
    );

    return this.eventTypesRepository.save(types);
  }

  /**
   * 커스텀 이벤트 타입 생성
   */
  async create(
    workspaceId: string,
    createDto: CreateEventTypeDto,
    userId: string,
  ): Promise<WorkspaceEventType> {
    // 워크스페이스 접근 권한 확인
    await this.validateWorkspaceAccess(workspaceId, userId);

    // 같은 이름의 타입이 있는지 확인
    const existing = await this.eventTypesRepository.findOne({
      where: { workspaceId, name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('같은 이름의 이벤트 유형이 이미 존재합니다.');
    }

    // 현재 최대 order 값 조회
    const maxOrder = await this.eventTypesRepository
      .createQueryBuilder('type')
      .where('type.workspaceId = :workspaceId', { workspaceId })
      .select('MAX(type.order)', 'maxOrder')
      .getRawOne();

    const eventType = this.eventTypesRepository.create({
      workspaceId,
      createdById: userId,
      name: createDto.name,
      color: createDto.color,
      icon: createDto.icon,
      order: (maxOrder?.maxOrder ?? -1) + 1,
      isDefault: false,
    });

    return this.eventTypesRepository.save(eventType);
  }

  /**
   * 워크스페이스의 모든 이벤트 타입 조회
   */
  async findAll(workspaceId: string, userId: string): Promise<WorkspaceEventType[]> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    return this.eventTypesRepository.find({
      where: { workspaceId },
      relations: ['createdBy'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * 단일 이벤트 타입 조회
   */
  async findOne(
    workspaceId: string,
    typeId: string,
    userId: string,
  ): Promise<WorkspaceEventType> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const eventType = await this.eventTypesRepository.findOne({
      where: { id: typeId, workspaceId },
      relations: ['createdBy'],
    });

    if (!eventType) {
      throw new NotFoundException('이벤트 유형을 찾을 수 없습니다.');
    }

    return eventType;
  }

  /**
   * 이벤트 타입 수정
   */
  async update(
    workspaceId: string,
    typeId: string,
    updateDto: UpdateEventTypeDto,
    userId: string,
  ): Promise<WorkspaceEventType> {
    const eventType = await this.findOne(workspaceId, typeId, userId);

    // 이름 변경 시 중복 확인
    if (updateDto.name && updateDto.name !== eventType.name) {
      const existing = await this.eventTypesRepository.findOne({
        where: { workspaceId, name: updateDto.name },
      });

      if (existing) {
        throw new ConflictException('같은 이름의 이벤트 유형이 이미 존재합니다.');
      }
    }

    // 업데이트 적용
    if (updateDto.name !== undefined) eventType.name = updateDto.name;
    if (updateDto.color !== undefined) eventType.color = updateDto.color;
    if (updateDto.icon !== undefined) eventType.icon = updateDto.icon;
    if (updateDto.order !== undefined) eventType.order = updateDto.order;

    return this.eventTypesRepository.save(eventType);
  }

  /**
   * 이벤트 타입 삭제
   */
  async remove(
    workspaceId: string,
    typeId: string,
    userId: string,
  ): Promise<void> {
    const eventType = await this.findOne(workspaceId, typeId, userId);

    if (eventType.isDefault) {
      throw new ForbiddenException('기본 이벤트 유형은 삭제할 수 없습니다.');
    }

    await this.eventTypesRepository.remove(eventType);
  }

  /**
   * 워크스페이스 접근 권한 확인
   */
  private async validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
  ): Promise<Workspace> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id: workspaceId },
      relations: ['members'],
    });

    if (!workspace) {
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
    }

    const isOwner = workspace.ownerId === userId;
    const isMember = workspace.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('이 워크스페이스에 접근할 권한이 없습니다.');
    }

    return workspace;
  }
}
