import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  // 미팅 생성
  @Post()
  create(@Body() createMeetingDto: CreateMeetingDto, @Req() req: any) {
    return this.meetingsService.createMeeting(createMeetingDto, req.user.id);
  }

  // 워크스페이스별 미팅 목록 조회
  @Get()
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.meetingsService.findByWorkspace(workspaceId);
  }

  // 미팅 상세 조회
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  // Chime 미팅 시작 (호스트만)
  @Post(':id/start')
  startMeeting(@Param('id') id: string, @Req() req: any) {
    return this.meetingsService.startChimeMeeting(id, req.user.id);
  }

  // 미팅 참가
  @Post(':id/join')
  joinMeeting(@Param('id') id: string, @Req() req: any) {
    return this.meetingsService.joinMeeting(id, req.user.id);
  }

  // 미팅 나가기
  @Post(':id/leave')
  leaveMeeting(@Param('id') id: string, @Req() req: any) {
    return this.meetingsService.leaveMeeting(id, req.user.id);
  }

  // 미팅 종료 (호스트만)
  @Delete(':id')
  endMeeting(@Param('id') id: string, @Req() req: any) {
    return this.meetingsService.endMeeting(id, req.user.id);
  }

  // 트랜스크립션 시작
  @Post(':id/transcription/start')
  startTranscription(
    @Param('id') id: string,
    @Body('languageCode') languageCode?: string,
  ) {
    return this.meetingsService.startTranscription(id, languageCode);
  }

  // 트랜스크립션 중지
  @Post(':id/transcription/stop')
  stopTranscription(@Param('id') id: string) {
    return this.meetingsService.stopTranscription(id);
  }

  // 미팅 참가자 목록
  @Get(':id/participants')
  getParticipants(@Param('id') id: string) {
    return this.meetingsService.getParticipants(id);
  }

  // 미팅 트랜스크립션 조회
  @Get(':id/transcriptions')
  getTranscriptions(@Param('id') id: string) {
    return this.meetingsService.getTranscriptions(id);
  }

  // Chime 미팅 정보 조회 (클라이언트용)
  @Get(':id/chime-info')
  getMeetingInfo(@Param('id') id: string) {
    return this.meetingsService.getMeetingInfo(id);
  }
}
