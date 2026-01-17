import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { getAuthUser } from '../../auth/interfaces';
import { VoiceEnrollmentService } from '../services/voice-enrollment.service';

interface ToggleVoiceDubbingDto {
  enabled: boolean;
}

@Controller('users/voice')
@UseGuards(JwtAuthGuard)
export class VoiceEnrollmentController {
  constructor(
    private readonly voiceEnrollmentService: VoiceEnrollmentService,
  ) {}

  /**
   * 음성 등록
   * POST /api/users/voice/enroll
   * Content-Type: multipart/form-data
   * Body: { audio: File }
   */
  @Post('enroll')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, callback) => {
        // 허용된 오디오 MIME 타입
        const allowedMimeTypes = [
          'audio/webm',
          'audio/wav',
          'audio/wave',
          'audio/x-wav',
          'audio/mp3',
          'audio/mpeg',
          'audio/ogg',
          'audio/m4a',
          'audio/x-m4a',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `지원하지 않는 오디오 형식입니다: ${file.mimetype}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async enrollVoice(
    @Req() req: any,
    @UploadedFile() audioFile: Express.Multer.File,
  ) {
    const user = getAuthUser(req);

    if (!audioFile) {
      throw new BadRequestException('오디오 파일이 필요합니다.');
    }

    // 최소 녹음 시간 체크 (대략적인 체크 - 정확한 길이는 서버에서 확인)
    // 3초 이상의 오디오는 대략 50KB 이상이어야 함
    if (audioFile.buffer.length < 10000) {
      throw new BadRequestException(
        '녹음이 너무 짧습니다. 최소 3초 이상 녹음해주세요.',
      );
    }

    return this.voiceEnrollmentService.enrollVoice(
      user.id,
      audioFile.buffer,
      audioFile.mimetype,
    );
  }

  /**
   * 음성 등록 상태 조회
   * GET /api/users/voice/status
   */
  @Get('status')
  async getVoiceStatus(@Req() req: any) {
    const user = getAuthUser(req);
    return this.voiceEnrollmentService.getVoiceStatus(user.id);
  }

  /**
   * 음성 데이터 삭제
   * DELETE /api/users/voice/delete
   */
  @Delete('delete')
  async deleteVoiceData(@Req() req: any) {
    const user = getAuthUser(req);
    return this.voiceEnrollmentService.deleteVoiceData(user.id);
  }

  /**
   * 음성 더빙 활성화/비활성화
   * PATCH /api/users/voice/toggle
   * Body: { enabled: boolean }
   */
  @Patch('toggle')
  async toggleVoiceDubbing(
    @Req() req: any,
    @Body() dto: ToggleVoiceDubbingDto,
  ) {
    const user = getAuthUser(req);

    if (typeof dto.enabled !== 'boolean') {
      throw new BadRequestException('enabled 필드는 boolean이어야 합니다.');
    }

    return this.voiceEnrollmentService.toggleVoiceDubbing(user.id, dto.enabled);
  }
}
