import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { WorkspaceEvent } from './entities/workspace-event.entity';
import { WorkspaceEventType } from './entities/workspace-event-type.entity';
import { WorkspaceRole } from './entities/workspace-role.entity';
import { WorkspaceMemberRole } from './entities/workspace-member-role.entity';
import { WorkspaceGateway } from './workspace.gateway';
import { GatewayBroadcastService } from './services/gateway-broadcast.service';
import { WorkspaceFilesService } from './workspace-files.service';
import { WorkspaceFilesController } from './workspace-files.controller';
import { WorkspaceInvitationsService } from './workspace-invitations.service';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { WorkspaceEventsService } from './workspace-events.service';
import { WorkspaceEventsController } from './workspace-events.controller';
import { WorkspaceEventTypesService } from './workspace-event-types.service';
import { WorkspaceEventTypesController } from './workspace-event-types.controller';
import { WorkspaceRolesService } from './workspace-roles.service';
import { WorkspaceRolesController } from './workspace-roles.controller';
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
      WorkspaceRole,
      WorkspaceMemberRole,
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
    WorkspaceRolesController,
  ],
  providers: [
    WorkspacesService,
    WorkspaceGateway,
    GatewayBroadcastService,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
    WorkspaceEventsService,
    WorkspaceEventTypesService,
    WorkspaceRolesService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceGateway,
    WorkspaceFilesService,
    WorkspaceInvitationsService,
    WorkspaceEventsService,
    WorkspaceEventTypesService,
    WorkspaceRolesService,
  ],
})
export class WorkspacesModule { }
