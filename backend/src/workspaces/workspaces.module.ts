import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { WorkspaceEvent } from './entities/workspace-event.entity';
import { WorkspaceEventType } from './entities/workspace-event-type.entity';
import { WorkspaceGateway } from './workspace.gateway';
import { WorkspaceFilesService } from './workspace-files.service';
import { WorkspaceFilesController } from './workspace-files.controller';
import { WorkspaceInvitationsService } from './workspace-invitations.service';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { WorkspaceEventsService } from './workspace-events.service';
import { WorkspaceEventsController } from './workspace-events.controller';
import { WorkspaceEventTypesService } from './workspace-event-types.service';
import { WorkspaceEventTypesController } from './workspace-event-types.controller';
import { StorageModule } from '../storage/storage.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceFile,
      WorkspaceInvitation,
      WorkspaceEvent,
      WorkspaceEventType,
      User,
    ]),
    StorageModule,
  ],
  controllers: [
    WorkspacesController,
    WorkspaceFilesController,
    WorkspaceInvitationsController,
    WorkspaceEventsController,
    WorkspaceEventTypesController,
  ],
  providers: [
    WorkspacesService,
    WorkspaceGateway,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
    WorkspaceEventsService,
    WorkspaceEventTypesService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceGateway,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
    WorkspaceEventsService,
    WorkspaceEventTypesService,
  ],
})
export class WorkspacesModule {}
