import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { WorkspaceGateway } from './workspace.gateway';
import { WorkspaceFilesService } from './workspace-files.service';
import { WorkspaceFilesController } from './workspace-files.controller';
import { WorkspaceInvitationsService } from './workspace-invitations.service';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { StorageModule } from '../storage/storage.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceFile, WorkspaceInvitation, User]),
    StorageModule,
  ],
  controllers: [
    WorkspacesController,
    WorkspaceFilesController,
    WorkspaceInvitationsController,
  ],
  providers: [
    WorkspacesService,
    WorkspaceGateway,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceGateway,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
  ],
})
export class WorkspacesModule {}
