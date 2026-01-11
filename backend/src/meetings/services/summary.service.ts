import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingSession, SummaryStatus } from '../entities/meeting-session.entity';
import { TranscriptionService } from './transcription.service';
import { BedrockService, StructuredSummary, SummarySection } from '../../ai/bedrock.service';
import { EventExtractionService } from '../../ai/event-extraction.service';
import { S3StorageService } from '../../storage/s3-storage.service';
import { WorkspaceFilesService } from '../../workspaces/workspace-files.service';
import { WorkspaceGateway } from '../../workspaces/workspace.gateway';

// Re-export types for use in other modules
export type { StructuredSummary, SummarySection };

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    private transcriptionService: TranscriptionService,
    private bedrockService: BedrockService,
    private eventExtractionService: EventExtractionService,
    private s3StorageService: S3StorageService,
    private workspaceFilesService: WorkspaceFilesService,
    @Inject(forwardRef(() => WorkspaceGateway))
    private workspaceGateway: WorkspaceGateway,
  ) {}

  /**
   * 회의 요약을 생성하고 S3에 저장합니다.
   * @param sessionId 세션 ID
   */
  async generateAndSaveSummary(sessionId: string): Promise<void> {
    this.logger.log(`[Summary] Starting summary generation for session: ${sessionId}`);

    // 세션 조회
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      this.logger.error(`[Summary] Session not found: ${sessionId}`);
      return;
    }

    // 이미 완료되었으면 스킵
    if (session.summaryStatus === SummaryStatus.COMPLETED) {
      this.logger.log(`[Summary] Summary already completed for session: ${sessionId}`);
      return;
    }

    // 1. 발화 스크립트 조회 (PROCESSING 전에 먼저 체크)
    const transcriptData = await this.transcriptionService.getTranscriptForSummary(sessionId);

    // 2. 발화 기록이 없으면 AI 요약 생성하지 않음
    if (!transcriptData.fullText || transcriptData.transcripts.length === 0) {
      this.logger.log(`[Summary] No transcripts for session ${sessionId}, skipping AI summary`);
      await this.sessionRepository.update(sessionId, {
        summaryStatus: SummaryStatus.SKIPPED,
      });
      // WebSocket 알림
      this.workspaceGateway.broadcastSummaryStatus({
        type: 'summary_status_update',
        workspaceId: session.workspaceId,
        sessionId,
        status: 'skipped',
        message: '요약할 내용이 없습니다',
      });
      return;
    }

    this.logger.log(
      `[Summary] Found ${transcriptData.transcripts.length} transcripts, ` +
      `${transcriptData.speakers.length} speakers for session ${sessionId}`,
    );

    // 상태 업데이트: PROCESSING (발화 기록이 있을 때만)
    await this.sessionRepository.update(sessionId, {
      summaryStatus: SummaryStatus.PROCESSING,
    });
    // WebSocket 알림 - 처리 시작
    this.workspaceGateway.broadcastSummaryStatus({
      type: 'summary_status_update',
      workspaceId: session.workspaceId,
      sessionId,
      status: 'processing',
      message: `${transcriptData.transcripts.length}개의 발언을 분석하고 있습니다`,
    });

    try {
      // 3. 발화 스크립트 포맷팅 (resultId 포함)
      const formattedTranscript = this.formatTranscriptWithIds(transcriptData);

      // 4. Bedrock으로 구조화된 요약 생성
      const structuredSummary = await this.bedrockService.generateSummaryWithRefs(formattedTranscript);

      // 5. S3에 JSON 형식으로 저장 (새로운 워크스페이스 중심 구조 사용)
      const s3Key = this.s3StorageService.generateSummaryKeyV2(
        session.workspaceId,
        sessionId,
      ).replace('.md', '.json'); // JSON 확장자로 변경

      const summaryJson = JSON.stringify(structuredSummary, null, 2);

      await this.s3StorageService.uploadFile(
        s3Key,
        Buffer.from(summaryJson, 'utf-8'),
        'application/json; charset=utf-8',
      );

      // 6. WorkspaceFile 레코드 생성 (파일 저장소에 표시용)
      await this.workspaceFilesService.createSummaryFileRecord(
        session.workspaceId,
        sessionId,
        s3Key,
        Buffer.byteLength(summaryJson, 'utf-8'),
        session.title,
      );

      // 7. DB에 S3 키 저장 및 상태 업데이트
      await this.sessionRepository.update(sessionId, {
        summaryS3Key: s3Key,
        summaryStatus: SummaryStatus.COMPLETED,
      });

      this.logger.log(`[Summary] Summary completed for session ${sessionId}, S3 key: ${s3Key}`);

      // WebSocket 알림 - 완료
      this.workspaceGateway.broadcastSummaryStatus({
        type: 'summary_status_update',
        workspaceId: session.workspaceId,
        sessionId,
        status: 'completed',
        message: '요약이 완료되었습니다',
      });

      // 8. 이벤트 자동 추출 및 생성 (비동기, 요약 완료 후)
      this.extractAndCreateEventsAsync(
        sessionId,
        session.workspaceId,
        session.hostId,
        formattedTranscript,
      );
    } catch (error) {
      this.logger.error(`[Summary] Failed to generate summary for ${sessionId}:`, error);

      // 상태 업데이트: FAILED
      await this.sessionRepository.update(sessionId, {
        summaryStatus: SummaryStatus.FAILED,
      });

      // WebSocket 알림 - 실패
      this.workspaceGateway.broadcastSummaryStatus({
        type: 'summary_status_update',
        workspaceId: session.workspaceId,
        sessionId,
        status: 'failed',
        message: '요약 생성에 실패했습니다',
      });
    }
  }

  /**
   * AI용 발화 스크립트 포맷팅 (resultId 포함)
   */
  private formatTranscriptWithIds(data: {
    transcripts: Array<{
      resultId?: string;
      speakerName: string | null;
      text: string;
    }>;
  }): string {
    return data.transcripts
      .map((t, idx) => `[ID:${t.resultId || `t-${idx}`}][${t.speakerName || '참가자'}]: ${t.text}`)
      .join('\n');
  }

  /**
   * 세션의 요약을 조회합니다.
   * @param sessionId 세션 ID
   * @returns 요약 정보 (구조화된 요약 포함)
   */
  async getSummary(sessionId: string): Promise<{
    status: SummaryStatus;
    content: string | null;
    structuredSummary: StructuredSummary | null;
    presignedUrl: string | null;
  }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (session.summaryStatus !== SummaryStatus.COMPLETED || !session.summaryS3Key) {
      return {
        status: session.summaryStatus,
        content: null,
        structuredSummary: null,
        presignedUrl: null,
      };
    }

    try {
      // S3에서 콘텐츠 가져오기
      const rawContent = await this.s3StorageService.getSummaryContent(session.summaryS3Key);
      const presignedUrl = await this.s3StorageService.getPresignedUrl(session.summaryS3Key);

      // JSON 파싱 시도 (새 형식)
      let structuredSummary: StructuredSummary | null = null;
      let content: string | null = null;

      try {
        const parsed = JSON.parse(rawContent);
        // 새 형식인지 확인 (sections 배열이 있어야 함)
        if (parsed.sections && Array.isArray(parsed.sections)) {
          structuredSummary = parsed;
          content = parsed.markdown || null;
        } else {
          // JSON이지만 새 형식이 아님
          content = rawContent;
          structuredSummary = null;
        }
      } catch {
        // 구 형식 (순수 마크다운)인 경우 - structuredSummary는 null로 유지
        content = rawContent;
        structuredSummary = null;
      }

      return {
        status: session.summaryStatus,
        content,
        structuredSummary,
        presignedUrl,
      };
    } catch (error) {
      this.logger.error(`[Summary] Failed to get summary content for ${sessionId}:`, error);
      return {
        status: session.summaryStatus,
        content: null,
        structuredSummary: null,
        presignedUrl: null,
      };
    }
  }

  /**
   * 요약을 재생성합니다.
   * @param sessionId 세션 ID
   */
  async regenerateSummary(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    // 상태 초기화 (기존 S3 키는 유지, 새로운 요약이 완료되면 덮어씀)
    await this.sessionRepository.update(sessionId, {
      summaryStatus: SummaryStatus.PENDING,
    });

    // 비동기로 요약 재생성
    this.generateAndSaveSummary(sessionId).catch((err) => {
      this.logger.error(`[Summary] Regeneration failed for ${sessionId}:`, err);
    });

    return {
      success: true,
      message: '요약 재생성이 시작되었습니다.',
    };
  }

  /**
   * 녹취록에서 이벤트를 추출하고 캘린더에 자동 등록합니다.
   * 이 메서드는 요약 생성 완료 후 비동기적으로 호출됩니다.
   */
  private async extractAndCreateEventsAsync(
    sessionId: string,
    workspaceId: string,
    hostId: string,
    formattedTranscript: string,
  ): Promise<void> {
    try {
      this.logger.log(`[EventExtraction] Starting event extraction for session: ${sessionId}`);

      const result = await this.eventExtractionService.extractAndCreateEvents(
        sessionId,
        workspaceId,
        hostId,
        formattedTranscript,
      );

      if (result.created > 0 || result.pending > 0) {
        // WebSocket 알림 - 자동 이벤트 생성
        this.workspaceGateway.server
          .to(`workspace:${workspaceId}`)
          .emit('autoEventsCreated', {
            sessionId,
            createdCount: result.created,
            pendingCount: result.pending,
            createdEventIds: result.createdEventIds,
          });

        this.logger.log(
          `[EventExtraction] Auto-created ${result.created} events, ` +
          `${result.pending} pending for session ${sessionId}`,
        );
      } else {
        this.logger.log(`[EventExtraction] No events extracted from session ${sessionId}`);
      }
    } catch (error) {
      // 이벤트 추출 실패해도 요약은 성공으로 처리 (로그만 남김)
      this.logger.warn(
        `[EventExtraction] Event extraction failed for session ${sessionId}:`,
        error,
      );
    }
  }
}
