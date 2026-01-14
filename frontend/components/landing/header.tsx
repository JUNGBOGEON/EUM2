'use client';

import Link from 'next/link';
import Image from 'next/image';

interface HeaderProps {
  onLoginClick: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-black border-b border-white/10 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo/eum_black.svg"
              alt="EUM"
              width={36}
              height={13}
              className="invert opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onLoginClick}
                className="px-6 py-2 text-[12px] font-mono border border-white/20 text-white hover:bg-white hover:text-black hover:border-white transition-all duration-300"
              >
                LOGIN
              </button>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
