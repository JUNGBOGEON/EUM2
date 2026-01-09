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
import { StartSessionDto } from './dto/start-session.dto';
import { SaveTranscriptionDto, SaveTranscriptionBatchDto } from './dto/save-transcription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  // ==========================================
  // 세션 관리 API
  // ==========================================

  /**
   * 워크스페이스에서 세션 시작
   * - 활성 세션이 있으면 해당 세션에 참가
   * - 없으면 새 세션 생성 후 참가
   */
  @Post('sessions/start')
  startSession(@Body() dto: StartSessionDto, @Req() req: any) {
    return this.meetingsService.startSession(dto.workspaceId, req.user.id, dto.title);
  }

  /**
   * 세션 참가
   */
  @Post('sessions/:sessionId/join')
  joinSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.joinSession(sessionId, req.user.id);
  }

  /**
   * 세션 나가기
   */
  @Post('sessions/:sessionId/leave')
  leaveSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.leaveSession(sessionId, req.user.id);
  }

  /**
   * 세션 종료 (호스트만)
   */
  @Delete('sessions/:sessionId')
  endSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.endSession(sessionId, req.user.id);
  }

  /**
   * 세션 상세 조회
   */
  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.meetingsService.findSession(sessionId);
  }

  /**
   * 워크스페이스의 활성 세션 조회
   */
  @Get('workspaces/:workspaceId/active-session')
  getActiveSession(@Param('workspaceId') workspaceId: string) {
    return this.meetingsService.getActiveSession(workspaceId);
  }

  /**
   * 워크스페이스의 세션 히스토리 조회
   */
  @Get('workspaces/:workspaceId/sessions')
  getSessionHistory(@Param('workspaceId') workspaceId: string) {
    return this.meetingsService.getSessionHistory(workspaceId);
  }

  /**
   * 세션 참가자 목록
   */
  @Get('sessions/:sessionId/participants')
  getParticipants(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getParticipants(sessionId);
  }

  /**
   * Chime 미팅 정보 조회 (클라이언트용)
   */
  @Get('sessions/:sessionId/chime-info')
  getSessionInfo(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getSessionInfo(sessionId);
  }

  // ==========================================
  // 트랜스크립션 API
  // ==========================================

  /**
   * 트랜스크립션 시작
   */
  @Post(':sessionId/transcription/start')
  startTranscription(
    @Param('sessionId') sessionId: string,
    @Body('languageCode') languageCode?: string,
  ) {
    return this.meetingsService.startTranscription(sessionId, languageCode);
  }

  /**
   * 트랜스크립션 중지
   */
  @Post(':sessionId/transcription/stop')
  stopTranscription(@Param('sessionId') sessionId: string) {
    return this.meetingsService.stopTranscription(sessionId);
  }

  /**
   * 트랜스크립션 언어 변경 (실시간)
   * - 세션 전체 음성 인식 언어 변경 + 사용자별 번역 타겟 언어도 함께 업데이트
   */
  @Post(':sessionId/transcription/change-language')
  changeTranscriptionLanguage(
    @Param('sessionId') sessionId: string,
    @Body('languageCode') languageCode: string,
    @Req() req: any,
  ) {
    return this.meetingsService.changeTranscriptionLanguage(sessionId, languageCode, req.user.id);
  }

  /**
   * 현재 트랜스크립션 언어 조회
   */
  @Get(':sessionId/transcription/language')
  getCurrentTranscriptionLanguage(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getCurrentTranscriptionLanguage(sessionId);
  }

  /**
   * 세션 트랜스크립션 조회
   */
  @Get(':sessionId/transcriptions')
  getTranscriptions(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getTranscriptions(sessionId);
  }

  /**
   * 최종 트랜스크립션만 조회 (isPartial = false)
   */
  @Get(':sessionId/transcriptions/final')
  getFinalTranscriptions(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getFinalTranscriptions(sessionId);
  }

  /**
   * 발화자별 트랜스크립션 그룹화 조회
   */
  @Get(':sessionId/transcriptions/by-speaker')
  getTranscriptionsBySpeaker(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getTranscriptionsBySpeaker(sessionId);
  }

  /**
   * AI 요약용 트랜스크립트 조회
   */
  @Get(':sessionId/transcriptions/summary')
  getTranscriptForSummary(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getTranscriptForSummary(sessionId);
  }

  /**
   * 트랜스크립션 저장 (프론트엔드에서 실시간 전송)
   */
  @Post(':sessionId/transcriptions')
  saveTranscription(
    @Param('sessionId') sessionId: string,
    @Body() dto: SaveTranscriptionDto,
  ) {
    return this.meetingsService.saveTranscription({ ...dto, sessionId });
  }

  /**
   * 트랜스크립션 일괄 저장
   */
  @Post(':sessionId/transcriptions/batch')
  saveTranscriptionBatch(
    @Param('sessionId') sessionId: string,
    @Body() dto: SaveTranscriptionBatchDto,
  ) {
    return this.meetingsService.saveTranscriptionBatch({ ...dto, sessionId });
  }

  /**
   * 트랜스크립션 버퍼 수동 플러시 (DB 저장)
   */
  @Post(':sessionId/transcriptions/flush')
  flushTranscriptionBuffer(@Param('sessionId') sessionId: string) {
    return this.meetingsService.flushTranscriptionBuffer(sessionId);
  }

  /**
   * 트랜스크립션 버퍼 상태 조회
   */
  @Get(':sessionId/transcriptions/buffer-status')
  getTranscriptionBufferStatus(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getTranscriptionBufferStatus(sessionId);
  }

  /**
   * 중복 트랜스크립션 정리 (관리자용)
   */
  @Post('transcriptions/cleanup-duplicates')
  cleanupDuplicateTranscriptions() {
    return this.meetingsService.cleanupDuplicateTranscriptions();
  }

  // ==========================================
  // 요약 API
  // ==========================================

  /**
   * 세션 요약 조회
   * - status: 요약 생성 상태 (pending, processing, completed, failed, skipped)
   * - content: 요약 마크다운 (completed 상태일 때만)
   * - presignedUrl: S3 Presigned URL (completed 상태일 때만)
   */
  @Get(':sessionId/summary')
  getSummary(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getSummary(sessionId);
  }

  /**
   * 세션 요약 재생성
   * - 요약이 실패했거나 다시 생성하고 싶을 때 사용
   */
  @Post(':sessionId/summary/regenerate')
  regenerateSummary(@Param('sessionId') sessionId: string) {
    return this.meetingsService.regenerateSummary(sessionId);
  }

  // ==========================================
  // 번역 API
  // ==========================================

  /**
   * 번역 활성화/비활성화 토글
   */
  @Post(':sessionId/translation/toggle')
  toggleTranslation(
    @Param('sessionId') sessionId: string,
    @Body('enabled') enabled: boolean,
    @Req() req: any,
  ) {
    return this.meetingsService.toggleTranslation(sessionId, req.user.id, enabled);
  }

  /**
   * 번역 상태 조회 (활성화 여부 + 사용자 언어)
   */
  @Get(':sessionId/translation/status')
  getTranslationStatus(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.meetingsService.getTranslationStatus(sessionId, req.user.id);
  }

  /**
   * 사용자 언어 설정 변경 (기존 changeLanguage 확장)
   */
  @Post(':sessionId/translation/language')
  setUserLanguage(
    @Param('sessionId') sessionId: string,
    @Body('languageCode') languageCode: string,
    @Req() req: any,
  ) {
    return this.meetingsService.setUserLanguage(sessionId, req.user.id, languageCode);
  }

  /**
   * 세션 참가자들의 언어 설정 목록
   */
  @Get(':sessionId/translation/preferences')
  getLanguagePreferences(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getSessionLanguagePreferences(sessionId);
  }
}
