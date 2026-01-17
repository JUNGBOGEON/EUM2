import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3StorageService } from '../../storage/s3-storage.service';
import { User } from '../entities/user.entity';

interface EnrollVoiceResponse {
  success: boolean;
  message: string;
  s3_key?: string;
  enhanced?: boolean;
}

@Injectable()
export class VoiceEnrollmentService {
  private readonly logger = new Logger(VoiceEnrollmentService.name);
  private readonly aiServerUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly s3StorageService: S3StorageService,
    private readonly configService: ConfigService,
  ) {
    this.aiServerUrl =
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8000';
    this.logger.log(`AI Server URL: ${this.aiServerUrl}`);
  }

  /**
   * 사용자 음성을 등록합니다.
   * 1. 오디오를 S3에 임시 저장
   * 2. AI Server에 embedding 추출 요청
   * 3. User DB에 S3 key 저장
   * 4. 임시 오디오 삭제
   */
  async enrollVoice(
    userId: string,
    audioBuffer: Buffer,
    mimeType: string = 'audio/webm',
  ): Promise<{ success: boolean; message: string }> {
    const tempAudioKey = `voice-enrollment/temp/${userId}_${Date.now()}.webm`;

    try {
      this.logger.log(`Enrolling voice for user: ${userId}`);

      // 1. 원본 오디오를 S3에 임시 저장
      await this.s3StorageService.uploadFile(tempAudioKey, audioBuffer, mimeType);
      this.logger.log(`Uploaded temp audio to S3: ${tempAudioKey}`);

      // 2. Presigned URL 생성
      const presignedUrl = await this.s3StorageService.getPresignedUrl(
        tempAudioKey,
        600, // 10분 유효
      );

      // 3. AI Server에 embedding 추출 요청
      const response = await fetch(
        `${this.aiServerUrl}/enroll-url/${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio_url: presignedUrl }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Server error: ${response.status} - ${errorText}`);
      }

      const aiResponse: EnrollVoiceResponse = await response.json();

      if (!aiResponse.success) {
        throw new Error(aiResponse.message || 'AI Server enrollment failed');
      }

      // 4. User DB 업데이트
      await this.usersRepository.update(userId, {
        voiceEmbeddingS3Key: aiResponse.s3_key || `voice-embeddings/${userId}.pth`,
        voiceDubbingEnabled: true,
        voiceEnrolledAt: new Date(),
      });

      this.logger.log(
        `Voice enrolled successfully for user: ${userId}, S3 key: ${aiResponse.s3_key}`,
      );

      // 5. 임시 오디오 삭제 (비동기로 처리)
      this.s3StorageService.deleteFile(tempAudioKey).catch((err) => {
        this.logger.warn(`Failed to delete temp audio: ${err.message}`);
      });

      return {
        success: true,
        message: '음성 등록이 완료되었습니다.',
      };
    } catch (error) {
      this.logger.error(`Voice enrollment failed for user: ${userId}`, error);

      // 실패 시 임시 오디오 삭제 시도
      this.s3StorageService.deleteFile(tempAudioKey).catch(() => {});

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `음성 등록에 실패했습니다: ${error.message}`,
      );
    }
  }

  /**
   * 음성 더빙 활성화/비활성화
   */
  async toggleVoiceDubbing(
    userId: string,
    enabled: boolean,
  ): Promise<{ voiceDubbingEnabled: boolean }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (enabled && !user.voiceEmbeddingS3Key) {
      throw new BadRequestException(
        '음성 더빙을 활성화하려면 먼저 음성을 등록해야 합니다.',
      );
    }

    await this.usersRepository.update(userId, {
      voiceDubbingEnabled: enabled,
    });

    this.logger.log(
      `Voice dubbing ${enabled ? 'enabled' : 'disabled'} for user: ${userId}`,
    );

    return { voiceDubbingEnabled: enabled };
  }

  /**
   * 음성 등록 상태 조회
   */
  async getVoiceStatus(userId: string): Promise<{
    voiceDubbingEnabled: boolean;
    voiceEnrolledAt: Date | null;
    hasVoiceEmbedding: boolean;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['voiceDubbingEnabled', 'voiceEnrolledAt', 'voiceEmbeddingS3Key'],
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return {
      voiceDubbingEnabled: user.voiceDubbingEnabled,
      voiceEnrolledAt: user.voiceEnrolledAt,
      hasVoiceEmbedding: !!user.voiceEmbeddingS3Key,
    };
  }

  /**
   * 음성 데이터 삭제
   */
  async deleteVoiceData(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['voiceEmbeddingS3Key'],
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    try {
      // AI Server에 삭제 요청
      if (user.voiceEmbeddingS3Key) {
        await fetch(`${this.aiServerUrl}/enroll/${userId}`, {
          method: 'DELETE',
        }).catch((err) => {
          this.logger.warn(`Failed to delete from AI Server: ${err.message}`);
        });
      }

      // User DB 업데이트
      await this.usersRepository
        .createQueryBuilder()
        .update()
        .set({
          voiceEmbeddingS3Key: () => 'NULL',
          voiceDubbingEnabled: false,
          voiceEnrolledAt: () => 'NULL',
        })
        .where('id = :id', { id: userId })
        .execute();

      this.logger.log(`Voice data deleted for user: ${userId}`);

      return {
        success: true,
        message: '음성 데이터가 삭제되었습니다.',
      };
    } catch (error) {
      this.logger.error(`Failed to delete voice data for user: ${userId}`, error);
      throw new InternalServerErrorException('음성 데이터 삭제에 실패했습니다.');
    }
  }

  /**
   * 사용자의 음성 S3 키 조회 (TTS 요청 시 사용)
   */
  async getVoiceEmbeddingS3Key(userId: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['voiceEmbeddingS3Key', 'voiceDubbingEnabled'],
    });

    if (!user || !user.voiceDubbingEnabled) {
      return null;
    }

    return user.voiceEmbeddingS3Key;
  }
}
