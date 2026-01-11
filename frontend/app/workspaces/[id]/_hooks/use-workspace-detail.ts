'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { API_URL, type NavItemId } from '../_lib/constants';
import type { Workspace, UserInfo, MeetingSession, WorkspaceFile, WorkspaceMember, WorkspaceEvent, WorkspaceEventType, CreateEventDto, CreateEventTypeDto, UpdateEventTypeDto } from '../_lib/types';

interface InvitableUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface PendingInvitation {
  id: string;
  invitee: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  status: string;
  createdAt: string;
}

interface UseWorkspaceDetailProps {
  workspaceId: string;
}

interface UseWorkspaceDetailReturn {
  // Data
  workspace: Workspace | null;
  user: UserInfo | null;
  sessions: MeetingSession[];
  files: WorkspaceFile[];
  members: WorkspaceMember[];
  pendingInvitations: PendingInvitation[];
  activeSessions: MeetingSession[];
  events: WorkspaceEvent[];
  eventTypes: WorkspaceEventType[];
  isOwner: boolean;

  // Navigation
  activeNav: NavItemId;
  setActiveNav: (id: NavItemId) => void;

  // Loading states
  isLoading: boolean;
  isSessionsLoading: boolean;
  isFilesLoading: boolean;
  isEventsLoading: boolean;
  isEventTypesLoading: boolean;

  // Meeting Actions
  startMeeting: (title?: string) => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  viewSession: (session: MeetingSession) => void;

  // File Actions
  uploadFiles: (files: FileList) => Promise<void>;
  downloadFile: (file: WorkspaceFile) => void;
  deleteFile: (file: WorkspaceFile) => Promise<void>;
  renameFile: (file: WorkspaceFile, newName: string) => Promise<void>;
  getFilePreviewUrl: (file: WorkspaceFile) => Promise<string | null>;

  // Member Actions
  inviteMember: (userId: string) => Promise<void>;
  kickMember: (memberId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<InvitableUser[]>;

  // Event Actions
  createEvent: (data: CreateEventDto) => Promise<void>;
  updateEvent: (eventId: string, data: Partial<CreateEventDto>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;

  // Event Type Actions
  createEventType: (data: CreateEventTypeDto) => Promise<void>;
  updateEventType: (typeId: string, data: UpdateEventTypeDto) => Promise<void>;
  deleteEventType: (typeId: string) => Promise<void>;

  // Workspace Actions
  updateWorkspace: (data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
  }) => Promise<void>;
  deleteWorkspace: () => Promise<void>;

  // Action states
  isStartingMeeting: boolean;
  isJoiningSession: boolean;
  isUploading: boolean;

  // WebSocket
  isConnected: boolean;
}

export function useWorkspaceDetail({ workspaceId }: UseWorkspaceDetailProps): UseWorkspaceDetailReturn {
  const router = useRouter();
  
  // Data states
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [activeSessions, setActiveSessions] = useState<MeetingSession[]>([]);
  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<WorkspaceEventType[]>([]);

  // Navigation
  const [activeNav, setActiveNav] = useState<NavItemId>('meeting');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [isFilesLoading, setIsFilesLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isEventTypesLoading, setIsEventTypesLoading] = useState(true);

  // Action states
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // WebSocket
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // Computed
  const isOwner = !!(user && workspace?.owner && user.id === workspace.owner.id);
  
  // Fetch workspace data
  const fetchWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workspace');
      const data = await response.json();
      setWorkspace(data);
      // Set members from workspace data if available
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast.error('워크스페이스를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);
  
  // Fetch user info
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [router]);
  
  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setIsSessionsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/sessions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        const sessionsArray = Array.isArray(data) ? data : [];
        setSessions(sessionsArray);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [workspaceId]);
  
