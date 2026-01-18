import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  TextType,
  VoiceId,
} from '@aws-sdk/client-polly';

/**
 * Polly Voice Information
 */
export interface PollyVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  languageCode: string;
  isNeural: boolean;
}

/**
 * Supported Polly Voices by Language
 */
const POLLY_VOICES: Record<string, PollyVoice[]> = {
  'ko-KR': [
    {
      id: 'Seoyeon',
      name: 'Seoyeon',
      gender: 'Female',
      languageCode: 'ko-KR',
      isNeural: true,
    },
  ],
  'en-US': [
    {
      id: 'Joanna',
      name: 'Joanna',
      gender: 'Female',
      languageCode: 'en-US',
      isNeural: true,
    },
    {
      id: 'Matthew',
      name: 'Matthew',
      gender: 'Male',
      languageCode: 'en-US',
      isNeural: true,
    },
    {
      id: 'Amy',
      name: 'Amy',
      gender: 'Female',
      languageCode: 'en-GB',
      isNeural: true,
    },
    {
      id: 'Ivy',
      name: 'Ivy',
      gender: 'Female',
      languageCode: 'en-US',
      isNeural: true,
    },
  ],
  'ja-JP': [
    {
      id: 'Mizuki',
      name: 'Mizuki',
      gender: 'Female',
      languageCode: 'ja-JP',
      isNeural: false,
    },
    {
      id: 'Takumi',
      name: 'Takumi',
      gender: 'Male',
      languageCode: 'ja-JP',
      isNeural: true,
    },
  ],
  'zh-CN': [
    {
      id: 'Zhiyu',
      name: 'Zhiyu',
      gender: 'Female',
      languageCode: 'cmn-CN',
      isNeural: true,
    },
  ],
};

/**
 * Default Polly Voices by Language
 */
const DEFAULT_VOICES: Record<string, string> = {
  'ko-KR': 'Seoyeon',
  'en-US': 'Joanna',
  'ja-JP': 'Takumi',
  'zh-CN': 'Zhiyu',
};

/**
 * TTS Synthesis Result
 */
export interface SynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  durationMs: number;
}

/**
 * PollyService
 * Handles Amazon Polly TTS synthesis
 */
@Injectable()
export class PollyService {
  private readonly logger = new Logger(PollyService.name);
  private pollyClient: PollyClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured for Polly');
    }

    this.pollyClient = new PollyClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    this.logger.log(`PollyService initialized (region: ${region})`);
  }

  /**
   * Synthesize text to speech
   */
  async synthesizeSpeech(
    text: string,
    voiceId: string,
    languageCode: string,
  ): Promise<SynthesisResult> {
    // Polly text length validation (limit: 3000 characters)
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (text.length > 3000) {
      this.logger.warn(
        `[Polly] Text too long (${text.length} chars), truncating to 3000`,
      );
      text = text.substring(0, 3000);
    }

    try {
      // Validate voice
      const validVoice = this.validateVoice(voiceId, languageCode);
      const engine = this.getVoiceEngine(validVoice, languageCode);

      this.logger.debug(
        `[Polly] Synthesizing: text="${text.substring(0, 30)}...", voice=${validVoice}, lang=${languageCode}, engine=${engine}`,
      );

      const command = new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: validVoice as VoiceId,
        OutputFormat: OutputFormat.MP3,
        Engine: engine,
        TextType: TextType.TEXT,
      });

      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream in Polly response');
      }

      // Convert stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream);

      // Estimate duration (MP3 ~128kbps = 16KB/s)
      const durationMs = Math.round((audioBuffer.length / 16000) * 1000);

      this.logger.log(
        `[Polly] Synthesized: ${audioBuffer.length} bytes, ~${durationMs}ms`,
      );

      return {
        audioBuffer,
        contentType: response.ContentType || 'audio/mpeg',
        durationMs,
      };
    } catch (error) {
      this.logger.error(
        `[Polly] Synthesis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get available voices for a language
   */
  getAvailableVoices(languageCode: string): PollyVoice[] {
    return POLLY_VOICES[languageCode] || [];
  }

  /**
   * Get default voice for a language
   */
  getDefaultVoice(languageCode: string): string {
    return DEFAULT_VOICES[languageCode] || 'Joanna';
  }

  /**
   * Check if a voice is valid for a language
   */
  isValidVoice(voiceId: string, languageCode: string): boolean {
    const voices = this.getAvailableVoices(languageCode);
    return voices.some((v) => v.id === voiceId);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(POLLY_VOICES);
  }

  /**
   * Validate voice and return valid voice ID
   * Falls back to default if invalid
   */
  private validateVoice(voiceId: string, languageCode: string): string {
    if (this.isValidVoice(voiceId, languageCode)) {
      return voiceId;
    }

    const defaultVoice = this.getDefaultVoice(languageCode);
    this.logger.warn(
      `[Polly] Invalid voice "${voiceId}" for ${languageCode}, using default: ${defaultVoice}`,
    );
    return defaultVoice;
  }

  /**
   * Determine engine (neural/standard) for a voice
   */
  private getVoiceEngine(voiceId: string, languageCode: string): Engine {
    const voices = this.getAvailableVoices(languageCode);
    const voice = voices.find((v) => v.id === voiceId);

    // Default to neural for better quality
    if (voice?.isNeural) {
      return Engine.NEURAL;
    }

    return Engine.STANDARD;
  }

  /**
   * Convert readable stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
