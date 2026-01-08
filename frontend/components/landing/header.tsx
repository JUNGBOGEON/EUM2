import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-[#191919]">
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/eum_black.svg"
            alt="EUM"
            width={36}
            height={13}
            className="dark:invert"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm text-[#37352f] hover:bg-[#f7f6f3] rounded-full transition-colors dark:text-[#ffffffcf] dark:hover:bg-[#ffffff0e]"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm text-white bg-[#37352f] hover:bg-[#2f2f2f] rounded-full transition-colors dark:bg-[#ffffffcf] dark:text-[#191919] dark:hover:bg-white"
          >
            시작하기
          </Link>
        </div>
      </nav>
    </header>
  );
}
