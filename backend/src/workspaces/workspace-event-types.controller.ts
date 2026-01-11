import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getAuthUser } from '../auth/interfaces';
import { WorkspaceEventTypesService } from './workspace-event-types.service';
import {
  CreateEventTypeDto,
  UpdateEventTypeDto,
} from './dto/workspace-event-type.dto';

@Controller('workspaces/:workspaceId/event-types')
@UseGuards(JwtAuthGuard)
export class WorkspaceEventTypesController {
  constructor(private readonly eventTypesService: WorkspaceEventTypesService) {}

  /**
   * 커스텀 이벤트 타입 생성
   */
  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: CreateEventTypeDto,
    @Req() req: any,
  ) {
    return this.eventTypesService.create(workspaceId, createDto, getAuthUser(req).id);
  }

  /**
   * 워크스페이스의 모든 이벤트 타입 조회
   */
  @Get()
  findAll(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.eventTypesService.findAll(workspaceId, getAuthUser(req).id);
  }

  /**
   * 단일 이벤트 타입 조회
   */
  @Get(':typeId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
    @Req() req: any,
  ) {
    return this.eventTypesService.findOne(workspaceId, typeId, getAuthUser(req).id);
  }

  /**
   * 이벤트 타입 수정
   */
  @Put(':typeId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
    @Body() updateDto: UpdateEventTypeDto,
    @Req() req: any,
  ) {
    return this.eventTypesService.update(
      workspaceId,
      typeId,
      updateDto,
      getAuthUser(req).id,
    );
  }

  /**
   * 이벤트 타입 삭제 (기본 타입 제외)
   */
  @Delete(':typeId')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
    @Req() req: any,
  ) {
    await this.eventTypesService.remove(workspaceId, typeId, getAuthUser(req).id);
    return { message: '이벤트 유형이 삭제되었습니다.' };
  }
}
