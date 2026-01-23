"use client";

import React, { useRef, useState } from "react";
// import { PosterDownloadButtons } from "./_components/PosterDownloadButtons";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Poster3Page() {
    const posterRef = useRef<HTMLElement>(null);
    const [currentPoster, setCurrentPoster] = useState<1 | 2>(1);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
            {/* 다운로드 버튼 (포스터 외부) */}
            {/* <div className="fixed top-4 right-4 z-50">
                <PosterDownloadButtons
                    targetRef={posterRef}
                    filename={`EUM_Poster_${currentPoster}`}
                />
            </div> */}

            {/* 포스터 전환 버튼 */}
            <button
                onClick={() => setCurrentPoster(1)}
                disabled={currentPoster === 1}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-black/80 hover:bg-black text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                onClick={() => setCurrentPoster(2)}
                disabled={currentPoster === 2}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-black/80 hover:bg-black text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
                <ChevronRight size={24} />
            </button>

            {/* 포스터 번호 표시 */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                <button
                    onClick={() => setCurrentPoster(1)}
                    className={`w-3 h-3 rounded-full transition-all ${currentPoster === 1 ? 'bg-black' : 'bg-black/30'}`}
                />
                <button
                    onClick={() => setCurrentPoster(2)}
                    className={`w-3 h-3 rounded-full transition-all ${currentPoster === 2 ? 'bg-black' : 'bg-black/30'}`}
                />
            </div>

            {/* A1 비율 (1:1.414) 세로 */}
            <main
                ref={posterRef}
                className="bg-black text-white h-[90vh] max-h-[900px]"
                style={{ aspectRatio: "1 / 1.414" }}
            >
                {currentPoster === 1 ? <Poster1Content /> : <Poster2Content />}
            </main>
        </div>
    );
}

