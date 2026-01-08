import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingSession, SummaryStatus } from '../entities/meeting-session.entity';
import { TranscriptionService } from './transcription.service';
import { BedrockService } from '../../ai/bedrock.service';
import { S3StorageService } from '../../storage/s3-storage.service';
import { WorkspaceFilesService } from '../../workspaces/workspace-files.service';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(MeetingSession)
    private sessionRepository: Repository<MeetingSession>,
    private transcriptionService: TranscriptionService,
    private bedrockService: BedrockService,
    private s3StorageService: S3StorageService,
    private workspaceFilesService: WorkspaceFilesService,
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

    try {
      // 3. 발화 스크립트 포맷팅
      const formattedTranscript = this.formatTranscriptForAI(transcriptData);

      // 4. Bedrock으로 요약 생성
      const summaryMarkdown = await this.bedrockService.generateSummary(formattedTranscript);

      // 5. S3에 저장 (새로운 워크스페이스 중심 구조 사용)
      const s3Key = this.s3StorageService.generateSummaryKeyV2(
        session.workspaceId,
        sessionId,
      );

      await this.s3StorageService.uploadFile(
        s3Key,
        Buffer.from(summaryMarkdown, 'utf-8'),
        'text/markdown; charset=utf-8',
      );

      // 6. WorkspaceFile 레코드 생성 (파일 저장소에 표시용)
      await this.workspaceFilesService.createSummaryFileRecord(
        session.workspaceId,
        sessionId,
        s3Key,
        Buffer.byteLength(summaryMarkdown, 'utf-8'),
        session.title,
      );

      // 7. DB에 S3 키 저장 및 상태 업데이트
      await this.sessionRepository.update(sessionId, {
        summaryS3Key: s3Key,
        summaryStatus: SummaryStatus.COMPLETED,
      });

      this.logger.log(`[Summary] Summary completed for session ${sessionId}, S3 key: ${s3Key}`);
    } catch (error) {
      this.logger.error(`[Summary] Failed to generate summary for ${sessionId}:`, error);

      // 상태 업데이트: FAILED
      await this.sessionRepository.update(sessionId, {
        summaryStatus: SummaryStatus.FAILED,
      });
    }
  }

  /**
   * AI용 발화 스크립트 포맷팅
   */
  private formatTranscriptForAI(data: {
    transcripts: Array<{
      speakerName: string | null;
      text: string;
    }>;
  }): string {
    return data.transcripts
      .map((t) => `[${t.speakerName || '참가자'}]: ${t.text}`)
      .join('\n');
  }

  /**
   * 세션의 요약을 조회합니다.
   * @param sessionId 세션 ID
   * @returns 요약 정보
   */
  async getSummary(sessionId: string): Promise<{
    status: SummaryStatus;
    content: string | null;
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
        presignedUrl: null,
      };
    }

    try {
      // S3에서 콘텐츠 가져오기
      const content = await this.s3StorageService.getSummaryContent(session.summaryS3Key);
      const presignedUrl = await this.s3StorageService.getPresignedUrl(session.summaryS3Key);

      return {
        status: session.summaryStatus,
        content,
        presignedUrl,
      };
    } catch (error) {
      this.logger.error(`[Summary] Failed to get summary content for ${sessionId}:`, error);
      return {
        status: session.summaryStatus,
        content: null,
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
}
