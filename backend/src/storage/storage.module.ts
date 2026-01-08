import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class StorageModule {}
