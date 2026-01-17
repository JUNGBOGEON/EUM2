/**
 * 암호화 모듈
 *
 * 전역 모듈로 등록되어 모든 모듈에서 EncryptionService 사용 가능
 * TypeORM Transformer에 서비스 인스턴스를 주입
 */

import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import {
  setTextTransformerService,
  setJsonTransformerService,
} from './transformers';

@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule implements OnModuleInit {
  private readonly logger = new Logger(EncryptionModule.name);

  constructor(private encryptionService: EncryptionService) {}

  onModuleInit() {
    // TypeORM Transformer에 EncryptionService 인스턴스 주입
    setTextTransformerService(this.encryptionService);
    setJsonTransformerService(this.encryptionService);

    this.logger.log('Encryption transformers initialized');
  }
}
