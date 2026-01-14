import Link from 'next/link';

interface HeroProps {
  onLoginClick: () => void;
}

export function Hero({ onLoginClick }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 overflow-hidden">
      {/* The Beam (Pulsating Line) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[200px] bg-white/20 animate-pulse" />

      <div className="relative z-10 w-full max-w-[1080px] text-center">
        {/* Headline: Semi-Abstract */}
        <h1 className="text-[60px] md:text-[100px] font-black leading-[0.9] tracking-tighter text-white mb-12 mix-blend-difference">
          언어의 끝,<br />
          연결의 시작.
        </h1>

        {/* Sub-headline: Concrete Value */}
        <div className="flex flex-col items-center gap-6">
          <p className="text-[15px] md:text-[18px] font-mono text-white/60 leading-[1.6] whitespace-pre-line tracking-wide">
            실시간 AI 번역과 고화질 화상회의가 만났습니다.
            {'\n'}
            언어 장벽 없는 글로벌 팀을 위한 단 하나의 플랫폼, EUM.
          </p>

          <button
            onClick={onLoginClick}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent border border-white/30 rounded-full overflow-hidden transition-all duration-500 hover:border-white"
          >
            <span className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out mix-blend-difference" />
            <span className="relative z-10 text-[15px] font-mono tracking-wider text-white group-hover:text-black transition-colors duration-500">
              LOGIN
            </span>
            <div className="relative z-10 w-2 h-2 rounded-full bg-white group-hover:bg-black transition-colors duration-500" />
          </button>
        </div>
      </div>

      {/* The Conflict (Conceptual Shadow) */}
      <div className="absolute bottom-12 left-0 w-full text-center px-4">
        <p className="text-[12px] text-white/20 font-mono tracking-widest uppercase">
          Resonance beyond Syntax
        </p>
      </div>
    </section>
  );
}
