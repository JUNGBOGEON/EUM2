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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { StartSessionDto } from './dto/start-session.dto';
import {
  SaveTranscriptionDto,
  SaveTranscriptionBatchDto,
} from './dto/save-transcription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getAuthUser } from '../auth/interfaces';
import {
  TranscribeUrlService,
  SupportedLanguage,
} from './services/transcribe-url.service';
import { WorkspaceRolesService } from '../workspaces/workspace-roles.service';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcribeUrlService: TranscribeUrlService,
    private readonly rolesService: WorkspaceRolesService,
  ) {}

  // ==========================================
  // 세션 관리 API
  // ==========================================

  /**
   * 워크스페이스에서 세션 시작
   * - 활성 세션이 있으면 해당 세션에 참가
   * - 없으면 새 세션 생성 후 참가
   */
  @Post('sessions/start')
  async startSession(@Body() dto: StartSessionDto, @Req() req: any) {
    const userId = getAuthUser(req).id;

    // Check joinCalls permission
    const hasPermission = await this.rolesService.checkPermission(
      dto.workspaceId,
      userId,
      'joinCalls',
    );
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to join calls');
    }

    return this.meetingsService.startSession(
      dto.workspaceId,
      userId,
      dto.title,
      dto.category,
      dto.maxParticipants,
    );
  }

  /**
   * 세션 참가
   */
  @Post('sessions/:sessionId/join')
  async joinSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = getAuthUser(req).id;

    // Get session to find workspaceId
    const session = await this.meetingsService.findSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Check joinCalls permission
    const hasPermission = await this.rolesService.checkPermission(
      session.workspaceId,
      userId,
      'joinCalls',
    );
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to join calls');
    }

    return this.meetingsService.joinSession(sessionId, userId);
  }

  /**
   * 세션 나가기
   */
  @Post('sessions/:sessionId/leave')
  leaveSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.leaveSession(sessionId, getAuthUser(req).id);
  }

  /**
   * 세션 종료 (호스트만)
   * @param generateSummary - AI 요약 생성 여부 (기본값: true)
   */
  @Delete('sessions/:sessionId')
  endSession(
    @Param('sessionId') sessionId: string,
    @Query('generateSummary') generateSummary: string,
    @Req() req: any,
  ) {
    // Query string은 문자열로 오므로 boolean으로 변환 (기본값: true)
    const shouldGenerateSummary = generateSummary !== 'false';
    return this.meetingsService.endSession(
      sessionId,
      getAuthUser(req).id,
      shouldGenerateSummary,
    );
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
  // 글로벌 캘린더 API
  // ==========================================

  /**
   * 내 캘린더 조회 (모든 워크스페이스 일정)
   */
  @Get('my-calendar')
  getMyCalendar(@Req() req: any) {
    return this.meetingsService.getMyCalendar(getAuthUser(req).id);
  }

  /**
   * 내 아카이브 조회 (모든 워크스페이스의 종료된 미팅)
   */
  @Get('my-archives')
  getMyArchives(@Req() req: any) {
    return this.meetingsService.getMyArchives(getAuthUser(req).id);
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
    return this.meetingsService.changeTranscriptionLanguage(
      sessionId,
      languageCode,
      getAuthUser(req).id,
    );
  }

  /**
   * 현재 트랜스크립션 언어 조회 (사용자별)
   */
  @Get(':sessionId/transcription/language')
  getCurrentTranscriptionLanguage(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.meetingsService.getCurrentTranscriptionLanguage(
      sessionId,
      getAuthUser(req).id,
    );
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
  getSummary(
    @Param('sessionId') sessionId: string,
    @Query('lang') languageCode?: string,
  ) {
    return this.meetingsService.getSummary(sessionId, languageCode);
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
    return this.meetingsService.toggleTranslation(
      sessionId,
      getAuthUser(req).id,
      enabled,
    );
  }

  /**
   * 번역 상태 조회 (활성화 여부 + 사용자 언어)
   */
  @Get(':sessionId/translation/status')
  getTranslationStatus(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.getTranslationStatus(
      sessionId,
      getAuthUser(req).id,
    );
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
    return this.meetingsService.setUserLanguage(
      sessionId,
      getAuthUser(req).id,
      languageCode,
    );
  }

  /**
   * 세션 참가자들의 언어 설정 목록
   */
  @Get(':sessionId/translation/preferences')
  getLanguagePreferences(@Param('sessionId') sessionId: string) {
    return this.meetingsService.getSessionLanguagePreferences(sessionId);
  }

  // ==========================================
  // TTS API
  // ==========================================

  /**
   * TTS 활성화/비활성화 토글
   */
  @Post(':sessionId/tts/toggle')
  toggleTTS(
    @Param('sessionId') sessionId: string,
    @Body('enabled') enabled: boolean,
    @Req() req: any,
  ) {
    return this.meetingsService.toggleTTS(
      sessionId,
      getAuthUser(req).id,
      enabled,
    );
  }

  /**
   * TTS 상태 조회
   */
  @Get(':sessionId/tts/status')
  getTTSStatus(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.getTTSStatus(sessionId, getAuthUser(req).id);
  }

  /**
   * TTS 전체 설정 조회
   */
  @Get(':sessionId/tts/preferences')
  getTTSPreferences(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.meetingsService.getTTSPreferences(
      sessionId,
      getAuthUser(req).id,
    );
  }

  /**
   * TTS 음성 설정
   */
  @Post(':sessionId/tts/voice')
  setTTSVoice(
    @Param('sessionId') sessionId: string,
    @Body('languageCode') languageCode: string,
    @Body('voiceId') voiceId: string,
    @Req() req: any,
  ) {
    return this.meetingsService.setTTSVoice(
      sessionId,
      getAuthUser(req).id,
      languageCode,
      voiceId,
    );
  }

  /**
   * 특정 언어의 사용 가능한 음성 목록
   */
  @Get(':sessionId/tts/voices')
  getTTSVoices(@Query('languageCode') languageCode: string = 'ko-KR') {
    return this.meetingsService.getTTSVoices(languageCode);
  }

  /**
   * TTS 볼륨 설정
   */
  @Post(':sessionId/tts/volume')
  setTTSVolume(
    @Param('sessionId') sessionId: string,
    @Body('volume') volume: number,
    @Req() req: any,
  ) {
    return this.meetingsService.setTTSVolume(
      sessionId,
      getAuthUser(req).id,
      volume,
    );
  }

  /**
   * TTS 지원 언어 목록
   */
  @Get(':sessionId/tts/languages')
  getTTSSupportedLanguages() {
    return this.meetingsService.getTTSSupportedLanguages();
  }

  // ==========================================
  // 클라이언트 STT API (AWS Transcribe Streaming)
  // ==========================================

  /**
   * AWS Transcribe Streaming Pre-signed URL 발급
   *
   * 클라이언트가 직접 AWS Transcribe Streaming에 연결하여
   * 사용자가 선택한 언어로 음성 인식을 수행할 수 있도록
   * AWS Signature V4로 서명된 WebSocket URL을 발급합니다.
   *
   * @param sessionId 세션 ID (참가자 권한 확인용)
   * @param languageCode 음성 인식 언어 코드 (ko-KR, en-US, ja-JP, zh-CN)
   * @returns Pre-signed WebSocket URL (유효기간: 5분)
   */
  @Get('sessions/:sessionId/transcribe-url')
  async getTranscribePresignedUrl(
    @Param('sessionId') sessionId: string,
    @Query('languageCode') languageCode: string = 'ko-KR',
    @Req() req: any,
  ) {
    // 언어 코드 유효성 검사
    if (!this.transcribeUrlService.isLanguageSupported(languageCode)) {
      throw new BadRequestException(
        `Unsupported language code: ${languageCode}. Supported: ${TranscribeUrlService.SUPPORTED_LANGUAGES.join(', ')}`,
      );
    }

    // 참가자 권한 확인
    await this.meetingsService.verifyParticipant(
      sessionId,
      getAuthUser(req).id,
    );

    // Pre-signed URL 생성
    return this.transcribeUrlService.generatePresignedUrl(languageCode);
  }
}