// 포스터 2: 시행착오와 기술적 도전
function Poster2Content() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Content - 100% */}
            <div className="h-full grid grid-cols-2 gap-px bg-white/10 overflow-hidden">

                {/* 왼쪽: 암호화 (AES) */}
                <div className="bg-black p-3 md:p-4 flex flex-col overflow-hidden">
                    <div className="text-[11px] text-rose-400/80 font-semibold tracking-wider mb-0.5">기술적 챌린지 1</div>
                    <h2 className="text-lg md:text-xl font-bold mb-0.5">종단간 암호화</h2>
                    <p className="text-[10px] text-rose-400 mb-2">비즈니스 화상회의, 보안은 선택이 아닌 필수</p>

                    <div className="flex-1 flex flex-col space-y-2">
                        {/* 비즈니스 보안 강조 */}
                        <div className="bg-gradient-to-br from-rose-600/20 via-red-900/20 to-rose-950/30 border border-rose-500/40 rounded-lg p-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl"></div>
                            <p className="text-rose-200 font-bold text-[10px] tracking-wide mb-1">기업 화상회의 = 기밀 정보의 허브</p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
                                <div className="flex items-center gap-1">
                                    <span className="text-rose-400">•</span>
                                    <span className="text-white/70">M&A, 투자, 전략 회의</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-rose-400">•</span>
                                    <span className="text-white/70">인사/연봉 관련 논의</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-rose-400">•</span>
                                    <span className="text-white/70">계약/법률 검토</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-rose-400">•</span>
                                    <span className="text-white/70">제품 로드맵, 기술 정보</span>
                                </div>
                            </div>
                            <p className="text-[8px] text-rose-300/80 mt-1.5 font-medium">→ 유출 시 기업 경쟁력에 치명적 타격</p>
                        </div>

                        {/* 왜 암호화가 필요한가? */}
                        <div className="bg-gradient-to-r from-rose-950/30 to-transparent border-l-2 border-rose-500/50 pl-2 py-1">
                            <p className="text-rose-300 font-semibold text-[10px] mb-1">서버가 해킹당하면?</p>
                            <div className="text-[9px] text-white/60 space-y-0.5">
                                <p>화상회의 데이터는 서버를 거쳐 전달됩니다.</p>
                                <p className="text-rose-400 font-medium">암호화 없이는 → 모든 내용이 평문으로 노출</p>
                                <p className="text-white/40">EUM은 <span className="text-rose-300">저장 데이터까지 완전 암호화</span>합니다.</p>
                            </div>
                        </div>

                        {/* 암호화 흐름 다이어그램 */}
                        <div className="bg-gradient-to-br from-rose-950/30 via-red-950/20 to-rose-900/10 border border-rose-500/20 rounded-lg p-2 relative overflow-hidden">
                            <div className="text-[9px] text-rose-300 font-semibold tracking-wide mb-1.5">DATA ENCRYPTION FLOW</div>
                            <div className="flex items-center justify-between text-[8px] font-mono">
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-12 h-8 bg-white/5 border border-white/20 rounded flex items-center justify-center text-white/70 text-[9px]">평문</div>
                                    <div className="text-white/30 text-[7px]">원본</div>
                                </div>
                                <div className="text-rose-400/60 text-[10px]">→</div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-14 h-8 bg-gradient-to-br from-rose-600/30 to-red-600/30 border border-rose-400/50 rounded flex items-center justify-center shadow-[0_0_12px_rgba(251,113,133,0.2)]">
                                        <div className="text-rose-200 font-bold text-[8px]">AES-GCM</div>
                                    </div>
                                    <div className="text-rose-300/50 text-[7px]">암호화</div>
                                </div>
                                <div className="text-rose-400/60 text-[10px]">→</div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-14 h-8 bg-rose-950/40 border border-rose-500/30 rounded flex items-center justify-center text-rose-200/80 text-[8px] font-mono">v1:****</div>
                                    <div className="text-white/30 text-[7px]">암호문</div>
                                </div>
                                <div className="text-rose-400/60 text-[10px]">→</div>
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-10 h-8 bg-rose-900/30 border border-rose-500/40 rounded flex items-center justify-center text-rose-300 text-[9px] font-bold">DB</div>
                                    <div className="text-white/30 text-[7px]">저장</div>
                                </div>
                            </div>
                            <div className="mt-1.5 text-[8px] text-white/40 text-center">
                                서버 DB에는 암호화된 데이터만 저장 → 해킹당해도 내용 해독 불가
                            </div>
                        </div>

                        {/* 왜 하필 AES인가? */}
                        <div className="bg-gradient-to-br from-rose-900/15 to-rose-800/5 border border-rose-500/15 rounded-lg p-2">
                            <p className="text-rose-300 font-semibold text-[10px] mb-1.5">왜 하필 AES-256-GCM인가?</p>
                            <div className="space-y-1.5 text-[9px]">
                                {/* 비교 테이블 */}
                                <div className="grid grid-cols-3 gap-1 text-[8px]">
                                    <div className="bg-white/5 rounded p-1 text-center">
                                        <div className="text-white/40 line-through">DES</div>
                                        <div className="text-red-400/70 text-[7px]">56bit, 취약</div>
                                    </div>
                                    <div className="bg-white/5 rounded p-1 text-center">
                                        <div className="text-white/40 line-through">RSA</div>
                                        <div className="text-yellow-400/70 text-[7px]">느림, 대용량 X</div>
                                    </div>
                                    <div className="bg-rose-500/20 rounded p-1 text-center border border-rose-400/30">
                                        <div className="text-rose-300 font-bold">AES-256</div>
                                        <div className="text-emerald-400/80 text-[7px]">표준, 빠름, 안전</div>
                                    </div>
                                </div>
                                {/* AES 선택 이유 */}
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                    <div className="flex items-start gap-1">
                                        <span className="text-emerald-400 mt-0.5">✓</span>
                                        <span className="text-white/60"><span className="text-rose-300">2^256</span> 조합 = 해독 불가능</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="text-emerald-400 mt-0.5">✓</span>
                                        <span className="text-white/60"><span className="text-rose-300">AES-NI</span> CPU 하드웨어 가속</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="text-emerald-400 mt-0.5">✓</span>
                                        <span className="text-white/60"><span className="text-rose-300">GCM</span> 암호화+무결성 동시 보장</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="text-emerald-400 mt-0.5">✓</span>
                                        <span className="text-white/60">미국 정부/은행/군사 표준</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 핵심 보안 기능 3가지 */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="bg-rose-950/20 border border-rose-500/10 rounded p-1.5 text-center">
                                <div className="text-rose-400 font-bold text-[11px]">IV</div>
                                <div className="text-[8px] text-white/50 mt-0.5">매번 다른 열쇠</div>
                                <div className="text-[7px] text-white/30">12바이트 난수</div>
                            </div>
                            <div className="bg-rose-950/20 border border-rose-500/10 rounded p-1.5 text-center">
                                <div className="text-rose-400 font-bold text-[11px]">Auth Tag</div>
                                <div className="text-[8px] text-white/50 mt-0.5">위변조 감지</div>
                                <div className="text-[7px] text-white/30">16바이트 검증</div>
                            </div>
                            <div className="bg-rose-950/20 border border-rose-500/10 rounded p-1.5 text-center">
                                <div className="text-rose-400 font-bold text-[11px]">scrypt</div>
                                <div className="text-[8px] text-white/50 mt-0.5">키 파생 함수</div>
                                <div className="text-[7px] text-white/30">무차별 대입 방지</div>
                            </div>
                        </div>

                        {/* 암호화 대상 데이터 */}
                        <div className="bg-gradient-to-r from-red-950/20 to-transparent border border-red-500/10 rounded-lg p-2">
                            <p className="text-red-300 font-semibold text-[10px] mb-1">무엇이 암호화되나요?</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">채팅 메시지 내용</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">실시간 번역 자막</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">회의 전사 (STT 결과)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">AI 요약 및 액션아이템</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">화이트보드 데이터</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                    <span className="text-white/60">다국어 번역 JSON</span>
                                </div>
                            </div>
                        </div>

                        {/* 구현 방식 */}
                        <div className="bg-gradient-to-br from-rose-900/10 to-rose-800/5 border border-rose-500/10 rounded-lg p-2">
                            <p className="text-rose-300 font-semibold text-[10px] mb-1">어떻게 구현했나요?</p>
                            <div className="space-y-1 text-[9px]">
                                <div className="flex items-start gap-2">
                                    <span className="text-rose-400 font-mono text-[8px] bg-rose-500/10 px-1 rounded">01</span>
                                    <div>
                                        <span className="text-rose-300">TypeORM Transformer</span>
                                        <span className="text-white/50"> 사용</span>
                                        <p className="text-[8px] text-white/40">DB 저장 시 자동 암호화, 조회 시 자동 복호화</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-rose-400 font-mono text-[8px] bg-rose-500/10 px-1 rounded">02</span>
                                    <div>
                                        <span className="text-rose-300">버전 관리 형식</span>
                                        <span className="text-white/40 font-mono text-[8px]"> v1:Base64(IV+암호문+Tag)</span>
                                        <p className="text-[8px] text-white/40">향후 키 로테이션 지원 가능</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-rose-400 font-mono text-[8px] bg-rose-500/10 px-1 rounded">03</span>
                                    <div>
                                        <span className="text-rose-300">환경변수 기반 키 관리</span>
                                        <p className="text-[8px] text-white/40">ENCRYPTION_KEY로 마스터 키 설정, scrypt로 파생</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 결과: 사용자 체감 */}
                        <div className="bg-gradient-to-r from-rose-950/30 to-red-950/20 border border-rose-500/20 rounded-lg p-2">
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                <div className="bg-rose-900/20 rounded p-1.5 border border-rose-500/10">
                                    <div className="text-[11px] font-bold text-rose-300">&lt;1ms</div>
                                    <div className="text-[7px] text-white/40">체감 지연</div>
                                </div>
                                <div className="bg-rose-900/20 rounded p-1.5 border border-rose-500/10">
                                    <div className="text-[11px] font-bold text-rose-300">AUTO</div>
                                    <div className="text-[7px] text-white/40">자동 적용</div>
                                </div>
                                <div className="bg-rose-900/20 rounded p-1.5 border border-rose-500/10">
                                    <div className="text-[11px] font-bold text-rose-300">256-bit</div>
                                    <div className="text-[7px] text-white/40">키 강도</div>
                                </div>
                                <div className="bg-rose-900/20 rounded p-1.5 border border-rose-500/10">
                                    <div className="text-[11px] font-bold text-rose-300">100%</div>
                                    <div className="text-[7px] text-white/40">데이터 보호</div>
                                </div>
                            </div>
                            <div className="mt-1.5 text-[8px] text-center text-white/50">
                                서버가 해킹당해도 암호화된 데이터는 <span className="text-rose-300">해독 불가능</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 3등분 그리드 (높이 고정) */}
                <div className="bg-black grid gap-px overflow-hidden" style={{ gridTemplateRows: '40% 30% 30%' }}>

                    {/* 상단 33%: 실시간 연결 안정성 */}
                    <div className="bg-black p-3 flex flex-col overflow-hidden">
                        <div className="text-[11px] text-blue-400/80 font-semibold tracking-wider mb-0.5">기술적 챌린지 2</div>
                        <h2 className="text-base font-bold mb-0.5">실시간 연결 안정성</h2>
                        <p className="text-[10px] text-blue-400 mb-2">부하 테스트에서 발견한 예상 밖의 원인</p>

                        <div className="flex-1 grid grid-cols-2 gap-3">
                            {/* 왼쪽: 다이어그램 */}
                            <div className="flex flex-col justify-between">
                                {/* 문제 발견 흐름 */}
                                <div className="bg-gradient-to-br from-red-950/30 to-red-900/20 border border-red-500/20 rounded-lg p-2">
                                    <div className="text-[8px] text-red-300 font-semibold mb-1.5">PROBLEM DISCOVERY</div>
                                    <div className="flex items-center justify-between text-[8px]">
                                        <div className="text-center">
                                            <div className="text-blue-200 font-bold">20+</div>
                                            <div className="text-white/40 text-[7px]">동시접속</div>
                                        </div>
                                        <span className="text-white/30">→</span>
                                        <div className="text-center">
                                            <div className="text-yellow-300">30초</div>
                                            <div className="text-white/40 text-[7px]">경과</div>
                                        </div>
                                        <span className="text-white/30">→</span>
                                        <div className="text-center">
                                            <div className="text-red-400 font-bold text-sm">38%</div>
                                            <div className="text-red-400/60 text-[7px]">끊김</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 시행착오 */}
                                <div className="bg-gradient-to-r from-yellow-950/30 to-yellow-900/20 border border-yellow-500/20 rounded-lg p-2">
                                    <div className="text-[8px] text-yellow-300 font-semibold mb-1">FIRST ATTEMPT</div>
                                    <div className="flex items-center justify-between text-[8px]">
                                        <div className="text-white/60">서버 증설</div>
                                        <span className="text-white/30">→</span>
                                        <div className="text-red-400">실패</div>
                                    </div>
                                </div>

                                {/* 실제 원인 */}
                                <div className="bg-gradient-to-r from-blue-950/30 to-blue-900/20 border border-blue-500/20 rounded-lg p-2">
                                    <div className="text-[8px] text-blue-300 font-semibold mb-1">ROOT CAUSE</div>
                                    <div className="text-[8px] text-white/60 text-center">
                                        <span className="text-blue-300 font-semibold">Socket.io 타임아웃</span> 설정 문제
                                    </div>
                                </div>

                                {/* 해결 결과 */}
                                <div className="bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 border border-emerald-500/30 rounded-lg p-2">
                                    <div className="text-[8px] text-emerald-300 font-semibold mb-1">RESULT</div>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-red-400 font-bold line-through">38%</span>
                                        <span className="text-white/30">→</span>
                                        <span className="text-emerald-400 font-bold text-lg">0.2%</span>
                                    </div>
                                </div>
                            </div>

                            {/* 오른쪽: 설명 문장 */}
                            <div className="flex flex-col justify-between text-[9px] text-white/70 leading-relaxed">
                                <div>
                                    <p className="text-red-300 font-semibold text-[10px] mb-1">문제 발견</p>
                                    <p>부하 테스트를 돌려보니, 동시 접속자가 <span className="text-red-400 font-bold">20명만 넘어도</span> 연결의 <span className="text-red-400 font-bold">38%</span>가 30초 내에 끊어졌습니다.</p>
                                </div>

                                <div>
                                    <p className="text-yellow-300 font-semibold text-[10px] mb-1">잘못된 추측</p>
                                    <p>처음에는 단순히 서버 스펙 문제인 줄 알고 <span className="text-yellow-300">증설을 시도</span>했지만, 문제는 해결되지 않았습니다.</p>
                                </div>

                                <div>
                                    <p className="text-blue-300 font-semibold text-[10px] mb-1">실제 원인</p>
                                    <p>원인은 서버가 아니라 <span className="text-blue-300 font-semibold">Socket.io의 타임아웃 설정</span>에 있었습니다. 기본값이 너무 짧게 설정되어 있었던 것입니다.</p>
                                </div>

                                <div>
                                    <p className="text-emerald-300 font-semibold text-[10px] mb-1">해결</p>
                                    <p>타임아웃과 재연결 로직을 최적화한 결과, 비정상 종료율을 <span className="text-emerald-400 font-bold">0.2%</span>까지 낮출 수 있었습니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 중간 30%: 화이트보드 드로잉 품질 */}
                    <div className="bg-black p-3 flex flex-col border-t border-white/10 overflow-hidden">
                        <div className="text-[11px] text-purple-400/80 font-semibold tracking-wider mb-0.5">기술적 챌린지 3</div>
                        <h2 className="text-base font-bold mb-0.5">화이트보드 드로잉 품질</h2>
                        <p className="text-[10px] text-purple-400 mb-2">손떨림은 잡고, 데이터는 압축하고</p>

                        <div className="flex-1 grid grid-cols-2 gap-3">
                            {/* 왼쪽: 다이어그램 */}
                            <div className="flex flex-col justify-between">
                                {/* 문제 */}
                                <div className="bg-gradient-to-br from-red-950/30 to-red-900/20 border border-red-500/20 rounded-lg p-2">
                                    <div className="text-[8px] text-red-300 font-semibold mb-1">PROBLEM</div>
                                    <div className="flex items-center justify-between text-[8px]">
                                        <div className="text-center">
                                            <div className="text-red-400">손떨림</div>
                                            <div className="text-white/40 text-[7px]">그대로 반영</div>
                                        </div>
                                        <span className="text-white/30">+</span>
                                        <div className="text-center">
                                            <div className="text-red-400">데이터 과다</div>
                                            <div className="text-white/40 text-[7px]">동기화 느림</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 해결 알고리즘 조합 */}
                                <div className="bg-gradient-to-r from-purple-950/40 to-purple-900/20 border border-purple-500/20 rounded-lg p-2">
                                    <div className="text-[8px] text-purple-300 font-semibold mb-1">SOLUTION</div>
                                    <div className="space-y-1 text-[8px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 font-mono">1</span>
                                            <span className="text-purple-200">1 Euro Filter</span>
                                            <span className="text-white/40">떨림 제거</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 font-mono">2</span>
                                            <span className="text-purple-200">Bezier Curve</span>
                                            <span className="text-white/40">부드러운 곡선</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 font-mono">3</span>
                                            <span className="text-purple-200">Douglas-Peucker</span>
                                            <span className="text-white/40">데이터 압축</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 오른쪽: 설명 문장 */}
                            <div className="flex flex-col justify-between text-[9px] text-white/70 leading-relaxed">
                                <div>
                                    <p className="text-red-300 font-semibold text-[10px] mb-1">문제 발견</p>
                                    <p>초기 버전에서는 <span className="text-red-400 font-semibold">손떨림이 그대로 반영</span>되고, 모든 좌표를 전송하니 <span className="text-red-400 font-semibold">동기화가 느려지는</span> 문제가 있었습니다.</p>
                                </div>

                                <div>
                                    <p className="text-purple-300 font-semibold text-[10px] mb-1">해결 과정</p>
                                    <p>여러 보정 알고리즘을 테스트한 끝에, <span className="text-purple-300 font-semibold">1 Euro Filter + Bezier + Douglas-Peucker</span> 조합으로 떨림은 잡으면서 데이터는 압축하는 방식을 찾았습니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 하단 30%: 아키텍처 */}
                    <div className="bg-black p-2 flex flex-col border-t border-white/10 overflow-hidden">
                        <div className="text-[10px] text-orange-400/80 font-semibold tracking-wider">아키텍처</div>
                        <div className="flex-1 flex items-center justify-center p-1">
                            <img src="/ppt/arc.png" alt="Architecture" className="h-full w-full object-contain" />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// 포스터 1: 기존 내용
