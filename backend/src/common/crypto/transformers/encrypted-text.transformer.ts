/**
 * 텍스트 필드 암호화 TypeORM Transformer
 *
 * 사용법:
 * @Column({ type: 'text', transformer: encryptedTextTransformer })
 * content: string;
 */

import { ValueTransformer } from 'typeorm';
import { EncryptionService } from '../encryption.service';

let encryptionService: EncryptionService | null = null;

/**
 * EncryptionService 인스턴스 주입
 * EncryptionModule.onModuleInit에서 호출됨
 */
export function setEncryptionService(service: EncryptionService): void {
  encryptionService = service;
}

/**
 * 텍스트 필드 암호화/복호화 Transformer
 */
export const encryptedTextTransformer: ValueTransformer = {
  /**
   * DB 저장 시: 평문 → 암호문
   */
  to(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!encryptionService) {
      // 서비스 미초기화 시 평문 저장 (개발 환경 또는 초기화 전)
      console.warn(
        '[EncryptedTextTransformer] EncryptionService not initialized, storing plaintext',
      );
      return value;
    }

    return encryptionService.encrypt(value);
  },

  /**
   * DB 조회 시: 암호문 → 평문
   */
  from(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!encryptionService) {
      // 서비스 미초기화 시 원본 반환
      console.warn(
        '[EncryptedTextTransformer] EncryptionService not initialized, returning as-is',
      );
      return value;
    }

    return encryptionService.decrypt(value);
  },
};
