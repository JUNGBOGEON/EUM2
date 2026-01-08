import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BedrockService } from './bedrock.service';

@Module({
  imports: [ConfigModule],
  providers: [BedrockService],
  exports: [BedrockService],
})
export class AiModule {}
