import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Session Not Found Exception
 * Thrown when a session cannot be found by ID
 */
export class SessionNotFoundException extends NotFoundException {
  constructor(sessionId?: string) {
    super(
      sessionId
        ? `세션을 찾을 수 없습니다: ${sessionId}`
        : '세션을 찾을 수 없습니다.',
    );
  }
}

/**
 * Session Ended Exception
 * Thrown when trying to perform operations on an already ended session
 */
export class SessionEndedException extends BadRequestException {
  constructor(sessionId?: string) {
    super(sessionId ? `종료된 세션입니다: ${sessionId}` : '종료된 세션입니다.');
  }
}

/**
 * Session Not Active Exception
 * Thrown when session is not in active state
 */
export class SessionNotActiveException extends BadRequestException {
  constructor(message: string = 'Chime 세션이 아직 시작되지 않았습니다.') {
    super(message);
  }
}

/**
 * Not Session Host Exception
 * Thrown when a non-host tries to perform host-only operations
 */
export class NotSessionHostException extends ForbiddenException {
  constructor() {
    super('호스트만 세션을 종료할 수 있습니다.');
  }
}

/**
 * Participant Not Found Exception
 * Thrown when a participant cannot be found in the session
 */
export class ParticipantNotFoundException extends NotFoundException {
  constructor(userId?: string) {
    super(
      userId
        ? `참가자를 찾을 수 없습니다: ${userId}`
        : '참가자를 찾을 수 없습니다.',
    );
  }
}
