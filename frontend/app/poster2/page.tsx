"use client";

import React, { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";

export default function Poster2Page() {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleResize = () => {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const targetHeight = 3180;
            const targetWidth = 2245;
            const verticalPadding = 20;
            const scaleH = (viewportHeight - verticalPadding) / targetHeight;
            const scaleW = (viewportWidth - verticalPadding) / targetWidth;
            setScale(Math.min(scaleH, scaleW, 0.95));
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center overflow-hidden fixed inset-0 print:static print:bg-white print:block">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;700&display=swap');
                @media print {
                  @page { size: A1 portrait; margin: 0; }
                  body { background: black; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  html, body { height: auto; overflow: visible; }
                }
            `}</style>

            <div className="origin-center transition-transform duration-300 print:transform-none print:m-0 print:p-0" style={{ transform: `scale(${scale})` }}>
                <main ref={containerRef} className="bg-black text-white relative flex flex-col items-center overflow-hidden shadow-2xl print:shadow-none border border-neutral-800 print:border-none" style={{ width: "594mm", height: "841mm", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}>

                    {/* Grid Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-15" style={{ backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`, backgroundSize: '10mm 10mm' }} />
                    <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)`, backgroundSize: '50mm 50mm' }} />

                    <div className="w-full h-full p-[18mm] flex flex-col relative z-10">

                        {/* =============== HEADER =============== */}
                        <header className="border-b-[1mm] border-white/50 pb-[6mm] mb-[10mm] flex justify-between items-end">
                            <div>
                                <div className="flex items-center gap-[4mm] mb-[1mm]">
                                    <span className="bg-white text-black font-mono font-bold px-[2mm] text-[1rem]">SYS.2.0.0</span>
                                    <span className="font-mono text-neutral-500 text-[1rem] tracking-widest">ARCHITECTURAL BLUEPRINT</span>
                                </div>
                                <h1 className="text-[9rem] font-black leading-[0.75] tracking-tighter text-white">EUM</h1>
                                <h2 className="text-[1.8rem] font-medium tracking-[0.15em] mt-[2mm] text-neutral-400 uppercase">Experience Unbounded Meeting</h2>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="flex gap-[4mm] mb-[3mm]">
                                    <div className="flex flex-col items-end"><span className="text-[0.8rem] font-mono text-neutral-600">REGION</span><span className="text-[1.1rem] font-mono font-bold">ap-northeast-2</span></div>
                                    <div className="flex flex-col items-end"><span className="text-[0.8rem] font-mono text-neutral-600">LATENCY</span><span className="text-[1.1rem] font-mono font-bold">&lt; 200ms</span></div>
                                    <div className="flex flex-col items-end"><span className="text-[0.8rem] font-mono text-neutral-600">STATUS</span><span className="text-[1.1rem] font-mono font-bold text-green-500">ONLINE</span></div>
                                </div>
                                <p className="font-mono text-[1.1rem] text-neutral-500 max-w-[100mm] leading-tight text-right">AI-POWERED COLLABORATION</p>
                            </div>
                        </header>

                        {/* =============== MAIN 4-QUADRANT GRID =============== */}
                        <div className="flex-1 grid grid-cols-2 gap-[12mm]">

                            {/* =========================================================================
                                01. AI TRANSLATION SYSTEM (MEGA DENSE)
                               ========================================================================= */}
                            <section className="bg-neutral-900/40 border border-white/20 p-[6mm] flex flex-col">
                                <div className="flex justify-between items-start mb-[3mm]">
                                    <h3 className="text-[2.5rem] font-bold leading-none">AI 자동 번역 시스템</h3>
                                    <span className="font-mono text-[1.8rem] text-white/20 font-bold">01</span>
                                </div>
                                <div className="h-[0.5mm] w-full bg-white/30 mb-[4mm]"></div>

                                <div className="flex-1 flex flex-col gap-[4mm] text-[0.85rem]">

                                    {/* Pipeline Flow */}
                                    <div className="bg-[#0a0a0a] border border-white/10 p-[3mm]">
                                        <span className="text-neutral-500 font-mono text-[0.75rem] block mb-[2mm]">// PIPELINE ARCHITECTURE</span>
                                        <div className="flex items-center justify-between text-center font-mono text-[0.7rem] text-neutral-300">
                                            <div className="bg-blue-900/30 border border-blue-500/30 px-[2mm] py-[1mm] rounded">MIC<br /><span className="text-[0.6rem] text-blue-400">PCM</span></div>
                                            <span>→</span>
                                            <div className="bg-yellow-900/30 border border-yellow-500/30 px-[2mm] py-[1mm] rounded">AWS<br /><span className="text-[0.6rem] text-yellow-400">Transcribe</span></div>
                                            <span>→</span>
                                            <div className="bg-green-900/30 border border-green-500/30 px-[2mm] py-[1mm] rounded">BACKEND<br /><span className="text-[0.6rem] text-green-400">Redis+Group</span></div>
                                            <span>→</span>
                                            <div className="bg-purple-900/30 border border-purple-500/30 px-[2mm] py-[1mm] rounded">AWS<br /><span className="text-[0.6rem] text-purple-400">Translate</span></div>
                                            <span>→</span>
                                            <div className="bg-cyan-900/30 border border-cyan-500/30 px-[2mm] py-[1mm] rounded">WS<br /><span className="text-[0.6rem] text-cyan-400">Broadcast</span></div>
                                            <span>→</span>
                                            <div className="bg-pink-900/30 border border-pink-500/30 px-[2mm] py-[1mm] rounded">CLIENT<br /><span className="text-[0.6rem] text-pink-400">Subtitle</span></div>
                                        </div>
                                    </div>

                                    {/* Room Architecture Table */}
                                    <div className="border border-white/10">
                                        <div className="grid grid-cols-3 bg-white/10 p-[1.5mm] font-mono font-bold text-[0.7rem] border-b border-white/10">
                                            <span>ROOM TYPE</span><span>PURPOSE</span><span>TARGET</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1.5mm] font-mono text-[0.7rem] border-b border-white/5">
                                            <span className="text-green-400">user:&#123;userId&#125;</span><span className="text-neutral-400">번역 결과 (개인)</span><span>Individual</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1.5mm] font-mono text-[0.7rem] border-b border-white/5">
                                            <span className="text-blue-400">session:&#123;id&#125;</span><span className="text-neutral-400">원본 브로드캐스트</span><span>All Participants</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1.5mm] font-mono text-[0.7rem]">
                                            <span className="text-neutral-500">workspace:&#123;id&#125;</span><span className="text-neutral-400">워크스페이스 공지</span><span>Members</span>
                                        </div>
                                    </div>

                                    {/* 2-Column: Forced Segmentation + Caching */}
                                    <div className="grid grid-cols-2 gap-[3mm]">
                                        <div className="bg-[#0a0a0a] border border-red-500/20 p-[3mm]">
                                            <span className="text-red-400 font-mono text-[0.7rem] block mb-[1mm]">// FORCED SEGMENTATION</span>
                                            <div className="space-y-[1mm] font-mono text-[0.7rem]">
                                                <div className="flex justify-between"><span className="text-neutral-500">Max Length:</span><span className="text-yellow-400">&gt; 80 chars</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Timeout:</span><span className="text-yellow-400">&gt; 5000ms</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">Sentence End:</span><span className="text-white">-습니다, -해요</span></div>
                                            </div>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-purple-500/20 p-[3mm]">
                                            <span className="text-purple-400 font-mono text-[0.7rem] block mb-[1mm]">// REDIS CACHE</span>
                                            <div className="space-y-[1mm] font-mono text-[0.7rem]">
                                                <div className="flex justify-between"><span className="text-neutral-500">Key:</span><span className="text-white">MD5(text+langs)</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">TTL:</span><span className="text-green-400">24 Hours</span></div>
                                                <div className="flex justify-between"><span className="text-neutral-500">LRU:</span><span className="text-blue-400">100 entries</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Supported Languages */}
                                    <div className="bg-white/5 p-[3mm] border border-white/10">
                                        <span className="text-neutral-500 font-mono text-[0.7rem] block mb-[1mm]">SUPPORTED_LANGUAGES</span>
                                        <div className="flex gap-[2mm] font-mono text-[0.8rem]">
                                            <span className="bg-blue-900/50 px-[2mm] rounded">ko-KR</span>
                                            <span className="bg-red-900/50 px-[2mm] rounded">en-US</span>
                                            <span className="bg-pink-900/50 px-[2mm] rounded">ja-JP</span>
                                            <span className="bg-yellow-900/50 px-[2mm] rounded">zh-CN</span>
                                        </div>
                                    </div>

                                    {/* Performance Table (Condensed) */}
                                    <div className="mt-auto border border-white/10">
                                        <div className="grid grid-cols-3 bg-green-900/20 p-[1.5mm] font-mono font-bold text-[0.65rem] border-b border-white/10">
                                            <span>OPTIMIZATION</span><span>TECHNIQUE</span><span>EFFECT</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1mm] font-mono text-[0.65rem] border-b border-white/5">
                                            <span>번역 캐싱</span><span className="text-neutral-400">Redis 24h TTL</span><span className="text-green-400">중복 호출 방지</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1mm] font-mono text-[0.65rem] border-b border-white/5">
                                            <span>언어 그룹화</span><span className="text-neutral-400">같은 언어 1회 번역</span><span className="text-green-400">API 호출 감소</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1mm] font-mono text-[0.65rem]">
                                            <span>병렬 전송</span><span className="text-neutral-400">Promise.all()</span><span className="text-green-400">순차→병렬</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* =========================================================================
                                02. WHITEBOARD (PIXI + SOCKET)
                               ========================================================================= */}
                            <section className="bg-neutral-900/40 border border-white/20 p-[6mm] flex flex-col">
                                <div className="flex justify-between items-start mb-[3mm]">
                                    <h3 className="text-[2.5rem] font-bold leading-none">디지털 캔버스</h3>
                                    <span className="font-mono text-[1.8rem] text-white/20 font-bold">02</span>
                                </div>
                                <div className="h-[0.5mm] w-full bg-white/30 mb-[4mm]"></div>

                                <div className="flex-1 flex flex-col gap-[4mm] text-[0.85rem]">
                                    <div className="flex justify-between text-[0.9rem] font-mono text-neutral-400 border-b border-white/10 pb-[2mm]">
                                        <span>ENGINE: REACT + PIXI.JS (WEBGL)</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-[3mm]">
                                        <div className="bg-[#111] p-[3mm] border border-white/10">
                                            <span className="text-neutral-500 text-[0.7rem] block mb-[1mm]">RENDERER</span>
                                            <code className="text-[0.75rem] font-mono text-green-400">
                                                PIXI.Application &#123;<br />
                                                &nbsp;&nbsp;antialias: true,<br />
                                                &nbsp;&nbsp;resolution: 2<br />
                                                &#125;
                                            </code>
                                        </div>
                                        <div className="bg-[#111] p-[3mm] border border-white/10">
                                            <span className="text-neutral-500 text-[0.7rem] block mb-[1mm]">NAMESPACE</span>
                                            <p className="text-[1rem] font-mono mb-[1mm]">/whiteboard</p>
                                            <div className="flex gap-[2mm]">
                                                <span className="bg-white/10 px-[1.5mm] text-[0.7rem]">WS</span>
                                                <span className="bg-white/10 px-[1.5mm] text-[0.7rem]">Polling</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <span className="text-neutral-500 text-[0.7rem] block mb-[1mm]">SOCKET EVENTS</span>
                                        <div className="border border-white/20 text-[0.8rem] font-mono">
                                            <div className="grid grid-cols-3 bg-white/10 p-[1.5mm] font-bold border-b border-white/20">
                                                <span>EVENT</span><span>PAYLOAD</span><span>DESC</span>
                                            </div>
                                            <div className="grid grid-cols-3 p-[1.5mm] border-b border-white/10">
                                                <span className="text-yellow-400">draw_batch</span><span className="text-neutral-400">Array&lt;Stroke&gt;</span><span>Delta Sync</span>
                                            </div>
                                            <div className="grid grid-cols-3 p-[1.5mm] border-b border-white/10">
                                                <span className="text-yellow-400">update_item</span><span className="text-neutral-400">&#123;id, pos&#125;</span><span>Transform</span>
                                            </div>
                                            <div className="grid grid-cols-3 p-[1.5mm] border-b border-white/10">
                                                <span className="text-yellow-400">cursor</span><span className="text-neutral-400">&#123;id, x, y&#125;</span><span>Presence</span>
                                            </div>
                                            <div className="grid grid-cols-3 p-[1.5mm]">
                                                <span className="text-yellow-400">stroke_end</span><span className="text-neutral-400">&#123;id&#125;</span><span>Commit</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* =========================================================================
                                03. LLM ORCHESTRATION (NOVA PRO)
                               ========================================================================= */}
                            <section className="bg-neutral-900/40 border border-white/20 p-[6mm] flex flex-col">
                                <div className="flex justify-between items-start mb-[3mm]">
                                    <h3 className="text-[2.5rem] font-bold leading-none">LLM 오케스트레이션</h3>
                                    <span className="font-mono text-[1.8rem] text-white/20 font-bold">03</span>
                                </div>
                                <div className="h-[0.5mm] w-full bg-white/30 mb-[4mm]"></div>

                                <div className="flex-1 flex flex-col gap-[4mm] text-[0.85rem]">
                                    <div className="bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/30 p-[4mm]">
                                        <span className="text-purple-300 text-[0.7rem] font-mono block mb-[1mm]">AWS BEDROCK MODEL_ID</span>
                                        <p className="text-[1.2rem] font-bold font-mono text-white">apac.amazon.nova-pro-v1:0</p>
                                        <p className="text-[0.8rem] text-neutral-400 mt-[1mm]">Region: ap-northeast-2 (Seoul)</p>
                                    </div>

                                    <div className="bg-[#0a0a0a] border border-white/10 p-[3mm]">
                                        <span className="text-neutral-500 text-[0.7rem] font-mono block mb-[2mm]">INFERENCE CONFIG</span>
                                        <div className="grid grid-cols-2 gap-y-[2mm] text-[0.9rem] font-mono">
                                            <div><span className="text-neutral-500">maxTokens:</span> <span className="text-green-400">8192</span></div>
                                            <div><span className="text-neutral-500">temperature:</span> <span className="text-green-400">0.2</span></div>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex items-center gap-[3mm] mb-[1mm]">
                                            <div className="w-[2mm] h-[2mm] bg-green-500 rounded-full"></div>
                                            <span className="font-bold text-[1rem]">구조화된 회의록 생성</span>
                                        </div>
                                        <p className="text-[0.9rem] text-neutral-300 font-light">
                                            의사결정(Decision), 액션 아이템(Action Item),<br />사실 검증(Fact Check) 포함 JSON 자동 생성
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* =========================================================================
                                04. TTS (POLLY + XTTS)
                               ========================================================================= */}
                            <section className="bg-neutral-900/40 border border-white/20 p-[6mm] flex flex-col">
                                <div className="flex justify-between items-start mb-[3mm]">
                                    <h3 className="text-[2.5rem] font-bold leading-none">음성 합성 (TTS)</h3>
                                    <span className="font-mono text-[1.8rem] text-white/20 font-bold">04</span>
                                </div>
                                <div className="h-[0.5mm] w-full bg-white/30 mb-[4mm]"></div>

                                <div className="flex-1 flex flex-col gap-[4mm] text-[0.85rem]">

                                    {/* Two Modes Table */}
                                    <div className="border border-white/10">
                                        <div className="grid grid-cols-3 bg-white/10 p-[1.5mm] font-mono font-bold text-[0.7rem] border-b border-white/10">
                                            <span>MODE</span><span>METHOD</span><span>BENEFIT</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1.5mm] font-mono text-[0.7rem] border-b border-white/5">
                                            <span className="text-green-400">Cached</span><span className="text-neutral-400">S3 → Presigned URL</span><span>대용량 재사용</span>
                                        </div>
                                        <div className="grid grid-cols-3 p-[1.5mm] font-mono text-[0.7rem]">
                                            <span className="text-blue-400">Realtime</span><span className="text-neutral-400">Base64 직접 전송</span><span className="text-green-400">~300ms 단축</span>
                                        </div>
                                    </div>

                                    {/* Voice Dubbing */}
                                    <div className="bg-[#0a0a0a] border border-cyan-500/20 p-[3mm]">
                                        <span className="text-cyan-400 font-mono text-[0.7rem] block mb-[1mm]">// VOICE DUBBING (AI Server)</span>
                                        <p className="font-mono text-[0.8rem] text-white">XTTS v2 (사용자 음성 임베딩)</p>
                                        <p className="font-mono text-[0.7rem] text-yellow-400 mt-[1mm]">※ 일본어: 품질 이슈로 AWS Polly 사용</p>
                                    </div>

                                    {/* Voice Matrix */}
                                    <div className="mt-auto">
                                        <span className="text-neutral-500 text-[0.7rem] font-mono block mb-[1mm]">POLLY NEURAL VOICE MATRIX</span>
                                        <div className="grid grid-cols-2 gap-[1.5px] bg-white/20 border border-white/20">
                                            <div className="bg-neutral-900 p-[2mm] flex justify-between items-center">
                                                <span className="font-mono text-[0.9rem]">ko-KR</span>
                                                <span className="font-bold text-green-400">Seoyeon</span>
                                            </div>
                                            <div className="bg-neutral-900 p-[2mm] flex justify-between items-center">
                                                <span className="font-mono text-[0.9rem]">en-US</span>
                                                <span className="font-bold text-green-400">Joanna</span>
                                            </div>
                                            <div className="bg-neutral-900 p-[2mm] flex justify-between items-center">
                                                <span className="font-mono text-[0.9rem]">ja-JP</span>
                                                <span className="font-bold text-green-400">Takumi</span>
                                            </div>
                                            <div className="bg-neutral-900 p-[2mm] flex justify-between items-center">
                                                <span className="font-mono text-[0.9rem]">zh-CN</span>
                                                <span className="font-bold text-green-400">Zhiyu</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* =============== FOOTER =============== */}
                        <footer className="mt-[12mm] border-t-[2px] border-white pt-[6mm] flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="font-mono text-[1.3rem] font-bold mb-[1mm]">EUM PROJECT</span>
                                <div className="flex gap-[3mm] text-[0.9rem] text-neutral-400 font-mono">
                                    <span>정보건</span><span>/</span><span>김가람</span><span>/</span><span>위도훈</span><span>/</span><span>성민혁</span><span>/</span><span>김권희</span>
                                </div>
                            </div>
                            <div className="flex gap-[8mm] items-end">
                                <div className="text-right">
                                    <div className="w-[35mm] h-[8mm] bg-white mt-[2mm]">
                                        <div className="h-full w-full flex gap-[1.5px] px-[1.5mm] items-center justify-center overflow-hidden">
                                            {[...Array(30)].map((_, i) => (<div key={i} className="bg-black h-[80%]" style={{ width: Math.random() * 3 + 'px' }}></div>))}
                                        </div>
                                    </div>
                                    <p className="font-mono text-[0.75rem] mt-[1mm] text-neutral-500">000-EUM-2025-ARCH</p>
                                </div>
                            </div>
                        </footer>

                    </div>
                </main>
            </div>

            {/* FAB */}
            <div className="fixed bottom-8 right-8 flex gap-4 print:hidden z-50">
                <button onClick={() => window.print()} className="flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-bold shadow-lg hover:bg-neutral-200 transition-transform hover:scale-105 active:scale-95">
                    <Printer size={24} />
                    <span>Download Blueprint (A1)</span>
                </button>
            </div>
        </div>
    );
}
