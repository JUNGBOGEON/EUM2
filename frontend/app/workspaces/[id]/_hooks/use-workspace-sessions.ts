'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { MeetingSession } from '../_lib/types';

interface UseWorkspaceSessionsProps {
  workspaceId: string;
}

interface UseWorkspaceSessionsReturn {
  sessions: MeetingSession[];
  activeSessions: MeetingSession[];
  isSessionsLoading: boolean;
  isStartingMeeting: boolean;
  isJoiningSession: boolean;
  fetchSessions: () => Promise<void>;
  fetchActiveSessions: () => Promise<void>;
  startMeeting: (title?: string) => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  viewSession: (session: MeetingSession) => void;
  setSessions: React.Dispatch<React.SetStateAction<MeetingSession[]>>;
  setActiveSessions: React.Dispatch<React.SetStateAction<MeetingSession[]>>;
}

export function useWorkspaceSessions({ workspaceId }: UseWorkspaceSessionsProps): UseWorkspaceSessionsReturn {
  const router = useRouter();
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<MeetingSession[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);

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

  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/active-session`, {
        credentials: 'include',
      });
      if (response.ok) {
        const text = await response.text();
        if (text && text !== 'null') {
          const data = JSON.parse(text);
          setActiveSessions(Array.isArray(data) ? data : [data]);
        } else {
          setActiveSessions([]);
        }
      } else {
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions([]);
    }
  }, [workspaceId]);

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

  const joinSession = useCallback(async (sessionId: string) => {
    setIsJoiningSession(true);
    try {
      router.push(`/workspaces/${workspaceId}/meeting/${sessionId}`);
    } finally {
      setIsJoiningSession(false);
    }
  }, [workspaceId, router]);

  const viewSession = useCallback((session: MeetingSession) => {
    console.log('View session:', session);
  }, []);

  return {
    sessions,
    activeSessions,
    isSessionsLoading,
    isStartingMeeting,
    isJoiningSession,
    fetchSessions,
    fetchActiveSessions,
    startMeeting,
    joinSession,
    viewSession,
    setSessions,
    setActiveSessions,
  };
}
