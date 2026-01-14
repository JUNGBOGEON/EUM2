'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="relative w-full flex items-center justify-center gap-4 bg-black border border-white/20 hover:border-white px-8 py-4 transition-all duration-500 group overflow-hidden"
    >
      {/* Hover Fill */}
      <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out mix-blend-difference" />

      {/* Icon */}
      <svg className="w-5 h-5 text-white mix-blend-difference relative z-10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.347.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.107-2.107 2.773-5.067 2.773-7.507 0-.747-.08-1.48-.213-2.333h-10.613z" />
      </svg>

      {/* Text */}
      <span className="text-[14px] font-mono tracking-wider text-white mix-blend-difference relative z-10 uppercase">
        구글로 증명하기
      </span>
    </button>
  );
}