  // Fetch active sessions (multiple)
  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/active-sessions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          setActiveSessions(Array.isArray(data) ? data : data ? [data] : []);
        } else {
          setActiveSessions([]);
        }
      } else {
        // Fallback: try the old single session endpoint
        const fallbackResponse = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/active-session`, {
          credentials: 'include',
        });
        if (fallbackResponse.ok) {
          const text = await fallbackResponse.text();
          if (text && text !== 'null') {
            const session = JSON.parse(text);
            setActiveSessions(session ? [session] : []);
          } else {
            setActiveSessions([]);
          }
        } else {
          setActiveSessions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions([]);
    }
  }, [workspaceId]);
  
  // Fetch files
  const fetchFiles = useCallback(async () => {
    setIsFilesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setFiles([]);
        return;
      }
      const data = await response.json();
      // API returns { files: [...], nextCursor, total } or just an array
      const filesArray = Array.isArray(data) ? data : (data.files && Array.isArray(data.files) ? data.files : []);
      setFiles(filesArray);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  }, [workspaceId]);
  
  // Start meeting
  const startMeeting = useCallback(async (title?: string) => {
    setIsStartingMeeting(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId, title: title || '새 회의' }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to start meeting');
      }
      
      const data = await response.json();
      router.push(`/workspaces/${workspaceId}/meeting/${data.session.id}`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast.error(error instanceof Error ? error.message : '회의 시작에 실패했습니다.');
    } finally {
      setIsStartingMeeting(false);
    }
  }, [workspaceId, router]);
  
  // Join session
  const joinSession = useCallback(async (sessionId: string) => {
    setIsJoiningSession(true);
    try {
      router.push(`/workspaces/${workspaceId}/meeting/${sessionId}`);
    } finally {
      setIsJoiningSession(false);
    }
  }, [workspaceId, router]);
  
  // View session detail
  const viewSession = useCallback((session: MeetingSession) => {
    console.log('View session:', session);
  }, []);
  
  // Upload files (one at a time - backend expects single file)
  const uploadFiles = useCallback(async (fileList: FileList) => {
    setIsUploading(true);
    try {
      const files = Array.from(fileList);
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to upload file');
        }
      }
      
      toast.success(files.length > 1 ? `${files.length}개 파일이 업로드되었습니다.` : '파일이 업로드되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  }, [workspaceId, fetchFiles]);
  
  // Download file
  const downloadFile = useCallback(async (file: WorkspaceFile) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();

      // Fetch the file as blob and trigger download
      const fileResponse = await fetch(data.presignedUrl);
      const blob = await fileResponse.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('파일 다운로드에 실패했습니다.');
    }
  }, [workspaceId]);
  
  // Delete file
  const deleteFile = useCallback(async (file: WorkspaceFile) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      
      toast.success('파일이 삭제되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('파일 삭제에 실패했습니다.');
    }
  }, [workspaceId, fetchFiles]);

  // Rename file
  const renameFile = useCallback(async (file: WorkspaceFile, newName: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename: newName }),
      });

      if (!response.ok) throw new Error('Failed to rename file');

      toast.success('파일 이름이 변경되었습니다.');
      await fetchFiles();
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('파일 이름 변경에 실패했습니다.');
    }
  }, [workspaceId, fetchFiles]);

  // Get file preview URL (presigned URL)
  const getFilePreviewUrl = useCallback(async (file: WorkspaceFile): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.presignedUrl;
    } catch (error) {
      console.error('Error getting file preview URL:', error);
      return null;
    }
  }, [workspaceId]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setIsEventsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setEvents([]);
        return;
      }
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [workspaceId]);

  // Create event
  const createEvent = useCallback(async (data: CreateEventDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create event');
      }

      toast.success('일정이 추가되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error instanceof Error ? error.message : '일정 추가에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  // Update event
  const updateEvent = useCallback(async (eventId: string, data: Partial<CreateEventDto>) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update event');
      }

      toast.success('일정이 수정되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error instanceof Error ? error.message : '일정 수정에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete event');
      }

      toast.success('일정이 삭제되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error instanceof Error ? error.message : '일정 삭제에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  // Fetch event types
  const fetchEventTypes = useCallback(async () => {
    setIsEventTypesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setEventTypes([]);
        return;
      }
      const data = await response.json();
      setEventTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching event types:', error);
      setEventTypes([]);
    } finally {
      setIsEventTypesLoading(false);
    }
  }, [workspaceId]);

  // Create event type
  const createEventType = useCallback(async (data: CreateEventTypeDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create event type');
      }

      toast.success('이벤트 유형이 추가되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 추가에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  // Update event type
  const updateEventType = useCallback(async (typeId: string, data: UpdateEventTypeDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update event type');
      }

      toast.success('이벤트 유형이 수정되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error updating event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 수정에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  // Delete event type
  const deleteEventType = useCallback(async (typeId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types/${typeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete event type');
      }

      toast.success('이벤트 유형이 삭제되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error deleting event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 삭제에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  // Fetch pending invitations for this workspace
  const fetchPendingInvitations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setPendingInvitations([]);
        return;
      }

      const data = await response.json();
      setPendingInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      setPendingInvitations([]);
    }
  }, [workspaceId]);

  // Invite member
  const inviteMember = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to invite member');
      }

      toast.success('멤버를 초대했습니다.');
      await fetchPendingInvitations();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error(error instanceof Error ? error.message : '멤버 초대에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchPendingInvitations]);

  // Kick member
  const kickMember = useCallback(async (memberId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to kick member');
      }

      toast.success('멤버를 내보냈습니다.');
      await fetchWorkspace();
    } catch (error) {
      console.error('Error kicking member:', error);
      toast.error(error instanceof Error ? error.message : '멤버 내보내기에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchWorkspace]);

  // Cancel invitation
  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel invitation');
      }

      toast.success('초대를 취소했습니다.');
      // Remove from local state
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error(error instanceof Error ? error.message : '초대 취소에 실패했습니다.');
      throw error;
    }
  }, [workspaceId]);

  // Search users
  const searchUsers = useCallback(async (query: string): Promise<InvitableUser[]> => {
    try {
      const response = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, []);
  
  // Update workspace
  const updateWorkspace = useCallback(async (data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
  }) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update workspace');
      }
      
      await fetchWorkspace();
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }, [workspaceId, fetchWorkspace]);
  
  // Delete workspace
  const deleteWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete workspace');
      }
      
      toast.success('워크스페이스가 삭제되었습니다.');
      router.push('/workspaces');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }, [workspaceId, router]);
  
  // Socket.IO connection
  useEffect(() => {
    if (!workspaceId) return;

    const socket = io(`${API_URL}/workspace`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true, // SocketContext와 별도의 소켓 인스턴스 생성
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to workspace namespace');
      setIsConnected(true);
      socket.emit('joinWorkspace', workspaceId, (response: any) => {
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

    socket.on('sessionUpdate', (payload: { workspaceId: string; session: MeetingSession | null; action?: 'started' | 'ended' }) => {
      console.log('[WebSocket] Session update received:', payload);

      if (payload.workspaceId === workspaceId) {
        if (payload.session) {
          if (payload.session.status === 'active') {
            // Add or update active session
            setActiveSessions((prev) => {
              const exists = prev.some((s) => s.id === payload.session!.id);
              if (!exists) {
                return [...prev, payload.session!];
              }
              return prev.map((s) => s.id === payload.session!.id ? payload.session! : s);
            });
          } else {
            // Remove ended session from active list
            setActiveSessions((prev) => prev.filter((s) => s.id !== payload.session!.id));
          }
          // Update sessions list
          setSessions((prev) => {
            const exists = prev.some((s) => s.id === payload.session!.id);
            if (!exists) {
              return [payload.session!, ...prev];
            }
            return prev.map((s) => s.id === payload.session!.id ? payload.session! : s);
          });
        } else {
          // Fallback: refetch all sessions
          fetchSessions();
          fetchActiveSessions();
        }
      }
    });

    // 회의에서 자동 추출된 이벤트 알림
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
        // 이벤트 목록 새로고침
        fetchEvents();
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
  }, [workspaceId, fetchSessions, fetchActiveSessions, fetchEvents, setActiveNav]);
  
  // Initial data fetch
  useEffect(() => {
    fetchWorkspace();
    fetchUser();
    fetchSessions();
    fetchActiveSessions();
    fetchFiles();
    fetchPendingInvitations();
    fetchEvents();
    fetchEventTypes();
  }, [fetchWorkspace, fetchUser, fetchSessions, fetchActiveSessions, fetchFiles, fetchPendingInvitations, fetchEvents, fetchEventTypes]);

  return {
    // Data
    workspace,
    user,
    sessions,
    files,
    members,
    pendingInvitations,
    activeSessions,
    events,
    eventTypes,
    isOwner,

    // Navigation
    activeNav,
    setActiveNav,

    // Loading states
    isLoading,
    isSessionsLoading,
    isFilesLoading,
    isEventsLoading,
    isEventTypesLoading,

    // Meeting Actions
    startMeeting,
    joinSession,
    viewSession,

    // File Actions
    uploadFiles,
    downloadFile,
    deleteFile,
    renameFile,
    getFilePreviewUrl,

    // Member Actions
    inviteMember,
    kickMember,
    cancelInvitation,
    searchUsers,

    // Event Actions
    createEvent,
    updateEvent,
    deleteEvent,

    // Event Type Actions
    createEventType,
    updateEventType,
    deleteEventType,

    // Workspace Actions
    updateWorkspace,
    deleteWorkspace,

    // Action states
    isStartingMeeting,
    isJoiningSession,
    isUploading,

    // WebSocket
    isConnected,
  };
}
