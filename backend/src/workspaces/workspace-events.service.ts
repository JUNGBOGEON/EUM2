import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WorkspaceEvent } from './entities/workspace-event.entity';
import { Workspace } from './entities/workspace.entity';
import {
  CreateWorkspaceEventDto,
  UpdateWorkspaceEventDto,
  GetEventsQueryDto,
} from './dto/workspace-event.dto';

@Injectable()
export class WorkspaceEventsService {
  constructor(
    @InjectRepository(WorkspaceEvent)
    private eventsRepository: Repository<WorkspaceEvent>,
    @InjectRepository(Workspace)
    private workspacesRepository: Repository<Workspace>,
  ) {}

  /**
   * 이벤트 생성
   */
  async create(
    workspaceId: string,
    createDto: CreateWorkspaceEventDto,
    userId: string,
  ): Promise<WorkspaceEvent> {
    // 워크스페이스 접근 권한 확인
    await this.validateWorkspaceAccess(workspaceId, userId);

    const eventData: Partial<WorkspaceEvent> = {
      workspaceId,
      createdById: userId,
      title: createDto.title,
      description: createDto.description,
      eventTypeId: createDto.eventTypeId,
      color: createDto.color,
      startTime: new Date(createDto.startTime),
      endTime: createDto.endTime ? new Date(createDto.endTime) : null,
      isAllDay: createDto.isAllDay || false,
      recurrence: createDto.recurrence,
      recurrenceEndDate: createDto.recurrenceEndDate
        ? new Date(createDto.recurrenceEndDate)
        : null,
      reminderMinutes: createDto.reminderMinutes,
      meetingSessionId: createDto.meetingSessionId,
    };

    const event = this.eventsRepository.create(eventData);
    return this.eventsRepository.save(event);
  }

  /**
   * 워크스페이스의 이벤트 목록 조회
   */
  async findAll(
    workspaceId: string,
    userId: string,
    query: GetEventsQueryDto,
  ): Promise<WorkspaceEvent[]> {
    // 워크스페이스 접근 권한 확인
    await this.validateWorkspaceAccess(workspaceId, userId);

    const queryBuilder = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.createdBy', 'createdBy')
      .leftJoinAndSelect('event.eventType', 'eventType')
      .where('event.workspaceId = :workspaceId', { workspaceId });

    // 날짜 범위 필터
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere(
        '(event.startTime BETWEEN :startDate AND :endDate OR event.endTime BETWEEN :startDate AND :endDate)',
        {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        },
      );
    } else if (query.startDate) {
      queryBuilder.andWhere('event.startTime >= :startDate', {
        startDate: new Date(query.startDate),
      });
    } else if (query.endDate) {
      queryBuilder.andWhere('event.startTime <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    // 이벤트 타입 필터
    if (query.eventTypeId) {
      queryBuilder.andWhere('event.eventTypeId = :eventTypeId', {
        eventTypeId: query.eventTypeId,
      });
    }

    queryBuilder.orderBy('event.startTime', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * 단일 이벤트 조회
   */
  async findOne(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<WorkspaceEvent> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const event = await this.eventsRepository.findOne({
      where: { id: eventId, workspaceId },
      relations: ['createdBy', 'eventType'],
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다');
    }

    return event;
  }

  /**
   * 이벤트 수정
   */
  async update(
    workspaceId: string,
    eventId: string,
    updateDto: UpdateWorkspaceEventDto,
    userId: string,
  ): Promise<WorkspaceEvent> {
    const event = await this.findOne(workspaceId, eventId, userId);

    // 이벤트 생성자 또는 워크스페이스 오너만 수정 가능
    const workspace = await this.workspacesRepository.findOne({
      where: { id: workspaceId },
    });

    if (event.createdById !== userId && workspace?.ownerId !== userId) {
      throw new ForbiddenException('이벤트를 수정할 권한이 없습니다');
    }

    // 업데이트할 필드만 적용
    if (updateDto.title !== undefined) event.title = updateDto.title;
    if (updateDto.description !== undefined)
      event.description = updateDto.description;
    if (updateDto.eventTypeId !== undefined)
      event.eventTypeId = updateDto.eventTypeId;
    if (updateDto.color !== undefined) event.color = updateDto.color;
    if (updateDto.startTime !== undefined)
      event.startTime = new Date(updateDto.startTime);
    if (updateDto.endTime !== undefined)
      event.endTime = updateDto.endTime ? new Date(updateDto.endTime) : null;
    if (updateDto.isAllDay !== undefined) event.isAllDay = updateDto.isAllDay;
    if (updateDto.recurrence !== undefined)
      event.recurrence = updateDto.recurrence;
    if (updateDto.recurrenceEndDate !== undefined)
      event.recurrenceEndDate = updateDto.recurrenceEndDate
        ? new Date(updateDto.recurrenceEndDate)
        : null;
    if (updateDto.reminderMinutes !== undefined)
      event.reminderMinutes = updateDto.reminderMinutes;
    if (updateDto.meetingSessionId !== undefined)
      event.meetingSessionId = updateDto.meetingSessionId;

    return this.eventsRepository.save(event);
  }

  /**
   * 이벤트 삭제
   */
  async remove(
    workspaceId: string,
    eventId: string,
    userId: string,
  ): Promise<void> {
    const event = await this.findOne(workspaceId, eventId, userId);

    // 이벤트 생성자 또는 워크스페이스 오너만 삭제 가능
    const workspace = await this.workspacesRepository.findOne({
      where: { id: workspaceId },
    });

    if (event.createdById !== userId && workspace?.ownerId !== userId) {
      throw new ForbiddenException('이벤트를 삭제할 권한이 없습니다');
    }

    await this.eventsRepository.remove(event);
  }

  /**
   * 특정 월의 이벤트 조회 (캘린더 뷰용)
   */
  async findByMonth(
    workspaceId: string,
    year: number,
    month: number,
    userId: string,
  ): Promise<WorkspaceEvent[]> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    // 해당 월의 시작과 끝
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return this.eventsRepository.find({
      where: [
        {
          workspaceId,
          startTime: Between(startOfMonth, endOfMonth),
        },
        {
          workspaceId,
          endTime: Between(startOfMonth, endOfMonth),
        },
      ],
      relations: ['createdBy', 'eventType'],
      order: { startTime: 'ASC' },
    });
  }

  /**
   * 오늘의 이벤트 조회
   */
  async findToday(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceEvent[]> {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    return this.eventsRepository.find({
      where: {
        workspaceId,
        startTime: Between(startOfDay, endOfDay),
      },
      relations: ['createdBy', 'eventType'],
      order: { startTime: 'ASC' },
    });
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
      throw new NotFoundException('워크스페이스를 찾을 수 없습니다');
    }

    // 오너이거나 멤버인지 확인
    const isOwner = workspace.ownerId === userId;
    const isMember = workspace.members?.some((m) => m.id === userId);

    if (!isOwner && !isMember) {
      throw new ForbiddenException('이 워크스페이스에 접근할 권한이 없습니다');
    }

    return workspace;
  }
}
