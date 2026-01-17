/**
 * AES-256-GCM 필드 레벨 암호화 서비스
 *
 * 특징:
 * - AES-256-GCM 알고리즘 사용 (인증 암호화)
 * - IV(12바이트) 매번 랜덤 생성
 * - Auth Tag(16바이트)로 무결성 검증
 * - 키 버전 관리로 키 로테이션 지원
 * - 하위 호환: 암호화되지 않은 데이터는 그대로 반환
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);

  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12; // GCM 권장 IV 길이
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly SALT = 'EUM2_FIELD_ENCRYPTION_SALT_V1';

  private encryptionKey: Buffer;
  private currentKeyVersion = 1;
  private isEnabled = true;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');
    this.isEnabled = this.configService.get<boolean>('ENCRYPTION_ENABLED', true);

    if (!keyString) {
      this.logger.warn(
        'ENCRYPTION_KEY not set. Encryption will be disabled.',
      );
      this.isEnabled = false;
      return;
    }

    // Key derivation using scrypt for added security
    this.encryptionKey = scryptSync(keyString, this.SALT, this.KEY_LENGTH);
    this.logger.log('Encryption service initialized successfully');
  }

  /**
   * 평문을 AES-256-GCM으로 암호화
   * 반환 형식: v{version}:{base64(IV + ciphertext + authTag)}
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    if (!this.isEnabled) return plaintext;

    try {
      const iv = randomBytes(this.IV_LENGTH);
      const cipher = createCipheriv(this.ALGORITHM, this.encryptionKey, iv);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Format: IV (12) + Ciphertext (variable) + AuthTag (16)
      const combined = Buffer.concat([iv, encrypted, authTag]);
      return `v${this.currentKeyVersion}:${combined.toString('base64')}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * AES-256-GCM 암호문을 복호화
   * 암호화되지 않은 데이터는 그대로 반환 (하위 호환)
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;
    if (!this.isEnabled) return encryptedData;

    // 암호화되지 않은 데이터 처리 (마이그레이션 기간 하위 호환)
    if (!this.isEncrypted(encryptedData)) {
      return encryptedData;
    }

    try {
      const [versionPart, dataPart] = encryptedData.split(':');
      const keyVersion = parseInt(versionPart.slice(1), 10);

      // 키 버전에 따른 키 선택 (향후 키 로테이션 지원)
      const key = this.getKeyForVersion(keyVersion);

      const combined = Buffer.from(dataPart, 'base64');
      const iv = combined.subarray(0, this.IV_LENGTH);
      const authTag = combined.subarray(combined.length - this.AUTH_TAG_LENGTH);
      const ciphertext = combined.subarray(
        this.IV_LENGTH,
        combined.length - this.AUTH_TAG_LENGTH,
      );

      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(ciphertext) + decipher.final('utf8');
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      // 복호화 실패 시 원본 반환 (데이터 손실 방지)
      return encryptedData;
    }
  }

  /**
   * JSON 객체를 암호화
   */
  encryptJson<T>(data: T): string | null {
    if (data === null || data === undefined) return null;
    if (!this.isEnabled) return JSON.stringify(data);
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * 암호화된 데이터를 JSON 객체로 복호화
   */
  decryptJson<T>(encryptedData: string): T | null {
    if (!encryptedData) return null;

    const decrypted = this.decrypt(encryptedData);
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      // JSON 파싱 실패 시 null 반환
      this.logger.warn('Failed to parse decrypted JSON data');
      return null;
    }
  }

  /**
   * 데이터가 암호화되어 있는지 확인
   */
  isEncrypted(data: string): boolean {
    if (!data) return false;
    // v{숫자}: 패턴으로 시작하는지 확인
    return /^v\d+:/.test(data);
  }

  /**
   * 암호화 활성화 여부 확인
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 특정 버전의 키 반환 (키 로테이션 지원)
   */
  private getKeyForVersion(version: number): Buffer {
    // 현재는 버전 1만 지원
    // 향후 키 로테이션 시 여러 버전의 키 관리 가능
    if (version === 1) {
      return this.encryptionKey;
    }
    throw new Error(`Unsupported key version: ${version}`);
  }
}
