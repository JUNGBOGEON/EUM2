import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceGateway } from './workspace.gateway';
import { WorkspaceFilesService } from './workspace-files.service';
import { WorkspaceFilesController } from './workspace-files.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceFile]),
    StorageModule,
  ],
  controllers: [WorkspacesController, WorkspaceFilesController],
  providers: [WorkspacesService, WorkspaceGateway, WorkspaceFilesService],
  exports: [WorkspacesService, WorkspaceGateway, WorkspaceFilesService],
})
export class WorkspacesModule {}
