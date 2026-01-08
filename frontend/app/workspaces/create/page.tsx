'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!res.ok) {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description: description || undefined }),
      });

      if (response.ok) {
        router.push('/workspaces');
      } else {
        const data = await response.json();
        setError(data.message || '워크스페이스 생성에 실패했습니다.');
      }
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#191919]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e3e2e0] bg-white dark:border-[#ffffff14] dark:bg-[#191919]">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3">
          <Link href="/workspaces" className="flex items-center">
            <Image
              src="/logo/eum_black.svg"
              alt="EUM"
              width={36}
              height={13}
              className="dark:invert"
            />
          </Link>
          <Link
            href="/workspaces"
            className="text-[14px] text-[#37352fa6] hover:text-[#37352f] transition-colors dark:text-[#ffffff71] dark:hover:text-[#ffffffcf]"
          >
            취소
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[480px] px-4 py-16">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold text-[#37352f] dark:text-[#ffffffcf]">
            새 워크스페이스
          </h1>
          <p className="mt-2 text-[15px] text-[#37352fa6] dark:text-[#ffffff71]">
            팀과 함께할 공간을 만드세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[14px] text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-[14px] font-medium text-[#37352f] dark:text-[#ffffffcf] mb-2"
            >
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="워크스페이스 이름"
              className="w-full rounded-lg border border-[#e3e2e0] bg-white px-4 py-3 text-[15px] text-[#37352f] placeholder-[#37352f80] focus:border-[#37352f] focus:outline-none dark:border-[#ffffff14] dark:bg-[#252525] dark:text-[#ffffffcf] dark:placeholder-[#ffffff40] dark:focus:border-[#ffffff40]"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-[14px] font-medium text-[#37352f] dark:text-[#ffffffcf] mb-2"
            >
              설명 <span className="font-normal text-[#37352f80] dark:text-[#ffffff40]">(선택)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 공간인가요?"
              rows={3}
              className="w-full rounded-lg border border-[#e3e2e0] bg-white px-4 py-3 text-[15px] text-[#37352f] placeholder-[#37352f80] focus:border-[#37352f] focus:outline-none resize-none dark:border-[#ffffff14] dark:bg-[#252525] dark:text-[#ffffffcf] dark:placeholder-[#ffffff40] dark:focus:border-[#ffffff40]"
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#37352f] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#2f2f2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin dark:border-[#191919] dark:border-t-transparent" />
                생성 중...
              </>
            ) : (
              '워크스페이스 생성'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
