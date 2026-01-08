import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#191919]">
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/eum_black.svg"
            alt="EUM"
            width={36}
            height={13}
            className="invert"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm text-[#ffffffcf] hover:bg-[#ffffff0e] rounded-full transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 text-sm bg-[#ffffffcf] text-[#191919] hover:bg-white rounded-full transition-colors"
          >
            시작하기
          </Link>
        </div>
      </nav>
    </header>
  );
}
