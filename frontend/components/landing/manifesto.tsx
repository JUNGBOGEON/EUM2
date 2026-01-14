'use client';

import { useRef, useEffect } from 'react';

export function Manifesto() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                        entry.target.classList.remove('opacity-0', 'translate-y-10');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '-50px' }
        );

        const elements = containerRef.current?.querySelectorAll('.reveal-text');
        elements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={containerRef} className="py-40 bg-black text-white px-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="mx-auto max-w-[800px] flex flex-col gap-32">
                {/* Block 1: The Babel -> The Problem */}
                <div className="reveal-text opacity-0 translate-y-10 transition-all duration-1000 ease-out">
                    <span className="text-[12px] font-mono text-white/40 mb-4 block tracking-widest uppercase">
                        The Problem
                    </span>
                    <h2 className="text-[32px] md:text-[48px] font-bold leading-[1.3] tracking-tighter text-white/90">
                        우리는 모두<br />
                        다른 언어의 섬에 살고 있습니다.
                    </h2>
                    <p className="mt-6 text-[16px] text-white/50 leading-[1.8] font-mono">
                        훌륭한 아이디어도 언어가 다르면 전달되지 않습니다.<br />
                        번역기를 돌리고, 문장을 다듬느라<br />
                        당신의 진짜 생각은 흩어지고 맙니다.
                    </p>
                </div>

                {/* Block 2: The Void -> The Focus */}
                <div className="reveal-text opacity-0 translate-y-10 transition-all duration-1000 delay-200 ease-out text-right">
                    <span className="text-[12px] font-mono text-white/40 mb-4 block tracking-widest uppercase">
                        The Focus
                    </span>
                    <h2 className="text-[32px] md:text-[48px] font-bold leading-[1.3] tracking-tighter text-white/90">
                        복잡한 도구는<br />
                        대화를 방해할 뿐입니다.
                    </h2>
                    <p className="mt-6 text-[16px] text-white/50 leading-[1.8] font-mono">
                        EUM은 불필요한 기능을 모두 걷어냈습니다.<br />
                        오직 당신의 목소리와, 상대방의 이해.<br />
                        그 두 가지만 남겼습니다.
                    </p>
                </div>

                {/* Block 3: The Unification -> The Solution */}
                <div className="reveal-text opacity-0 translate-y-10 transition-all duration-1000 delay-400 ease-out text-center">
                    <span className="text-[12px] font-mono text-white/40 mb-4 block tracking-widest uppercase">
                        The Solution
                    </span>
                    <h2 className="text-[40px] md:text-[60px] font-black leading-[1.1] tracking-tighter text-white mix-blend-difference">
                        말하는 순간,<br />
                        이미 이해되고 있습니다.
                    </h2>
                    <p className="mt-8 text-[18px] text-white/70 leading-[1.8]">
                        AI가 당신의 말을 실시간으로 통역합니다.<br />
                        한국어로 말하면, 영어로 들립니다.<br />
                        이제 언어 걱정 없이, 마음껏 대화하세요.
                    </p>
                </div>
            </div>
        </section>
    );
}
