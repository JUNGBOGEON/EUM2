import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

/**
 * Workspace Not Found Exception
 * Thrown when a workspace cannot be found by ID
 */
export class WorkspaceNotFoundException extends NotFoundException {
  constructor(workspaceId?: string) {
    super(
      workspaceId
        ? `워크스페이스를 찾을 수 없습니다: ${workspaceId}`
        : '워크스페이스를 찾을 수 없습니다.',
    );
  }
}

/**
 * Not Workspace Owner Exception
 * Thrown when a non-owner tries to perform owner-only operations
 */
export class NotWorkspaceOwnerException extends ForbiddenException {
  constructor() {
    super('워크스페이스 소유자만 이 작업을 수행할 수 있습니다.');
  }
}

/**
 * Not Workspace Member Exception
 * Thrown when a non-member tries to access workspace resources
 */
export class NotWorkspaceMemberException extends ForbiddenException {
  constructor() {
    super('워크스페이스 멤버만 이 작업을 수행할 수 있습니다.');
  }
}

/**
 * Workspace File Not Found Exception
 * Thrown when a workspace file cannot be found
 */
export class WorkspaceFileNotFoundException extends NotFoundException {
  constructor(fileId?: string) {
    super(
      fileId
        ? `파일을 찾을 수 없습니다: ${fileId}`
        : '파일을 찾을 수 없습니다.',
    );
  }
}

/**
 * Invitation Not Found Exception
 * Thrown when an invitation cannot be found
 */
export class InvitationNotFoundException extends NotFoundException {
  constructor(invitationId?: string) {
    super(
      invitationId
        ? `초대를 찾을 수 없습니다: ${invitationId}`
        : '초대를 찾을 수 없습니다.',
    );
  }
}

/**
 * Duplicate Invitation Exception
 * Thrown when trying to invite someone who is already invited
 */
export class DuplicateInvitationException extends BadRequestException {
  constructor() {
    super('이미 초대된 사용자입니다.');
  }
}

/**
 * Already Member Exception
 * Thrown when trying to invite someone who is already a member
 */
export class AlreadyMemberException extends BadRequestException {
  constructor() {
    super('이미 워크스페이스 멤버입니다.');
  }
}
