import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BedrockService } from './bedrock.service';
import { EventExtractionService } from './event-extraction.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [ConfigModule, forwardRef(() => WorkspacesModule)],
  providers: [BedrockService, EventExtractionService],
  exports: [BedrockService, EventExtractionService],
})
export class AiModule {}
