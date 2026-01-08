'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  WorkspaceHeader,
  ActiveSessionBanner,
  QuickStartMeeting,
  SessionHistoryList,
  MeetingDetailModal,
  WorkspaceStorage,
  type Workspace,
  type UserInfo,
  type MeetingSession,
} from '@/components/workspace';
import { useWorkspaceSocket, type SessionInfo } from '@/hooks/workspace';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<MeetingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // WebSocket 연결로 실시간 세션 업데이트 수신
  const handleSessionUpdate = useCallback((session: SessionInfo | null) => {
    if (session) {
      setActiveSession({
        id: session.id,
        title: session.title,
        status: session.status,
        hostId: session.hostId,
        startedAt: session.startedAt,
        participantCount: session.participantCount,
        host: session.host,
      } as MeetingSession);
    } else {
      setActiveSession(null);
      // 세션이 종료되면 히스토리 새로고침
      refreshSessionHistory();
    }
  }, []);

  // WebSocket 연결
  const { isConnected } = useWorkspaceSocket({
    workspaceId,
    onSessionUpdate: handleSessionUpdate,
  });

  // 세션 히스토리 새로고침
  const refreshSessionHistory = useCallback(async () => {
    try {
      const historyRes = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/sessions`, {
        credentials: 'include',
      });
      if (historyRes.ok) {
        const text = await historyRes.text();
        if (text) {
          setSessionHistory(JSON.parse(text));
        }
      }
    } catch {
      // Silent fail
    }
  }, [workspaceId]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      // 사용자 정보
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      // 워크스페이스 정보
      const workspaceRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: 'include',
      });
      if (!workspaceRes.ok) {
        throw new Error('워크스페이스를 찾을 수 없습니다.');
      }
      const workspaceData = await workspaceRes.json();
      setWorkspace(workspaceData);

      // 활성 세션 확인 (초기 로드시에만)
      try {
        const activeRes = await fetch(`${API_URL}/api/meetings/workspaces/${workspaceId}/active-session`, {
          credentials: 'include',
        });
        if (activeRes.ok) {
          const text = await activeRes.text();
          if (text && text !== 'null') {
            setActiveSession(JSON.parse(text));
          } else {
            setActiveSession(null);
          }
        } else {
          setActiveSession(null);
        }
      } catch {
        setActiveSession(null);
      }

      // 세션 히스토리
      await refreshSessionHistory();
    } catch (err) {
      console.error('Failed to load workspace:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, router, refreshSessionHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 새 회의 시작
  const handleStartMeeting = async (title?: string) => {
    setIsStarting(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId, title }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '회의 시작에 실패했습니다.');
      }

      const data = await response.json();
      router.push(`/workspaces/${workspaceId}/meeting/${data.session.id}`);
    } catch (err) {
      console.error('Failed to start meeting:', err);
      setError(err instanceof Error ? err.message : '회의 시작에 실패했습니다.');
      setIsStarting(false);
    }
  };

  // 활성 세션 참가
  const handleJoinSession = async () => {
    if (!activeSession) return;

    setIsJoining(true);
    try {
      router.push(`/workspaces/${workspaceId}/meeting/${activeSession.id}`);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(err instanceof Error ? err.message : '회의 참가에 실패했습니다.');
      setIsJoining(false);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[14px] text-[#37352f99]">로딩 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-[#37352f] mb-2">오류가 발생했습니다</h2>
          <p className="text-[14px] text-[#37352f99] mb-4">{error || '워크스페이스를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/workspaces')}
            className="px-4 py-2 bg-[#37352f] text-white rounded-lg text-[14px] font-medium hover:bg-[#37352f]/90 transition-colors"
          >
            워크스페이스 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <WorkspaceHeader
        workspace={workspace}
        user={user}
        memberCount={workspace.members?.length || 1}
        isSocketConnected={isConnected}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto">
        {/* Active session banner */}
        {activeSession && (
          <ActiveSessionBanner
            session={activeSession}
            onJoin={handleJoinSession}
            isJoining={isJoining}
          />
        )}

        {/* Quick start meeting */}
        {!activeSession && (
          <QuickStartMeeting
            onStart={handleStartMeeting}
            isStarting={isStarting}
          />
        )}

        {/* Storage Section */}
        {sessionHistory.length > 0 && (
          <WorkspaceStorage
            workspaceId={workspaceId}
            sessions={sessionHistory}
            onSessionClick={(sessionId) => {
              setSelectedSessionId(sessionId);
            }}
          />
        )}

        {/* Session history */}
        <SessionHistoryList
          sessions={sessionHistory}
          onSessionClick={(sessionId) => {
            setSelectedSessionId(sessionId);
          }}
        />
      </main>

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        isOpen={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        sessionId={selectedSessionId || ''}
      />
    </div>
  );
}
