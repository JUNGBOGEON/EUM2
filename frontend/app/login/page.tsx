'use client';

import { GoogleLoginButton } from '@/components/auth/google-login-button';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#191919]">
      <div className="w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <Image
              src="/logo/logo_black.svg"
              alt="EUM"
              width={48}
              height={48}
              className="mx-auto invert"
            />
          </Link>
        </div>

        {/* Login Card */}
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-[28px] font-bold text-[#ffffffcf]">
              로그인
            </h1>
            <p className="mt-2 text-[15px] text-[#ffffff71]">
              EUM에 오신 것을 환영합니다
            </p>
          </div>

          <GoogleLoginButton />

          <p className="text-center text-[13px] text-[#ffffff40]">
            계속 진행하면{' '}
            <a href="#" className="underline hover:text-[#ffffffcf]">
              이용약관
            </a>{' '}
            및{' '}
            <a href="#" className="underline hover:text-[#ffffffcf]">
              개인정보처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-[14px] text-[#ffffff71] hover:text-[#ffffffcf] transition-colors"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
