'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Inbox, FileText, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { meetingsApi } from '@/lib/api';
import type { MeetingSession } from '@/lib/types';

interface GlobalArchivesProps {
    onSessionClick?: (session: MeetingSession) => void;
}

export function GlobalArchives({ onSessionClick }: GlobalArchivesProps) {
    const [sessions, setSessions] = useState<MeetingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Fetch Archives using the centralized API
    const fetchArchives = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await meetingsApi.getMyArchives();
            const sessionsArray = Array.isArray(data) ? data : [];
            setSessions(sessionsArray);
            if (sessionsArray.length > 0) {
                setSelectedSessionId(sessionsArray[0].id);
            }
            console.log('[GlobalArchives] Fetched archives:', sessionsArray.length);
        } catch (err) {
            console.error('[GlobalArchives] Failed to fetch archives:', err);
            setError(err instanceof Error ? err.message : '회의록을 불러오는데 실패했습니다.');
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchArchives();
    }, [fetchArchives]);

    // Filter Logic
    const filteredSessions = sessions.filter(session =>
        session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.workspace?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-none md:rounded-l-3xl">
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-white/80 mb-4">{error}</p>
                    <button
                        onClick={fetchArchives}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex bg-black/40 backdrop-blur-xl rounded-none md:rounded-l-3xl overflow-hidden border-none md:border-l border-white/5">

            {/* 1. Sidebar List (Inbox Style) */}
            <div className="w-full md:w-[320px] xl:w-[400px] flex flex-col border-r border-white/5 bg-neutral-900/30">

                {/* Header & Search */}
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Inbox size={20} className="text-indigo-400" />
                            회의록 보관함
                        </h2>
                        <span className="text-xs font-mono text-neutral-500">{filteredSessions.length}개의 기록</span>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="회의 제목 또는 워크스페이스 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-black/80 transition-all placeholder:text-neutral-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="p-8 text-center text-neutral-600 text-sm">기록이 없습니다.</div>
                    ) : (
                        filteredSessions.map((session) => (
                            <button
                                key={session.id}
                                onClick={() => setSelectedSessionId(session.id)}
                                className={`
                                    w-full text-left p-4 rounded-xl transition-all duration-200 group relative overflow-hidden
                                    ${selectedSessionId === session.id ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}
                                `}
                            >
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            {session.workspace?.name}
                                        </span>
                                        <span className="text-[10px] text-neutral-600 font-mono">
                                            {format(new Date(session.startedAt || session.createdAt), 'MM.dd', { locale: ko })}
                                        </span>
                                    </div>
                                    <h3 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedSessionId === session.id ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                                        {session.title || '제목 없음'}
                                    </h3>
                                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                                        {session.summaryStatus === 'completed' ? 'AI 요약이 완료되었습니다. 클릭하여 확인하세요.' : '종료된 회의입니다.'}
                                    </p>
                                </div>

                                {selectedSessionId === session.id && (
                                    <motion.div layoutId="active-bg" className="absolute inset-0 bg-white/5" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 2. Detail View (Reader) */}
            <div className="hidden md:flex flex-1 flex-col bg-neutral-900/10 relative">
                {selectedSession ? (
                    <div className="flex-1 overflow-y-auto p-8 md:p-12">
                        <div className="max-w-3xl mx-auto space-y-8">

                            {/* Meta Header */}
                            <div className="space-y-4 border-b border-white/5 pb-8">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                        {selectedSession.workspace?.name}
                                    </span>
                                    <span className="text-neutral-500 text-sm flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {format(new Date(selectedSession.startedAt || selectedSession.createdAt), 'PPP p', { locale: ko })}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black text-white leading-tight">
                                    {selectedSession.title || '제목 없는 회의'}
                                </h1>
                                <div className="flex items-center gap-4 text-sm text-neutral-400">
                                    <span className="flex items-center gap-2">
                                        <Clock size={16} />
                                        {selectedSession.durationSec ? `${Math.floor(selectedSession.durationSec / 60)}분` : '시간 정보 없음'}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                    <span>참여자 {selectedSession.participants?.length || 0}명</span>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        onSessionClick?.(selectedSession);
                                        window.location.href = `/workspaces/${selectedSession.workspaceId}/meeting/${selectedSession.id}`;
                                    }}
                                    className="px-6 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:bg-neutral-200 transition-colors"
                                >
                                    <FileText size={18} />
                                    회의록 상세 보기
                                </button>
                            </div>

                            {/* Preview Content */}
                            <div className="prose prose-invert prose-neutral max-w-none">
                                <p className="text-lg text-neutral-300 leading-relaxed">
                                    이 회의는 <strong>{format(new Date(selectedSession.startedAt || selectedSession.createdAt), 'PPP')}</strong>에 진행되었습니다.
                                    <br />
                                    상세한 회의록과 AI 요약을 확인하려면 상단의 '회의록 상세 보기' 버튼을 클릭하세요.
                                </p>

                                <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Inbox size={20} />
                                        회의 개요
                                    </h3>
                                    <ul className="space-y-2 text-neutral-400 list-disc list-inside">
                                        <li>워크스페이스: {selectedSession.workspace?.name}</li>
                                        <li>호스트: {selectedSession.host?.name || '알 수 없음'}</li>
                                        <li>상태: {selectedSession.status === 'ended' ? '종료됨' : selectedSession.status}</li>
                                        {selectedSession.summaryStatus && (
                                            <li>AI 요약: {selectedSession.summaryStatus === 'completed' ? '완료' : selectedSession.summaryStatus === 'pending' ? '생성 중' : '미생성'}</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                        <Inbox size={48} className="mb-4 opacity-50" />
                        <p>회의록을 선택하여 상세 내용을 확인하세요</p>
                    </div>
                )}
            </div>

        </div>
    );
}
