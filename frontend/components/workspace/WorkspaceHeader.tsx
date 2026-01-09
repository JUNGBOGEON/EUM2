'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Workspace, UserInfo } from './types';

interface WorkspaceHeaderProps {
  workspace: Workspace;
  user: UserInfo | null;
  memberCount?: number;
  isSocketConnected?: boolean;
}

export function WorkspaceHeader({ workspace, user, memberCount = 0, isSocketConnected }: WorkspaceHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    await fetch(`${API_URL}/api/auth/logout`, { credentials: 'include' });
    router.push('/login');
  };

  return (
    <header className="border-b border-[#e3e2e080] bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e3e2e080]">
        <button
          onClick={() => router.push('/workspaces')}
          className="flex items-center gap-2 text-[#37352f99] hover:text-[#37352f] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[13px]">워크스페이스 목록</span>
        </button>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#e3e2e0] flex items-center justify-center text-[12px] font-medium text-[#37352f]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[13px] text-[#37352f]">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[12px] text-[#37352f80] hover:text-[#37352f] transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* Workspace info */}
      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          {/* Workspace icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-semibold shadow-sm">
            {workspace.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-semibold text-[#37352f] truncate">
              {workspace.name}
            </h1>
            {workspace.description && (
              <p className="mt-1 text-[14px] text-[#37352f99] line-clamp-2">
                {workspace.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[13px] text-[#37352f80]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {memberCount}명의 멤버
              </span>
              {isSocketConnected !== undefined && (
                <span className="flex items-center gap-1.5 text-[12px] text-[#37352f60]">
                  <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {isSocketConnected ? '실시간 연결됨' : '연결 중...'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
