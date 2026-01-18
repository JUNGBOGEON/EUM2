'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { API_URL, type NavItemId } from '../_lib/constants';
import type { MeetingSession } from '../_lib/types';
import type { MemberPermissions } from '@/lib/types/workspace';

// Sub-hooks
import { useWorkspaceData } from './use-workspace-data';
import { useWorkspaceSessions } from './use-workspace-sessions';
import { useWorkspaceFiles } from './use-workspace-files';
import { useWorkspaceMembers } from './use-workspace-members';
import { useWorkspaceEvents } from './use-workspace-events';
import { useWorkspaceRoles } from './use-workspace-roles';

interface UseWorkspaceDetailProps {
  workspaceId: string;
}

export function useWorkspaceDetail({ workspaceId }: UseWorkspaceDetailProps) {
  // Navigation state
  const [activeNav, setActiveNav] = useState<NavItemId>('meeting');

  // Initialize activeNav from localStorage
  useEffect(() => {
    const savedNav = localStorage.getItem(`workspace_nav_${workspaceId}`);
    if (savedNav) {
      setActiveNav(savedNav as NavItemId);
    }
  }, [workspaceId]);

  // Persist activeNav changes
  useEffect(() => {
    if (activeNav) {
      localStorage.setItem(`workspace_nav_${workspaceId}`, activeNav);
    }
  }, [activeNav, workspaceId]);

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Sub-hooks
  const workspaceData = useWorkspaceData({ workspaceId });
  const sessionsData = useWorkspaceSessions({ workspaceId });
  const filesData = useWorkspaceFiles({ workspaceId });
  const membersData = useWorkspaceMembers({
    workspaceId,
    onWorkspaceUpdate: workspaceData.fetchWorkspace,
  });
  const eventsData = useWorkspaceEvents({ workspaceId });
  const rolesData = useWorkspaceRoles({ workspaceId, onRoleChange: workspaceData.fetchWorkspace });

  // User permissions state


  // Update members when workspace data changes
  useEffect(() => {
    if (workspaceData.workspace?.members) {
      membersData.setMembers(workspaceData.workspace.members);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceData.workspace?.members]);



  // Socket.IO connection
  useEffect(() => {
    if (!workspaceId) return;

    const socket = io(`${API_URL}/workspace`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to workspace namespace');
      setIsConnected(true);
      socket.emit('joinWorkspace', workspaceId, (response: unknown) => {
        console.log('[WebSocket] Joined workspace room:', response);
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setIsConnected(false);
    });

    socket.on('sessionUpdate', (payload: { workspaceId: string; session: MeetingSession | null }) => {
      console.log('[WebSocket] Session update received:', payload);

      if (payload.workspaceId === workspaceId) {
        if (payload.session) {
          if (payload.session.status === 'active') {
            sessionsData.setActiveSessions((prev) => {
              const exists = prev.some((s) => s.id === payload.session!.id);
              if (!exists) {
                return [...prev, payload.session!];
              }
              return prev.map((s) => s.id === payload.session!.id ? payload.session! : s);
            });
          } else {
            sessionsData.setActiveSessions((prev) => prev.filter((s) => s.id !== payload.session!.id));
          }
          sessionsData.setSessions((prev) => {
            const exists = prev.some((s) => s.id === payload.session!.id);
            if (!exists) {
              return [payload.session!, ...prev];
            }
            return prev.map((s) => s.id === payload.session!.id ? payload.session! : s);
          });
        } else {
          sessionsData.fetchSessions();
          sessionsData.fetchActiveSessions();
        }
      }
    });

    socket.on('autoEventsCreated', (payload: {
      sessionId: string;
      createdCount: number;
      pendingCount: number;
      createdEventIds: string[];
    }) => {
      console.log('[WebSocket] Auto events created:', payload);

      if (payload.createdCount > 0) {
        toast.success(`회의에서 ${payload.createdCount}개 일정이 자동 추가되었습니다`, {
          action: {
            label: '캘린더 보기',
            onClick: () => setActiveNav('calendar'),
          },
          duration: 8000,
        });
        eventsData.fetchEvents();
      }

      if (payload.pendingCount > 0) {
        toast.info(`${payload.pendingCount}개 일정의 확인이 필요합니다`, {
          duration: 10000,
        });
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('leaveWorkspace', workspaceId);
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('sessionUpdate');
      socket.off('autoEventsCreated');
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Initial data fetch - only run once when workspaceId changes
  useEffect(() => {
    workspaceData.fetchWorkspace();
    workspaceData.fetchUser();
    sessionsData.fetchSessions();
    sessionsData.fetchActiveSessions();
    filesData.fetchFiles();
    membersData.fetchPendingInvitations();
    eventsData.fetchEvents();
    eventsData.fetchEventTypes();
    rolesData.fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return {
    // Data
    workspace: workspaceData.workspace,
    user: workspaceData.user,
    sessions: sessionsData.sessions,
    files: filesData.files,
    members: membersData.members,
    pendingInvitations: membersData.pendingInvitations,
    activeSessions: sessionsData.activeSessions,
    events: eventsData.events,
    eventTypes: eventsData.eventTypes,
    isOwner: workspaceData.isOwner,
    userPermissions: workspaceData.permissions,
    roles: rolesData.roles,

    // Navigation
    activeNav,
    setActiveNav,

    // Loading states
    isLoading: workspaceData.isLoading,
    isSessionsLoading: sessionsData.isSessionsLoading,
    isFilesLoading: filesData.isFilesLoading,
    isEventsLoading: eventsData.isEventsLoading,
    isEventTypesLoading: eventsData.isEventTypesLoading,

    // Meeting Actions
    startMeeting: sessionsData.startMeeting,
    joinSession: sessionsData.joinSession,
    viewSession: sessionsData.viewSession,

    // File Actions
    uploadFiles: filesData.uploadFiles,
    downloadFile: filesData.downloadFile,
    deleteFile: filesData.deleteFile,
    renameFile: filesData.renameFile,
    getFilePreviewUrl: filesData.getFilePreviewUrl,

    // Member Actions
    inviteMember: membersData.inviteMember,
    kickMember: membersData.kickMember,
    cancelInvitation: membersData.cancelInvitation,
    searchUsers: membersData.searchUsers,

    // Event Actions
    createEvent: eventsData.createEvent,
    updateEvent: eventsData.updateEvent,
    deleteEvent: eventsData.deleteEvent,

    // Event Type Actions
    createEventType: eventsData.createEventType,
    updateEventType: eventsData.updateEventType,
    deleteEventType: eventsData.deleteEventType,

    // Workspace Actions
    updateWorkspace: workspaceData.updateWorkspace,
    deleteWorkspace: workspaceData.deleteWorkspace,

    // Role Actions
    assignRole: rolesData.assignRole,

    // Action states
    isStartingMeeting: sessionsData.isStartingMeeting,
    isJoiningSession: sessionsData.isJoiningSession,
    isUploading: filesData.isUploading,

    // WebSocket
    isConnected,
  };
}
