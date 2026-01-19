"use client";

import React, { useRef } from "react";
import { PosterDownloadButtons } from "./_components/PosterDownloadButtons";

export default function Poster3Page() {
    const posterRef = useRef<HTMLElement>(null);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
            {/* 다운로드 버튼 (포스터 외부) */}
            <div className="fixed top-4 right-4 z-50">
                <PosterDownloadButtons
                    targetRef={posterRef}
                    filename="EUM_Poster_A1"
                />
            </div>

            {/* A1 비율 (1:1.414) 세로 */}
            <main
                ref={posterRef}
                className="bg-black text-white h-[90vh] max-h-[900px]"
                style={{ aspectRatio: "1 / 1.414" }}
            >
                <div className="h-full flex flex-col">

                    {/* Header - 8% */}
                    <header className="h-[8%] flex items-center justify-between px-6 md:px-8 border-b border-white/10 bg-gradient-to-r from-black via-zinc-900 to-black">
                        {/* Left: Brand Identity */}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                                EUM
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="h-px w-8 bg-blue-500/50"></span>
                                <p className="text-white/60 text-[10px] tracking-[0.2em] uppercase font-light">Global Conference Platform</p>
                            </div>
                        </div>

                        {/* Right: Team & Info */}
                        <div className="flex flex-col items-end justify-center text-right">
                            <div className="flex items-center gap-2 text-[10px] text-white/50 font-light tracking-wide">
                                <span>정보건</span>
                                <span className="text-white/10">|</span>
                                <span>김가람</span>
                                <span className="text-white/10">|</span>
                                <span>위도훈</span>
                                <span className="text-white/10">|</span>
                                <span>성민혁</span>
                                <span className="text-white/10">|</span>
                                <span>김권희</span>
                            </div>
                        </div>
                    </header>

                    {/* Features - 92% */}
                    <div className="h-[92%] grid grid-cols-2 grid-rows-2 gap-px bg-white/10">

                        {/* Feature 1: AI Translation */}
                        <div className="bg-black p-3 md:p-4 flex flex-col">
                            {/* Header: 70% Title + 30% Metrics */}
                            <div className="flex items-start justify-between mb-0.5">
                                <div className="w-[70%]">
                                    <div className="text-[10px] text-white/30 tracking-widest mb-0.5">01</div>
                                    <h2 className="text-lg md:text-xl font-bold mb-0.5">AI 자동 번역</h2>
                                    <p className="text-xs text-blue-400">같은 회의, 각자의 언어로</p>
                                </div>
                                <div className="w-[30%] flex flex-col items-end gap-2 text-[10px] text-right">
                                    <div>
                                        <div className="text-white font-bold">0.7~1.2초</div>
                                        <div className="text-white/40">Latency</div>
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">4개</div>
                                        <div className="text-white/40">Languages</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative flex flex-col">
                                {/* Diagram Container */}
                                <div className="h-[150px] w-full flex flex-col items-center justify-between text-[9px] font-mono mb-2">

                                    {/* Step 1: Input & STT */}
                                    <div className="w-full flex justify-center items-center gap-2 z-10">
                                        <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 px-3 py-1.5 rounded-full border border-blue-500/30 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <span className="text-blue-200 whitespace-nowrap">음성 입력</span>
                                        </div>
                                        <span className="text-blue-400/50">→</span>
                                        <div className="bg-gradient-to-r from-blue-600/30 to-blue-500/30 px-3 py-1.5 rounded border border-blue-400/50 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.3)] whitespace-nowrap">
                                            STT 변환
                                        </div>
                                    </div>

                                    {/* Arrow Down */}
                                    <div className="flex flex-col items-center text-blue-400/50">
                                        <div className="w-px h-2 bg-gradient-to-b from-blue-400/50 to-blue-500/50" />
                                        <span className="text-[8px]">▼</span>
                                    </div>

                                    {/* Step 2: Session Room (One to Many) */}
                                    <div className="w-[90%] bg-gradient-to-r from-blue-900/20 to-blue-800/10 border border-blue-500/20 rounded-lg p-1.5 flex flex-col items-center gap-1 z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-blue-200">Session Room</span>
                                            <span className="text-[8px] bg-blue-500/20 px-1 rounded text-blue-300 border border-blue-400/30">Broadcast</span>
                                        </div>
                                    </div>

                                    {/* Arrows Split */}
                                    <div className="h-3 w-full flex justify-center relative">
                                        <div className="absolute top-0 w-px h-full bg-blue-400/20" />
                                        <div className="absolute top-1/2 w-[60%] h-px bg-blue-400/20" />
                                        <div className="absolute top-1/2 left-[20%] w-px h-1/2 bg-blue-400/20" />
                                        <div className="absolute top-1/2 right-[20%] w-px h-1/2 bg-blue-400/20" />
                                    </div>

                                    {/* Step 3: Translation Logic */}
                                    <div className="w-full flex justify-between px-4 z-10">
                                        {/* Path A */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded text-blue-200 whitespace-nowrap">
                                                EN 번역
                                            </div>
                                            <div className="h-1.5 w-px bg-blue-400/30" />
                                            <div className="bg-blue-900/20 border border-blue-500/20 px-2 py-1 rounded text-blue-300 whitespace-nowrap">
                                                미국인
                                            </div>
                                        </div>

                                        {/* Path B */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded text-blue-200 whitespace-nowrap">
                                                JA 번역
                                            </div>
                                            <div className="h-1.5 w-px bg-blue-400/30" />
                                            <div className="bg-blue-900/20 border border-blue-500/20 px-2 py-1 rounded text-blue-300 whitespace-nowrap">
                                                일본인
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Balanced Details: 50% Easy + 50% Technical - Side by Side */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* How it works - Easy + Technical */}
                                    <div className="bg-gradient-to-r from-blue-900/10 to-blue-800/5 border border-blue-500/10 rounded p-2">
                                        <p className="text-blue-200 font-medium text-[10px] mb-1.5">실시간 번역 파이프라인</p>
                                        <div className="space-y-1 text-[10px] text-white/60">
                                            <p><span className="text-blue-300">STT</span>: 음성 → 텍스트 실시간 변환</p>
                                            <p><span className="text-blue-300">Broadcast</span>: Room 전체에 원본 공유</p>
                                            <p><span className="text-blue-300">Unicast</span>: 각 사용자 언어로 개별 전송</p>
                                            <p><span className="text-blue-300">WebSocket</span>: 양방향 스트리밍 통신</p>
                                        </div>
                                    </div>

                                    {/* Key Features - Technical + Easy */}
                                    <div className="bg-gradient-to-r from-blue-800/5 to-blue-900/10 border border-blue-500/10 rounded p-2">
                                        <p className="text-blue-200 font-medium text-[10px] mb-1.5">핵심 최적화</p>
                                        <div className="space-y-1 text-[10px] text-white/60">
                                            <p><span className="text-blue-300">Redis 캐싱</span>: 반복 문장 즉시 응답</p>
                                            <p><span className="text-blue-300">Context Window</span>: 맥락 기반 자연스러운 번역</p>
                                            <p><span className="text-blue-300">KO↔JA 구문 분할</span>: 어순 동일, 빠른 처리</p>
                                            <p><span className="text-blue-300">Lazy Translation</span>: 필요 시점에 번역 실행</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2: Voice Cloning TTS */}
                        <div className="bg-black p-3 md:p-4 flex flex-col">
                            <div className="text-[10px] text-white/30 tracking-widest mb-0.5">02</div>
                            <h2 className="text-lg md:text-xl font-bold mb-0.5">음성 복제 TTS</h2>
                            <p className="text-xs text-purple-400 mb-0.5">번역해도 그 사람 목소리 그대로</p>

                            <div className="flex-1 relative flex flex-col">
                                {/* Diagram Container: Parallel Pipelines (Centered) */}
                                <div className="h-[150px] w-full flex flex-col justify-center gap-3 text-[9px] font-mono mb-2 px-1">

                                    {/* Top Lane: Voice Registration */}
                                    <div className="w-full bg-gradient-to-r from-purple-900/20 to-purple-800/10 border border-purple-500/20 rounded-lg p-2.5 relative flex flex-col justify-center gap-1">
                                        <div className="absolute top-0 left-2 -translate-y-1/2 bg-black px-1 text-[8px] text-purple-300">음성 등록</div>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                <span className="text-purple-200">음성 샘플</span>
                                            </div>
                                            <span className="text-purple-400/50">→</span>
                                            <span className="text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-400/30">DeepFilter</span>
                                            <span className="text-purple-400/50">→</span>
                                            <div className="text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-400/30 whitespace-nowrap">
                                                S3 저장
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connection Arrow (Vertical) */}
                                    <div className="flex justify-center">
                                        <div className="flex flex-col items-center text-purple-400/50">
                                            <div className="w-px h-2 bg-gradient-to-b from-purple-400/50 to-purple-500/50" />
                                            <span className="text-[8px]">▼</span>
                                        </div>
                                    </div>

                                    {/* Bottom Lane: Synthesis */}
                                    <div className="w-full bg-gradient-to-r from-purple-800/10 to-purple-900/20 border border-purple-500/20 rounded-lg p-2.5 relative flex flex-col justify-center gap-1">
                                        <div className="absolute top-0 left-2 -translate-y-1/2 bg-black px-1 text-[8px] text-purple-300">실시간 합성</div>
                                        <div className="flex items-center justify-between w-full relative z-10">
                                            <span className="text-purple-200/70">번역 텍스트</span>
                                            <span className="text-purple-400/50">→</span>
                                            <span className="text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-400/30">MeloTTS</span>
                                            <span className="text-purple-400/50">→</span>
                                            <div className="bg-gradient-to-r from-purple-600/30 to-purple-500/30 border border-purple-400/50 px-2 py-0.5 rounded text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                                                ToneColor
                                            </div>
                                            <span className="text-purple-400/50">→</span>
                                            <span className="text-purple-200 font-bold">음성 출력</span>
                                        </div>
                                    </div>

                                </div>

                                {/* Balanced Details: 50% Easy + 50% Technical */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* How it works */}
                                    <div className="bg-gradient-to-r from-purple-900/10 to-purple-800/5 border border-purple-500/10 rounded p-2">
                                        <p className="text-purple-200 font-medium text-[10px] mb-1.5">음성 복제 파이프라인</p>
                                        <div className="space-y-1 text-[10px] text-white/60">
                                            <p><span className="text-purple-300">DeepFilterNet</span>: 잡음 제거 전처리</p>
                                            <p><span className="text-purple-300">MeloTTS</span>: 텍스트 → 기본 음성 생성</p>
                                            <p><span className="text-purple-300">ToneColorConverter</span>: 목소리 특성 입히기</p>
                                            <p><span className="text-purple-300">Zero-shot</span>: 샘플 하나로 복제 가능</p>
                                        </div>
                                    </div>

                                    {/* Key Optimizations */}
                                    <div className="bg-gradient-to-r from-purple-800/5 to-purple-900/10 border border-purple-500/10 rounded p-2">
                                        <p className="text-purple-200 font-medium text-[10px] mb-1.5">핵심 최적화</p>
                                        <div className="space-y-1 text-[10px] text-white/60">
                                            <p><span className="text-purple-300">GPU 가속</span>: CUDA 실시간 추론</p>
                                            <p><span className="text-purple-300">Lazy Loading</span>: 필요할 때만 모델 로드</p>
                                            <p><span className="text-purple-300">Embedding 캐시</span>: 목소리 특성 유지</p>
                                            <p><span className="text-purple-300">48kHz 출력</span>: 고품질 오디오 스트리밍</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3: AI Summary */}
                        <div className="bg-black p-5 md:p-6 flex flex-col">
                            <div className="text-[10px] text-white/30 tracking-widest mb-1">03</div>
                            <h2 className="text-lg md:text-xl font-bold mb-1">AI 자동 요약</h2>
                            <p className="text-xs text-emerald-400 mb-2">회의 끝나면, 할 일만 남는다</p>

                            <div className="flex-1 relative flex flex-col">
                                {/* Diagram Container */}
                                <div className="h-[80px] w-full flex flex-col justify-center gap-0.5 text-[9px] font-mono px-1">

                                    {/* Input Stage */}
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex flex-col gap-1">
                                            <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-500/30 px-2 py-1 rounded text-emerald-200 text-center whitespace-nowrap">음성 기록</div>
                                            <div className="bg-gradient-to-r from-emerald-800/20 to-emerald-900/30 border border-emerald-500/30 px-2 py-1 rounded text-emerald-200 text-center whitespace-nowrap">채팅 내역</div>
                                        </div>
                                        <div className="text-emerald-400/50">→</div>

                                        {/* Process Stage */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-[8px] text-emerald-300/50 mb-0.5">시간순 병합</div>
                                            <div className="bg-gradient-to-r from-emerald-600/30 to-emerald-500/30 border border-emerald-400/50 w-16 h-12 rounded flex items-center justify-center text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                                AI<br />요약 엔진
                                            </div>
                                        </div>

                                        <div className="text-emerald-400/50">→</div>

                                        {/* Output Stage */}
                                        <div className="flex flex-col gap-1 w-20">
                                            <div className="bg-emerald-900/20 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 flex justify-between">
                                                <span>요약</span>
                                                <span className="text-emerald-400/30">■</span>
                                            </div>
                                            <div className="bg-emerald-900/20 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 flex justify-between">
                                                <span>할일</span>
                                                <span className="text-emerald-400/30">□</span>
                                            </div>
                                            <div className="bg-emerald-900/20 border border-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 flex justify-between">
                                                <span>일정</span>
                                                <span className="text-emerald-400/30">@</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Restored & Simplified Details */}
                                <div className="space-y-1">
                                    {/* Data Integration */}
                                    <div className="bg-gradient-to-r from-emerald-900/10 to-emerald-800/5 border border-emerald-500/10 rounded p-2">
                                        <p className="text-emerald-200 font-medium text-[10px] mb-0.5">빈틈없는 기록</p>
                                        <div className="text-[10px] text-white/50 space-y-0.5">
                                            <p><span className="text-emerald-300">말한 내용</span>과 <span className="text-emerald-300">채팅</span>을 시간 순서대로 완벽하게 합쳐,</p>
                                            <p>누가 언제 무슨 말을 했는지 정확히 기록합니다.</p>
                                        </div>
                                    </div>

                                    {/* Smart Summary */}
                                    <div className="bg-gradient-to-r from-emerald-800/5 to-emerald-900/10 border border-emerald-500/10 rounded p-2">
                                        <p className="text-emerald-200 font-medium text-[10px] mb-0.5">똑똑한 비서</p>
                                        <div className="space-y-0.5 text-[10px] text-white/60">
                                            <p>• <span className="text-emerald-300">자동 요약</span>: 긴 회의도 3줄 요약으로 끝</p>
                                            <p>• <span className="text-emerald-300">Action Item</span>: "누가 뭘 할지" 자동 추출</p>
                                            <p>• <span className="text-emerald-300">일정 등록</span>: 캘린더에 알아서 저장까지</p>
                                        </div>
                                    </div>

                                    {/* Global Share */}
                                    <div className="bg-gradient-to-r from-emerald-900/10 to-emerald-800/5 border border-emerald-500/10 rounded p-2">
                                        <p className="text-emerald-200 font-medium text-[10px] mb-0.5">다국어 리포트</p>
                                        <div className="text-[10px] text-white/50 space-y-0.5">
                                            <p>정리된 회의록은 클릭 한 번으로 <span className="text-emerald-300">4개 국어</span>로</p>
                                            <p>즉시 번역되어 팀원들에게 공유됩니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom spacer */}
                            <div className="mt-auto pt-1" />
                        </div>

                        {/* Feature 4: Whiteboard */}
                        <div className="bg-black p-5 md:p-6 flex flex-col">
                            <div className="text-[10px] text-white/30 tracking-widest mb-1">04</div>
                            <h2 className="text-lg md:text-xl font-bold mb-1">협업 화이트보드</h2>
                            <p className="text-xs text-orange-400 mb-2">함께 그리고, 함께 정리하고</p>

                            <div className="flex-1 relative flex flex-col pt-2">
                                {/* Visual: Mini Whiteboard */}
                                <div className="h-[140px] w-full bg-zinc-900/50 border border-white/10 rounded-lg relative overflow-hidden mb-4 group">
                                    {/* Grid Background */}
                                    <div className="absolute inset-0 opacity-20"
                                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                                    </div>

                                    {/* Shape: Post-it */}
                                    <div className="absolute top-6 left-10 w-12 h-10 bg-orange-400/90 rounded shadow-lg transform rotate-[-3deg] flex items-center justify-center">
                                        <div className="w-8 h-0.5 bg-black/20 rounded-full" />
                                    </div>

                                    {/* Shape: Circle being drawn */}
                                    <div className="absolute bottom-6 right-12 w-12 h-12 border-2 border-pink-500/80 rounded-full opacity-80" />

                                    {/* Cursor 1 (User Me) */}
                                    <div className="absolute bottom-4 right-10 z-20">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500 transform rotate-[-15deg] drop-shadow-md">
                                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                                        </svg>
                                        <div className="ml-2 -mt-1 bg-pink-500 text-[6px] text-white px-1.5 py-0.5 rounded-sm shadow-sm">Me</div>
                                    </div>

                                    {/* Cursor 2 (User Tom) */}
                                    <div className="absolute top-8 left-20 z-20 transition-all duration-1000 ease-in-out">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500 drop-shadow-md">
                                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                                        </svg>
                                        <div className="ml-2 bg-blue-500 text-[6px] text-white px-1.5 py-0.5 rounded-sm shadow-sm">Tom</div>
                                    </div>

                                    {/* Toolbar (Left) */}
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 bg-zinc-800/90 p-1.5 rounded-md border border-white/10 backdrop-blur-md shadow-xl">
                                        <div className="w-2.5 h-2.5 rounded bg-white/20 hover:bg-white/40 transition-colors" />
                                        <div className="w-2.5 h-2.5 rounded bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                        <div className="w-2.5 h-2.5 rounded bg-white/20 hover:bg-white/40 transition-colors" />
                                        <div className="w-2.5 h-2.5 rounded bg-white/20 hover:bg-white/40 transition-colors" />
                                    </div>
                                </div>

                                {/* Technical Details - 50/50 Layout */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Real-time */}
                                    <div className="p-2">
                                        <p className="text-orange-200 font-medium text-[10px] mb-1">초저지연 동기화</p>
                                        <div className="space-y-0.5 text-[10px] text-white/60">
                                            <p><span className="text-orange-300">WebSocket</span>: 0.1초 내 전달</p>
                                            <p><span className="text-orange-300">커서 공유</span>: 실시간 위치 추적</p>
                                            <p><span className="text-orange-300">자동 저장</span>: Redis + DB 이중화</p>
                                        </div>
                                    </div>

                                    {/* Infinite Canvas */}
                                    <div className="p-2">
                                        <p className="text-orange-200 font-medium text-[10px] mb-1">무한 캔버스 & 도구</p>
                                        <div className="space-y-0.5 text-[10px] text-white/60">
                                            <p><span className="text-orange-300">PixiJS/WebGPU</span>: 고성능 렌더링</p>
                                            <p><span className="text-orange-300">다양한 도구</span>: 펜, 포스트잇, 도형</p>
                                            <p><span className="text-orange-300">Undo/Redo</span>: 작업 내역 관리</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom spacer */}
                            <div className="mt-auto pt-1" />
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}



function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-white font-bold">{value}</div>
            <div className="text-white/40">{label}</div>
        </div>
    );
}
