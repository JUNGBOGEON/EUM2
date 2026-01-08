import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="pt-20 pb-24">
      <div className="mx-auto max-w-[1080px] px-4">
        <div className="max-w-[640px]">
          {/* Headline */}
          <h1 className="text-[42px] font-bold leading-[1.15] tracking-[-0.02em] text-[#ffffffcf]">
            말이 통하지 않아도,
            <br />
            마음은 통합니다.
          </h1>

          {/* Description - 철학적 */}
          <p className="mt-6 text-[17px] text-[#ffffff71] leading-[1.7]">
            언어는 장벽이 아닌 다리가 되어야 합니다.
            <br />
            EUM은 당신의 목소리가 세상 어디서든 이해받을 수 있도록,
            <br />
            경계 없는 대화의 공간을 만듭니다.
          </p>

          {/* CTA */}
          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-2.5 text-[15px] font-medium bg-[#ffffffcf] text-[#191919] hover:bg-white rounded-full transition-colors"
            >
              무료로 시작하기
            </Link>
            <span className="text-sm text-[#ffffff40]">
              별도의 설치 없이
            </span>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-20">
          <div className="relative aspect-[16/9] max-w-[900px] rounded-2xl border border-[#ffffff14] overflow-hidden bg-[#252525]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Image
                  src="/logo/logo_black.svg"
                  alt="EUM Preview"
                  width={80}
                  height={80}
                  className="mx-auto opacity-10 invert"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
