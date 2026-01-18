import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceFile, FileType } from './entities/workspace-file.entity';
import { S3StorageService } from '../storage/s3-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceRolesService } from './workspace-roles.service';

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class WorkspaceFilesService {
  private readonly logger = new Logger(WorkspaceFilesService.name);

  constructor(
    @InjectRepository(WorkspaceFile)
    private fileRepository: Repository<WorkspaceFile>,
    private s3StorageService: S3StorageService,
    @Inject(forwardRef(() => WorkspaceRolesService))
    private rolesService: WorkspaceRolesService,
  ) {}

  /**
   * 워크스페이스에 파일 업로드
   */
  /**
   * Decode filename from Latin-1 to UTF-8 (handles Korean and other non-ASCII characters)
   */
  private decodeFilename(filename: string): string {
    try {
      // Try to decode from Latin-1 to UTF-8
      const decoded = Buffer.from(filename, 'latin1').toString('utf-8');
      // Check if the decoded string looks valid (contains actual characters, not replacement chars)
      if (decoded && !decoded.includes('�')) {
        return decoded;
      }
      return filename;
    } catch {
      return filename;
    }
  }

  async uploadFile(
    workspaceId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ): Promise<WorkspaceFile> {
    // Check upload permission
    const hasPermission = await this.rolesService.checkPermission(
      workspaceId,
      uploaderId,
      'uploadFiles',
    );
    if (!hasPermission) {
      throw new ForbiddenException('파일을 업로드할 권한이 없습니다');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기가 10MB를 초과합니다');
    }

    // Determine file type from MIME type
    const fileType = this.getFileType(file.mimetype);
    if (!fileType) {
      throw new BadRequestException(
        `지원하지 않는 파일 형식입니다: ${file.mimetype}`,
      );
    }

    // Decode filename for proper Korean/Unicode support
    const decodedFilename = this.decodeFilename(file.originalname);

    // Generate file ID and S3 key
    const fileId = uuidv4();
    const s3Key = this.s3StorageService.generateFileKey(
      workspaceId,
      fileId,
      decodedFilename,
    );

    // Upload to S3
    await this.s3StorageService.uploadFile(s3Key, file.buffer, file.mimetype);

    // Create database record
    const workspaceFile = this.fileRepository.create({
      id: fileId,
      workspaceId,
      uploaderId,
      filename: decodedFilename,
      s3Key,
      fileType,
      mimeType: file.mimetype,
      size: file.size,
    });

    const savedFile = await this.fileRepository.save(workspaceFile);

    // Return with uploader relation
    const fileWithRelations = await this.fileRepository.findOne({
      where: { id: savedFile.id },
      relations: ['uploader'],
    });

    return fileWithRelations!;
  }

  /**
   * 워크스페이스 파일 목록 조회 (필터링 및 페이지네이션)
   */
  async listFiles(
    workspaceId: string,
    type?: FileType,
    limit: number = 50,
    cursor?: string,
  ): Promise<{
    files: WorkspaceFile[];
    nextCursor: string | null;
    total: number;
  }> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploader', 'uploader')
      .leftJoinAndSelect('file.session', 'session')
      .where('file.workspaceId = :workspaceId', { workspaceId })
      .orderBy('file.createdAt', 'DESC')
      .take(limit + 1);

    if (type) {
      queryBuilder.andWhere('file.fileType = :type', { type });
    }

    if (cursor) {
      const cursorFile = await this.fileRepository.findOne({
        where: { id: cursor },
      });
      if (cursorFile) {
        queryBuilder.andWhere('file.createdAt < :cursorDate', {
          cursorDate: cursorFile.createdAt,
        });
      }
    }

    const files = await queryBuilder.getMany();

    // Count total
    const countQueryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .where('file.workspaceId = :workspaceId', { workspaceId });

    if (type) {
      countQueryBuilder.andWhere('file.fileType = :type', { type });
    }

    const total = await countQueryBuilder.getCount();

    const hasMore = files.length > limit;
    if (hasMore) {
      files.pop();
    }

    return {
      files,
      nextCursor:
        hasMore && files.length > 0 ? files[files.length - 1].id : null,
      total,
    };
  }

  /**
   * 파일 다운로드 URL 반환 (Presigned URL)
   */
  async getDownloadUrl(
    workspaceId: string,
    fileId: string,
  ): Promise<{
    presignedUrl: string;
    filename: string;
    mimeType: string;
    expiresIn: number;
  }> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new NotFoundException('파일을 찾을 수 없습니다');
    }

    const presignedUrl = await this.s3StorageService.getPresignedUrl(
      file.s3Key,
    );

    return {
      presignedUrl,
      filename: file.filename,
      mimeType: file.mimeType,
      expiresIn: 3600,
    };
  }

  /**
   * 파일 이름 변경
   */
  async renameFile(
    workspaceId: string,
    fileId: string,
    newFilename: string,
    userId: string,
    isWorkspaceOwner: boolean,
  ): Promise<WorkspaceFile> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, workspaceId },
      relations: ['uploader'],
    });

    if (!file) {
      throw new NotFoundException('파일을 찾을 수 없습니다');
    }

    // Authorization: owner or uploader can rename
    if (!isWorkspaceOwner && file.uploaderId !== userId) {
      throw new ForbiddenException('이 파일의 이름을 변경할 권한이 없습니다');
    }

    // Update filename
    file.filename = newFilename;
    const savedFile = await this.fileRepository.save(file);

    this.logger.log(`File renamed: ${fileId} to "${newFilename}"`);

    return savedFile;
  }

  /**
   * 파일 삭제
   */
  async deleteFile(
    workspaceId: string,
    fileId: string,
    userId: string,
    isWorkspaceOwner: boolean,
  ): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new NotFoundException('파일을 찾을 수 없습니다');
    }

    // Authorization: owner or uploader can delete
    if (!isWorkspaceOwner && file.uploaderId !== userId) {
      throw new ForbiddenException('이 파일을 삭제할 권한이 없습니다');
    }

    // Delete from S3
    await this.s3StorageService.deleteFile(file.s3Key);

    // Delete from database
    await this.fileRepository.delete(fileId);

    this.logger.log(`File deleted: ${fileId} from workspace ${workspaceId}`);
  }

  /**
   * AI 요약 파일 레코드 생성 (SummaryService에서 호출)
   */
  async createSummaryFileRecord(
    workspaceId: string,
    sessionId: string,
    s3Key: string,
    contentSize: number,
    sessionTitle?: string,
  ): Promise<WorkspaceFile> {
    // Check if summary file already exists for this session
    const existing = await this.fileRepository.findOne({
      where: { sessionId, fileType: FileType.SUMMARY },
    });

    if (existing) {
      // Update existing record
      existing.s3Key = s3Key;
      existing.size = contentSize;
      return this.fileRepository.save(existing);
    }

    // Create new record
    const filename = sessionTitle
      ? `${sessionTitle} - AI 요약.md`
      : `회의 요약 - ${new Date().toLocaleDateString('ko-KR')}.md`;

    const file = this.fileRepository.create({
      workspaceId,
      filename,
      s3Key,
      fileType: FileType.SUMMARY,
      mimeType: 'text/markdown',
      size: contentSize,
      sessionId,
      // uploaderId is undefined for system-generated files
    });

    return this.fileRepository.save(file);
  }

  /**
   * MIME 타입으로 파일 타입 결정
   */
  private getFileType(mimeType: string): FileType | null {
    if (ALLOWED_MIME_TYPES.image.includes(mimeType)) {
      return FileType.IMAGE;
    }
    if (ALLOWED_MIME_TYPES.document.includes(mimeType)) {
      return FileType.DOCUMENT;
    }
    return null;
  }
}
