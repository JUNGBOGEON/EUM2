'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import type { WorkspaceEvent } from '@/lib/types';

interface GlobalCalendarProps {
    onEventClick?: (event: WorkspaceEvent) => void;
}

export function GlobalCalendar({ onEventClick }: GlobalCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<WorkspaceEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch events using the centralized API
    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await meetingsApi.getMyCalendar();
            // Ensure data is array
            const eventList = Array.isArray(data) ? data : [];
            setEvents(eventList as WorkspaceEvent[]);
            console.log('[GlobalCalendar] Fetched events:', eventList.length);
        } catch (err) {
            console.error('[GlobalCalendar] Failed to fetch calendar:', err);
            setError(err instanceof Error ? err.message : '캘린더를 불러오는데 실패했습니다.');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalendar();
    }, [fetchCalendar]);

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Filter events for date
    const eventsForDate = (date: Date) => {
        return events.filter(e => {
            const eventDate = new Date(e.startTime);
            return isSameDay(eventDate, date);
        });
    };

    const selectedDayEvents = eventsForDate(selectedDate);

    // Previous/Next Month
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-none md:rounded-l-3xl">
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-white/80 mb-4">{error}</p>
                    <button
                        onClick={fetchCalendar}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-black/40 backdrop-blur-xl rounded-none md:rounded-l-3xl overflow-hidden border-none md:border-l border-white/5">

            {/* 1. Main Calendar (Left/Top) */}
            <div className="flex-1 p-8 flex flex-col border-b md:border-b-0 md:border-r border-white/5">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {format(currentDate, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-mono border border-white/10 rounded-full hover:bg-white/5 text-white/60 hover:text-white">
                            오늘
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Grid Days Header */}
                <div className="grid grid-cols-7 mb-4">
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`text-center text-sm font-medium ${i === 0 ? 'text-rose-500' : 'text-neutral-500'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Date Grid */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-7 md:auto-rows-fr gap-2">
                        {days.map((day) => {
                            const dayEvents = eventsForDate(day);
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        relative p-2 rounded-xl flex flex-col items-center justify-start gap-1 transition-all duration-200 min-h-[80px] md:min-h-0
                                        ${isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}
                                        ${isToday && !isSelected ? 'text-indigo-400' : ''}
                                    `}
                                >
                                    <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-indigo-400' : 'text-neutral-400'}`}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Dots for events */}
                                    <div className="flex gap-1 flex-wrap justify-center max-w-full">
                                        {dayEvents.slice(0, 3).map((e, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                                    w-1.5 h-1.5 rounded-full
                                                    ${e.isAllDay ? 'bg-indigo-400' : 'bg-emerald-500'}
                                                `}
                                            />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 2. Side Panel (Selected Date Schedule) */}
            <div className="w-full md:w-[320px] xl:w-[360px] bg-neutral-900/30 p-6 flex flex-col overflow-y-auto">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CalendarIcon size={14} />
                    <span>{format(selectedDate, 'M월 d일 (EEE)', { locale: ko })} 일정</span>
                </h3>

                {selectedDayEvents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 opacity-60">
                        <CalendarIcon size={40} className="mb-4 text-neutral-700" />
                        <p className="text-sm">일정이 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedDayEvents.map((event) => (
                            <div
                                key={event.id}
                                className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors group cursor-pointer"
                                onClick={() => onEventClick?.(event)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`
                                        px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider
                                        ${event.isAllDay ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}
                                    `}>
                                        {event.isAllDay ? '종일' : '예정'}
                                    </span>
                                    <span className="text-xs text-neutral-500 font-mono">
                                        {event.isAllDay ? 'All Day' : format(new Date(event.startTime), 'p', { locale: ko })}
                                    </span>
                                </div>
                                <h4 className="text-white font-bold text-base mb-1 truncate group-hover:text-indigo-400 transition-colors">
                                    {event.title || '제목 없음'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                                    <span className="text-neutral-400">{event.workspace?.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        작성자: {event.createdBy?.name || '알 수 없음'}
                                    </span>
                                </div>

                                {event.description && (
                                    <p className="text-xs text-neutral-500 line-clamp-2">
                                        {event.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
