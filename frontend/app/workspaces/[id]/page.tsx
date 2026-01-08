'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  timestamp: Date;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'active' | 'ended';
  hostId: string;
  host?: { name: string };
  createdAt: string;
}

type TabType = 'chat' | 'video';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Meeting state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
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
        const workspaceRes = await fetch(`${API_URL}/api/workspaces/${params.id}`, {
          credentials: 'include',
        });
        if (workspaceRes.ok) {
          const workspaceData = await workspaceRes.json();
          setWorkspace(workspaceData);
        } else {
          router.push('/workspaces');
        }

        // 미팅 목록
        const meetingsRes = await fetch(`${API_URL}/api/meetings?workspaceId=${params.id}`, {
          credentials: 'include',
        });
        if (meetingsRes.ok) {
          const meetingsData = await meetingsRes.json();
          setMeetings(meetingsData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userImage: user.profileImage,
      content: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 미팅 생성
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    setIsCreatingMeeting(true);
    try {
      const response = await fetch(`${API_URL}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newMeetingTitle.trim(),
          workspaceId: params.id,
        }),
      });

      if (response.ok) {
        const newMeeting = await response.json();
        setMeetings((prev) => [newMeeting, ...prev]);
        setNewMeetingTitle('');
        // 미팅 생성 후 바로 입장
        router.push(`/workspaces/${params.id}/meeting/${newMeeting.id}`);
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  // 미팅 참가
  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/workspaces/${params.id}/meeting/${meetingId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191919]">
        <div className="h-5 w-5 border-2 border-[#37352f] border-t-transparent rounded-full animate-spin dark:border-[#ffffffcf] dark:border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#191919]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#e3e2e0] bg-white dark:border-[#ffffff14] dark:bg-[#191919]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/workspaces" className="flex items-center">
              <Image
                src="/logo/eum_black.svg"
                alt="EUM"
                width={36}
                height={13}
                className="dark:invert"
              />
            </Link>
            <span className="text-[#e3e2e0] dark:text-[#ffffff14]">/</span>
            <span className="text-[15px] font-medium text-[#37352f] dark:text-[#ffffffcf]">
              {workspace?.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7f6f3] dark:bg-[#252525]">
                    <span className="text-xs font-medium text-[#37352f] dark:text-[#ffffffcf]">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[200px] flex-shrink-0 border-r border-[#e3e2e0] bg-[#fbfbfa] dark:border-[#ffffff14] dark:bg-[#202020]">
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-colors ${
                activeTab === 'chat'
                  ? 'bg-[#37352f] text-white dark:bg-[#ffffffcf] dark:text-[#191919]'
                  : 'text-[#37352fa6] hover:bg-[#e3e2e0] dark:text-[#ffffff71] dark:hover:bg-[#ffffff14]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              팀 채팅
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-colors ${
                activeTab === 'video'
                  ? 'bg-[#37352f] text-white dark:bg-[#ffffffcf] dark:text-[#191919]'
                  : 'text-[#37352fa6] hover:bg-[#e3e2e0] dark:text-[#ffffff71] dark:hover:bg-[#ffffff14]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              화상회의
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'chat' ? (
            // 팀 채팅
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[15px] text-[#37352fa6] dark:text-[#ffffff71]">
                        아직 메시지가 없습니다
                      </p>
                      <p className="mt-1 text-[13px] text-[#37352f80] dark:text-[#ffffff40]">
                        첫 메시지를 보내 대화를 시작하세요
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.userId === user?.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {message.userImage ? (
                        <img
                          src={message.userImage}
                          alt={message.userName}
                          className="h-8 w-8 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7f6f3] dark:bg-[#252525] flex-shrink-0">
                          <span className="text-xs font-medium text-[#37352f] dark:text-[#ffffffcf]">
                            {message.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] ${
                          message.userId === user?.id ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 mb-1 ${
                            message.userId === user?.id ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span className="text-[13px] font-medium text-[#37352f] dark:text-[#ffffffcf]">
                            {message.userName}
                          </span>
                          <span className="text-[11px] text-[#37352f80] dark:text-[#ffffff40]">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-2xl text-[14px] ${
                            message.userId === user?.id
                              ? 'bg-[#37352f] text-white dark:bg-[#ffffffcf] dark:text-[#191919]'
                              : 'bg-[#f7f6f3] text-[#37352f] dark:bg-[#252525] dark:text-[#ffffffcf]'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 border-t border-[#e3e2e0] p-4 dark:border-[#ffffff14]">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 rounded-full border border-[#e3e2e0] bg-white px-4 py-2.5 text-[14px] text-[#37352f] placeholder-[#37352f80] focus:border-[#37352f] focus:outline-none dark:border-[#ffffff14] dark:bg-[#252525] dark:text-[#ffffffcf] dark:placeholder-[#ffffff40] dark:focus:border-[#ffffff40]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#37352f] text-white text-[14px] font-medium hover:bg-[#2f2f2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
                  >
                    전송
                  </button>
                </form>
              </div>
            </>
          ) : (
            // 화상회의
            <div className="flex-1 flex flex-col bg-[#fafafa] dark:bg-[#252525]">
              {/* 미팅 생성 */}
              <div className="p-6 border-b border-[#e3e2e0] dark:border-[#ffffff14]">
                <form onSubmit={handleCreateMeeting} className="flex gap-3">
                  <input
                    type="text"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="새 회의 제목..."
                    className="flex-1 rounded-full border border-[#e3e2e0] bg-white px-4 py-2.5 text-[14px] text-[#37352f] placeholder-[#37352f80] focus:border-[#37352f] focus:outline-none dark:border-[#ffffff14] dark:bg-[#191919] dark:text-[#ffffffcf] dark:placeholder-[#ffffff40] dark:focus:border-[#ffffff40]"
                  />
                  <button
                    type="submit"
                    disabled={!newMeetingTitle.trim() || isCreatingMeeting}
                    className="px-5 py-2.5 rounded-full bg-[#37352f] text-white text-[14px] font-medium hover:bg-[#2f2f2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
                  >
                    {isCreatingMeeting ? '생성 중...' : '회의 시작'}
                  </button>
                </form>
              </div>

              {/* 미팅 목록 */}
              <div className="flex-1 overflow-y-auto p-6">
                {meetings.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f6f3] dark:bg-[#191919]">
                        <svg className="w-8 h-8 text-[#37352f80] dark:text-[#ffffff40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-[15px] text-[#37352fa6] dark:text-[#ffffff71]">
                        아직 회의가 없습니다
                      </p>
                      <p className="mt-1 text-[13px] text-[#37352f80] dark:text-[#ffffff40]">
                        새 회의를 시작하여 팀과 소통하세요
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e3e2e0] dark:bg-[#191919] dark:border-[#ffffff14]"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${
                            meeting.status === 'active'
                              ? 'bg-green-500'
                              : meeting.status === 'scheduled'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`} />
                          <div>
                            <h3 className="text-[15px] font-medium text-[#37352f] dark:text-[#ffffffcf]">
                              {meeting.title}
                            </h3>
                            <p className="text-[13px] text-[#37352fa6] dark:text-[#ffffff71]">
                              {meeting.status === 'active' && '진행 중'}
                              {meeting.status === 'scheduled' && '예정됨'}
                              {meeting.status === 'ended' && '종료됨'}
                              {meeting.host && ` · ${meeting.host.name}`}
                            </p>
                          </div>
                        </div>
                        {meeting.status !== 'ended' && (
                          <button
                            onClick={() => handleJoinMeeting(meeting.id)}
                            className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-[#37352f] text-white hover:bg-[#2f2f2f] transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
                          >
                            {meeting.status === 'active' ? '참가' : '시작'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
