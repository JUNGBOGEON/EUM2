import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * Session Update Payload
 */
export interface SessionUpdatePayload {
  workspaceId: string;
  session: {
    id: string;
    title: string;
    status: string;
    hostId: string;
    startedAt: Date;
    participantCount?: number;
    host?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  } | null;
}

/**
 * Invitation Notification Payload
 */
export interface InvitationNotificationPayload {
  type:
    | 'invitation_received'
    | 'invitation_cancelled'
    | 'invitation_accepted'
    | 'invitation_rejected';
  invitation?: {
    id: string;
    workspace: {
      id: string;
      name: string;
      icon?: string;
      thumbnail?: string;
    };
    inviter: {
      id: string;
      name: string;
      profileImage?: string;
    };
    message?: string;
    createdAt: Date;
  };
  invitationId?: string;
  user?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  userId?: string;
  workspaceId?: string;
}

/**
 * Translated Transcript Payload
 */
export interface TranslatedTranscriptPayload {
  type: 'translated_transcript';
  resultId: string;
  speakerId: string;
  speakerUserId?: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

/**
 * New Transcript Payload (original, for real-time sync)
 */
export interface NewTranscriptPayload {
  type: 'new_transcript';
  resultId: string;
  sessionId: string;
  speakerId: string;
  speakerUserId: string;
  speakerName: string;
  speakerProfileImage?: string;
  text: string;
  timestamp: number;
  isPartial: boolean;
  languageCode: string;
}

/**
 * AI Summary Status Payload
 */
export interface SummaryStatusPayload {
  type: 'summary_status_update';
  workspaceId: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  message?: string;
}

/**
 * Language Changed Payload
 */
export interface LanguageChangedPayload {
  type: 'language_changed';
  sessionId: string;
  userId: string;
  attendeeId?: string;
  userName: string;
  languageCode: string;
  timestamp: number;
}

/**
 * Gateway Broadcast Service
 * Handles all WebSocket broadcasting operations
 */
@Injectable()
export class GatewayBroadcastService {
  private readonly logger = new Logger(GatewayBroadcastService.name);
  private server: Server;

  /**
   * Set the WebSocket server instance (called from gateway)
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Get room client count
   */
  getRoomClientCount(roomName: string): number {
    return this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;
  }

  // ==========================================
  // Session Broadcasting
  // ==========================================

  /**
   * Broadcast session update to workspace
   */
  broadcastSessionUpdate(payload: SessionUpdatePayload) {
    const roomName = `workspace:${payload.workspaceId}`;
    this.server.to(roomName).emit('sessionUpdate', payload);
    this.logger.log(
      `Broadcasted session update to ${roomName}: ${payload.session ? 'active' : 'ended'}`,
    );
  }

  /**
   * Broadcast session ended to all participants
   */
  broadcastSessionEnded(sessionId: string, reason: string = 'host_ended') {
    const roomName = `session:${sessionId}`;
    const clientCount = this.getRoomClientCount(roomName);

    this.logger.log(
      `[Session Ended] Broadcasting to ${roomName}: ${clientCount} clients, reason: ${reason}`,
    );

    this.server.to(roomName).emit('sessionEnded', {
      sessionId,
      reason,
      timestamp: Date.now(),
    });
  }

  // ==========================================
  // Transcript Broadcasting
  // ==========================================

  /**
   * Broadcast new transcript to session participants
   */
  broadcastNewTranscript(sessionId: string, payload: NewTranscriptPayload) {
    const roomName = `session:${sessionId}`;
    const clientCount = this.getRoomClientCount(roomName);

    this.logger.log(
      `[Transcript Broadcast] Room: ${roomName}, Clients: ${clientCount}, Speaker: ${payload.speakerName}, Text: "${payload.text.substring(0, 30)}..."`,
    );

    if (clientCount === 0) {
      this.logger.warn(
        `[Transcript Broadcast] No clients in room ${roomName}!`,
      );
    }

    this.server.to(roomName).emit('newTranscript', payload);
  }

  /**
   * Send translated transcript to specific user
   */
  sendTranslatedTranscript(
    userId: string,
    payload: TranslatedTranscriptPayload,
  ) {
    const roomName = `user:${userId}`;
    const clientCount = this.getRoomClientCount(roomName);

    this.logger.log(
      `[Translated Transcript] Room: ${roomName}, Clients: ${clientCount}, ${payload.sourceLanguage} → ${payload.targetLanguage}`,
    );

    if (clientCount === 0) {
      this.logger.warn(
        `[Translated Transcript] No clients in room ${roomName}!`,
      );
    }

    this.server.to(roomName).emit('translatedTranscript', payload);
  }

  /**
   * Broadcast language change to session participants
   */
  broadcastLanguageChange(sessionId: string, payload: LanguageChangedPayload) {
    const roomName = `session:${sessionId}`;
    const clientCount = this.getRoomClientCount(roomName);

    this.logger.log(
      `[Language Change] Room: ${roomName}, Clients: ${clientCount}, User: ${payload.userName}, Language: ${payload.languageCode}`,
    );

    this.server.to(roomName).emit('languageChanged', payload);
  }

  // ==========================================
  // Summary Broadcasting
  // ==========================================

  /**
   * Broadcast AI summary status update
   */
  broadcastSummaryStatus(payload: SummaryStatusPayload) {
    const roomName = `workspace:${payload.workspaceId}`;
    this.server.to(roomName).emit('summaryStatusUpdate', payload);
    this.logger.log(
      `Broadcasted summary status to ${roomName}: session=${payload.sessionId}, status=${payload.status}`,
    );
  }

  // ==========================================
  // Invitation Broadcasting
  // ==========================================

  /**
   * Send invitation notification to specific user
   */
  sendInvitationNotification(
    userId: string,
    payload: InvitationNotificationPayload,
  ) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('invitationNotification', payload);
    this.logger.log(
      `Sent invitation notification to user ${userId}: ${payload.type}`,
    );
  }

  // ==========================================
  // Utility
  // ==========================================

  /**
   * Get workspace client count
   */
  async getWorkspaceClientCount(workspaceId: string): Promise<number> {
    const roomName = `workspace:${workspaceId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    return sockets.length;
  }
}
