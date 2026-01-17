/**
 * JSON 필드 암호화 TypeORM Transformer
 *
 * 사용법:
 * @Column({ type: 'text', transformer: encryptedJsonTransformer })
 * translations?: Record<string, string>;
 *
 * 주의: jsonb 타입 대신 text 타입 사용 필요
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
 * JSON 필드 암호화/복호화 Transformer
 * JSON 객체를 암호화된 문자열로 저장하고, 조회 시 다시 객체로 변환
 */
export const encryptedJsonTransformer: ValueTransformer = {
  /**
   * DB 저장 시: JSON 객체 → 암호화된 문자열
   */
  to(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (!encryptionService) {
      // 서비스 미초기화 시 JSON 문자열로 저장
      console.warn(
        '[EncryptedJsonTransformer] EncryptionService not initialized, storing JSON string',
      );
      return JSON.stringify(value);
    }

    return encryptionService.encryptJson(value);
  },

  /**
   * DB 조회 시: 암호화된 문자열 → JSON 객체
   */
  from(value: string | null | undefined): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (!encryptionService) {
      // 서비스 미초기화 시 JSON 파싱 시도
      console.warn(
        '[EncryptedJsonTransformer] EncryptionService not initialized, parsing JSON',
      );
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // 암호화되지 않은 JSON 데이터 처리 (마이그레이션 기간 하위 호환)
    if (!encryptionService.isEncrypted(value)) {
      try {
        return JSON.parse(value);
      } catch {
        // JSON 파싱 실패 시 원본 반환
        return value;
      }
    }

    return encryptionService.decryptJson(value);
  },
};