function Poster1Content() {
    return (
                <div className="h-full flex flex-col">

                    {/* Header - 8% */}
                    <header className="h-[8%] flex items-center justify-between px-6 md:px-8 border-b border-white/10 bg-gradient-to-r from-black via-zinc-900 to-black" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        {/* Left: Brand Identity */}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                                EUM
                            </h1>
                            <div className="flex items-center gap-2">
                                <div style={{ width: '32px', height: '2px', backgroundColor: '#3b82f6' }}></div>
                                <span style={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em' }}>AI 실시간 화상회의 플랫폼</span>
                            </div>
                        </div>

                        {/* Right: Team Roster (Borderless Clean) */}
                        <div className="flex items-center gap-2 h-full mr-2">
                            {[
                                { name: "위도훈", role: "Backend", img: "/ppt/backend-1.png" },
                                { name: "김가람", role: "Frontend", img: "/ppt/frontend-2.png" },
                                { name: "정보건", role: "AI / CD", img: "/ppt/leader.png", highlight: true },
                                { name: "성민혁", role: "Frontend", img: "/ppt/frontend-1.png" },
                                { name: "김권희", role: "Backend", img: "/ppt/backend-2.png" },
                            ].map((member, i) => (
                                <div key={i} className="flex flex-col items-center justify-center group cursor-default">
                                    {/* Avatar - No Border, Soft Rounding */}
                                    <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 translate-y-1">
                                        <img
                                            src={member.img}
                                            alt={member.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                            style={{ objectPosition: 'center 20%' }}
                                        />
                                    </div>

                                    {/* Name & Role */}
                                    <div className="flex flex-col items-center mt-0.3 z-10">
                                        <span className={`text-[9px] md:text-[10px] font-bold leading-none mb-0.5 text-blue-100`}>
                                            {member.name}
                                        </span>
                                        <span className="text-[6px] md:text-[7px] font-medium text-white/40 uppercase tracking-tight">
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
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
                                    <div className="bg-gradient-to-r from-orange-900/10 to-orange-800/5 border border-orange-500/10 rounded p-2">
                                        <p className="text-orange-200 font-medium text-[10px] mb-1">초저지연 동기화</p>
                                        <div className="space-y-0.5 text-[10px] text-white/60">
                                            <p><span className="text-orange-300">WebSocket</span>: 0.1초 내 전달</p>
                                            <p><span className="text-orange-300">커서 공유</span>: 실시간 위치 추적</p>
                                            <p><span className="text-orange-300">자동 저장</span>: Redis + DB 이중화</p>
                                        </div>
                                    </div>

                                    {/* Infinite Canvas */}
                                    <div className="bg-gradient-to-r from-orange-800/5 to-orange-900/10 border border-orange-500/10 rounded p-2">
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
