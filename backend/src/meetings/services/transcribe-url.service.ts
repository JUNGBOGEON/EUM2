import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// 지원 언어 코드 (단일 소스)
const SUPPORTED_LANGUAGE_CODES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export interface TranscribePresignedUrlResponse {
  url: string;
  languageCode: SupportedLanguage;
  expiresIn: number;
}

/**
 * AWS Signature V4 서명 유틸리티 (직접 구현)
 *
 * AWS Transcribe Streaming WebSocket의 presigned URL 생성을 위한
 * Signature V4 서명 로직을 직접 구현합니다.
 *
 * 참조:
 * - https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
 * - https://github.com/amazon-archives/amazon-transcribe-websocket-static
 */
function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function toDateStamp(date: Date): string {
  return toAmzDate(date).substring(0, 8);
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * AWS Transcribe Streaming WebSocket Pre-signed URL 생성 서비스
 *
 * 클라이언트가 직접 AWS Transcribe Streaming에 연결할 수 있도록
 * AWS Signature V4로 서명된 WebSocket URL을 생성합니다.
 */
@Injectable()
export class TranscribeUrlService {
  private readonly logger = new Logger(TranscribeUrlService.name);
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  // 지원 언어 목록 (const 배열에서 derive)
  static readonly SUPPORTED_LANGUAGES: readonly SupportedLanguage[] =
    SUPPORTED_LANGUAGE_CODES;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION') || 'ap-northeast-2';
    this.accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID') || '';
    this.secretAccessKey =
      this.configService.get('AWS_SECRET_ACCESS_KEY') || '';

    if (!this.accessKeyId || !this.secretAccessKey) {
      this.logger.warn(
        'AWS credentials not configured for Transcribe URL service',
      );
    }
  }

  /**
   * AWS 자격 증명이 설정되어 있는지 확인
   */
  private validateCredentials(): void {
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
      );
    }
  }

  /**
   * AWS Transcribe Streaming WebSocket Pre-signed URL 생성
   *
   * @param languageCode 트랜스크립션 언어 코드
   * @param sampleRate 오디오 샘플레이트 (기본값: 16000Hz)
   * @returns Pre-signed WebSocket URL
   */
  async generatePresignedUrl(
    languageCode: SupportedLanguage,
    sampleRate: number = 16000,
  ): Promise<TranscribePresignedUrlResponse> {
    // AWS 자격 증명 검사
    this.validateCredentials();

    // 언어 코드 유효성 검사
    if (!TranscribeUrlService.SUPPORTED_LANGUAGES.includes(languageCode)) {
      throw new Error(`Unsupported language code: ${languageCode}`);
    }

    const service = 'transcribe';
    const host = `transcribestreaming.${this.region}.amazonaws.com`;
    const endpoint = `${host}:8443`;
    const path = '/stream-transcription-websocket';
    const method = 'GET';
    const expiresIn = 300; // 5분

    // 현재 시간 (UTC)
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = toDateStamp(now);

    // Credential scope
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`;

    // 쿼리 파라미터 (정렬 순서 중요)
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
      'language-code': languageCode,
      'media-encoding': 'pcm',
      'sample-rate': sampleRate.toString(),
    };

    // Canonical query string (알파벳 순 정렬)
    const sortedParams = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedParams
      .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(queryParams[key])}`)
      .join('&');

    // Canonical headers (host에 포트 포함)
    const canonicalHeaders = `host:${endpoint}\n`;
    const signedHeaders = 'host';

    // Payload hash (빈 문자열의 SHA256)
    const payloadHash = sha256('');

    // Canonical request
    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const canonicalRequestHash = sha256(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Signature
    const signingKey = getSignatureKey(
      this.secretAccessKey,
      dateStamp,
      this.region,
      service,
    );
    const signature = hmac(signingKey, stringToSign).toString('hex');

    // 최종 URL 구성
    const presignedUrl = `wss://${endpoint}${path}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    // 보안: 민감 정보(signature, credential) 로깅 금지
    this.logger.log(
      `Generated pre-signed URL for Transcribe Streaming (language: ${languageCode}, expires: ${expiresIn}s, date: ${amzDate})`,
    );

    return {
      url: presignedUrl,
      languageCode,
      expiresIn,
    };
  }

  /**
   * 언어 코드가 지원되는지 확인
   */
  isLanguageSupported(languageCode: string): languageCode is SupportedLanguage {
    return TranscribeUrlService.SUPPORTED_LANGUAGES.includes(
      languageCode as SupportedLanguage,
    );
  }
}
