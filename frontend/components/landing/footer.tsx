import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-[#e3e2e0] bg-[#fbfbfa] dark:border-[#ffffff14] dark:bg-[#191919]">
      <div className="mx-auto max-w-[1080px] px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo & Copyright */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo/eum_black.svg"
                alt="EUM"
                width={64}
                height={22}
                className="opacity-60 dark:invert"
              />
            </Link>
            <p className="text-[13px] text-[#37352f80] dark:text-[#ffffff40]">
              © 2024 EUM. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-[13px] text-[#37352fa6] hover:text-[#37352f] transition-colors dark:text-[#ffffff71] dark:hover:text-[#ffffffcf]"
            >
              이용약관
            </Link>
            <Link
              href="#"
              className="text-[13px] text-[#37352fa6] hover:text-[#37352f] transition-colors dark:text-[#ffffff71] dark:hover:text-[#ffffffcf]"
            >
              개인정보처리방침
            </Link>
            <Link
              href="#"
              className="text-[13px] text-[#37352fa6] hover:text-[#37352f] transition-colors dark:text-[#ffffff71] dark:hover:text-[#ffffffcf]"
            >
              고객센터
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
