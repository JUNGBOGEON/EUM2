'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData);

        const workspacesRes = await fetch(`${API_URL}/api/workspaces`, {
          credentials: 'include',
        });
        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          setWorkspaces(workspacesData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        credentials: 'include',
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191919]">
        <div className="h-5 w-5 border-2 border-[#37352f] border-t-transparent rounded-full animate-spin dark:border-[#ffffffcf] dark:border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#191919]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e3e2e0] bg-white dark:border-[#ffffff14] dark:bg-[#191919]">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo/eum_black.svg"
              alt="EUM"
              width={36}
              height={13}
              className="dark:invert"
            />
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
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
                <span className="text-sm text-[#37352f] dark:text-[#ffffffcf]">
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 text-sm text-[#37352fa6] hover:text-[#37352f] rounded-full hover:bg-[#f7f6f3] transition-colors dark:text-[#ffffff71] dark:hover:text-[#ffffffcf] dark:hover:bg-[#ffffff0e]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1080px] px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[28px] font-bold text-[#37352f] dark:text-[#ffffffcf]">
              워크스페이스
            </h1>
            <p className="mt-2 text-[15px] text-[#37352fa6] dark:text-[#ffffff71]">
              팀과 함께 협업할 공간을 선택하세요
            </p>
          </div>
          <Link
            href="/workspaces/create"
            className="px-5 py-2 text-[14px] font-medium text-white bg-[#37352f] hover:bg-[#2f2f2f] rounded-full transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
          >
            + 새 워크스페이스
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-2xl border border-[#e3e2e0] bg-[#fafafa] p-16 text-center dark:border-[#ffffff14] dark:bg-[#252525]">
            <p className="text-[15px] text-[#37352fa6] dark:text-[#ffffff71] mb-6">
              아직 워크스페이스가 없습니다
            </p>
            <Link
              href="/workspaces/create"
              className="inline-flex px-5 py-2 text-[14px] font-medium text-white bg-[#37352f] hover:bg-[#2f2f2f] rounded-full transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
            >
              첫 워크스페이스 만들기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.id}`}
                className="group rounded-xl border border-[#e3e2e0] bg-white p-5 hover:bg-[#fafafa] transition-colors dark:border-[#ffffff14] dark:bg-[#252525] dark:hover:bg-[#2f2f2f]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f7f6f3] text-lg dark:bg-[#191919]">
                    <span className="text-[#37352f] dark:text-[#ffffffcf]">
                      {workspace.icon || workspace.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#37352f] dark:text-[#ffffffcf] truncate">
                      {workspace.name}
                    </h3>
                    {workspace.description && (
                      <p className="mt-1 text-[14px] text-[#37352fa6] dark:text-[#ffffff71] line-clamp-2">
                        {workspace.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
