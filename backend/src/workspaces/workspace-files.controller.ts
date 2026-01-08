import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceFilesService } from './workspace-files.service';
import { FileQueryDto } from './dto/file-query.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces/:workspaceId/files')
@UseGuards(JwtAuthGuard)
export class WorkspaceFilesController {
  constructor(
    private readonly filesService: WorkspaceFilesService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * 파일 업로드
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    // Verify workspace access
    await this.workspacesService.findOne(workspaceId);

    return this.filesService.uploadFile(workspaceId, req.user.id, file);
  }

  /**
   * 파일 목록 조회
   */
  @Get()
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @Query() query: FileQueryDto,
  ) {
    // Verify workspace access
    await this.workspacesService.findOne(workspaceId);

    return this.filesService.listFiles(
      workspaceId,
      query.type,
      query.limit,
      query.cursor,
    );
  }

  /**
   * 파일 다운로드 URL 조회
   */
  @Get(':fileId/download')
  async getDownloadUrl(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.getDownloadUrl(workspaceId, fileId);
  }

  /**
   * 파일 이름 변경
   */
  @Patch(':fileId')
  async renameFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() body: { filename: string },
    @Req() req: any,
  ) {
    const workspace = await this.workspacesService.findOne(workspaceId);
    const isOwner = workspace.ownerId === req.user.id;

    return this.filesService.renameFile(workspaceId, fileId, body.filename, req.user.id, isOwner);
  }

  /**
   * 파일 삭제
   */
  @Delete(':fileId')
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Req() req: any,
  ) {
    const workspace = await this.workspacesService.findOne(workspaceId);
    const isOwner = workspace.ownerId === req.user.id;

    await this.filesService.deleteFile(workspaceId, fileId, req.user.id, isOwner);

    return { success: true, message: '파일이 삭제되었습니다' };
  }
}
