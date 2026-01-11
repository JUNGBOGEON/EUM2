import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  DeleteAttendeeCommand,
  StartMeetingTranscriptionCommand,
  StopMeetingTranscriptionCommand,
} from '@aws-sdk/client-chime-sdk-meetings';

/**
 * AWS Chime SDK Adapter Service
 * Handles all direct AWS Chime SDK operations
 */
@Injectable()
export class ChimeSdkService {
  private readonly logger = new Logger(ChimeSdkService.name);
  private chimeClient: ChimeSDKMeetingsClient;

  constructor(private configService: ConfigService) {
    this.chimeClient = new ChimeSDKMeetingsClient({
      region: this.configService.get('AWS_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Create a new Chime Meeting
   */
  async createMeeting(
    externalMeetingId: string,
    mediaRegion?: string,
  ): Promise<{
    meetingId: string;
    mediaPlacement: Record<string, any>;
    mediaRegion?: string;
  }> {
    const createMeetingCommand = new CreateMeetingCommand({
      ClientRequestToken: externalMeetingId,
      ExternalMeetingId: externalMeetingId,
      MediaRegion:
        mediaRegion || this.configService.get('AWS_REGION') || 'ap-northeast-2',
      MeetingFeatures: {
        Audio: { EchoReduction: 'AVAILABLE' },
        Video: { MaxResolution: 'FHD' },
        Content: { MaxResolution: 'FHD' },
        Attendee: { MaxCount: 10 },
      },
    });

    const chimeMeetingResponse =
      await this.chimeClient.send(createMeetingCommand);
    const chimeMeeting = chimeMeetingResponse.Meeting;

    if (!chimeMeeting) {
      throw new BadRequestException('Chime 미팅 생성에 실패했습니다.');
    }

    return {
      meetingId: chimeMeeting.MeetingId!,
      mediaPlacement: chimeMeeting.MediaPlacement as Record<string, any>,
      mediaRegion: chimeMeeting.MediaRegion,
    };
  }

  /**
   * Delete a Chime Meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await this.chimeClient.send(
        new DeleteMeetingCommand({
          MeetingId: meetingId,
        }),
      );
      this.logger.log(`Deleted Chime meeting: ${meetingId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Chime meeting ${meetingId}:`, error);
      throw error;
    }
  }

  /**
   * Create a Chime Attendee
   */
  async createAttendee(
    meetingId: string,
    externalUserId: string,
  ): Promise<{
    attendeeId: string;
    joinToken: string;
  }> {
    const createAttendeeCommand = new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: externalUserId,
    });

    const attendeeResponse = await this.chimeClient.send(createAttendeeCommand);
    const chimeAttendee = attendeeResponse.Attendee;

    if (!chimeAttendee) {
      throw new BadRequestException('Chime 참가자 생성에 실패했습니다.');
    }

    return {
      attendeeId: chimeAttendee.AttendeeId!,
      joinToken: chimeAttendee.JoinToken!,
    };
  }

  /**
   * Delete a Chime Attendee
   */
  async deleteAttendee(meetingId: string, attendeeId: string): Promise<void> {
    try {
      await this.chimeClient.send(
        new DeleteAttendeeCommand({
          MeetingId: meetingId,
          AttendeeId: attendeeId,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to delete Chime attendee:', error);
      // Don't throw - attendee deletion failure shouldn't block session operations
    }
  }

  /**
   * Start meeting transcription
   */
  async startTranscription(
    meetingId: string,
    languageCode: string = 'ko-KR',
  ): Promise<void> {
    // 지원하는 언어 목록 (AWS Transcribe 자동 언어 감지용)
    const SUPPORTED_LANGUAGES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN'];

    const command = new StartMeetingTranscriptionCommand({
      MeetingId: meetingId,
      TranscriptionConfiguration: {
        EngineTranscribeSettings: {
          // 자동 언어 감지 활성화 (다국어 회의 지원)
          IdentifyLanguage: true,
          // 감지할 언어 목록 (4개 고정: 한국어, 영어, 일본어, 중국어)
          LanguageOptions: SUPPORTED_LANGUAGES.join(','),
          // 기본 언어 설정 (빠른 감지를 위한 힌트)
          PreferredLanguage: languageCode as any,
          // 리전 자동 선택 (미팅 리전과 동일 - 지연시간 감소)
          Region: 'auto',
          // 부분 결과 안정화 (실시간 자막 응답 개선)
          EnablePartialResultsStabilization: true,
          PartialResultsStability: 'medium',
        },
      },
    });

    await this.chimeClient.send(command);
    this.logger.log(
      `Transcription started with auto language detection. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    );
  }

  /**
   * Stop meeting transcription
   */
  async stopTranscription(meetingId: string): Promise<void> {
    const command = new StopMeetingTranscriptionCommand({
      MeetingId: meetingId,
    });

    await this.chimeClient.send(command);
    this.logger.log('Transcription stopped');
  }
}
