import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkspaceEventsService } from './workspace-events.service';
import {
  CreateWorkspaceEventDto,
  UpdateWorkspaceEventDto,
  GetEventsQueryDto,
} from './dto/workspace-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getAuthUser } from '../auth/interfaces';

@Controller('workspaces/:workspaceId/events')
@UseGuards(JwtAuthGuard)
export class WorkspaceEventsController {
  constructor(private readonly eventsService: WorkspaceEventsService) {}

  /**
   * 이벤트 생성
   */
  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: CreateWorkspaceEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.create(
      workspaceId,
      createDto,
      getAuthUser(req).id,
    );
  }

  /**
   * 이벤트 목록 조회
   */
  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: GetEventsQueryDto,
    @Req() req: any,
  ) {
    return this.eventsService.findAll(workspaceId, getAuthUser(req).id, query);
  }

  /**
   * 특정 월의 이벤트 조회 (캘린더 뷰용)
   */
  @Get('month/:year/:month')
  findByMonth(
    @Param('workspaceId') workspaceId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: any,
  ) {
    return this.eventsService.findByMonth(
      workspaceId,
      year,
      month,
      getAuthUser(req).id,
    );
  }

  /**
   * 오늘의 이벤트 조회
   */
  @Get('today')
  findToday(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.eventsService.findToday(workspaceId, getAuthUser(req).id);
  }

  /**
   * 단일 이벤트 조회
   */
  @Get(':eventId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Req() req: any,
  ) {
    return this.eventsService.findOne(
      workspaceId,
      eventId,
      getAuthUser(req).id,
    );
  }

  /**
   * 이벤트 수정
   */
  @Put(':eventId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() updateDto: UpdateWorkspaceEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.update(
      workspaceId,
      eventId,
      updateDto,
      getAuthUser(req).id,
    );
  }

  /**
   * 이벤트 삭제
   */
  @Delete(':eventId')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Req() req: any,
  ) {
    await this.eventsService.remove(workspaceId, eventId, getAuthUser(req).id);
    return { success: true, message: '이벤트가 삭제되었습니다' };
  }
}
