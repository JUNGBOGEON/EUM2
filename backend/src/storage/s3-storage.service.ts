import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const region =
      this.configService.get<string>('S3_REGION') || 'ap-northeast-2';
    this.bucket =
      this.configService.get<string>('S3_BUCKET_NAME') ||
      'eum2-meeting-summaries';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured for S3');
    }

    this.s3Client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    this.logger.log(
      `S3StorageService initialized with bucket: ${this.bucket}, region: ${region}`,
    );
  }

  /**
   * 회의 요약을 S3에 업로드합니다.
   * @param sessionId 세션 ID
   * @param workspaceId 워크스페이스 ID
   * @param content 마크다운 컨텐츠
   * @returns S3 키
   */
  async uploadSummary(
    sessionId: string,
    workspaceId: string,
    content: string,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const key = `meetings/${year}/${month}/${workspaceId}/${sessionId}/summary.md`;

    try {
      this.logger.log(`Uploading summary to S3: ${key}`);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: content,
          ContentType: 'text/markdown; charset=utf-8',
        }),
      );

      this.logger.log(`Summary uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload summary to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3 객체에 대한 Presigned URL을 생성합니다.
   * @param key S3 키
   * @param expiresIn 만료 시간 (초, 기본 1시간)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3에서 요약 내용을 가져옵니다.
   * @param key S3 키
   * @returns 마크다운 컨텐츠
   */
  async getSummaryContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body?.transformToString('utf-8');

      if (!content) {
        throw new Error('Empty content from S3');
      }

      return content;
    } catch (error) {
      this.logger.error(`Failed to get summary content from S3: ${key}`, error);
      throw error;
    }
  }

  // ===== 새로운 워크스페이스 파일 관련 메서드 =====

  /**
   * 워크스페이스 파일용 S3 키 생성
   */
  generateFileKey(
    workspaceId: string,
    fileId: string,
    originalFilename: string,
  ): string {
    const sanitizedFilename = this.sanitizeFilename(originalFilename);
    return `workspaces/${workspaceId}/files/${fileId}_${sanitizedFilename}`;
  }

  /**
   * AI 요약용 S3 키 생성 (새로운 워크스페이스 중심 구조)
   */
  generateSummaryKeyV2(workspaceId: string, sessionId: string): string {
    return `workspaces/${workspaceId}/summaries/${sessionId}.md`;
  }

  /**
   * 파일을 S3에 업로드
   */
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      this.logger.log(`Uploading file to S3: ${key}`);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      this.logger.log(`File uploaded successfully: ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * S3에서 파일 삭제
   */
  async deleteFile(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from S3: ${key}`);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * 파일명 정제 (S3 키에 안전하게 사용)
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9가-힣._-]/g, '_') // Keep alphanumeric, Korean, dots, underscores, hyphens
      .substring(0, 100); // Limit length
  }
}
