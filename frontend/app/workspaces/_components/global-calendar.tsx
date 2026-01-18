'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko, enUS, zhCN, ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { meetingsApi } from '@/lib/api';
import type { WorkspaceEvent } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface GlobalCalendarProps {
    onEventClick?: (event: WorkspaceEvent) => void;
}

export function GlobalCalendar({ onEventClick }: GlobalCalendarProps) {
    const { language, t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<WorkspaceEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Locale mapping for date-fns
    const locale = useMemo(() => {
        const locales = { ko, en: enUS, 'zh-CN': zhCN, ja };
        return locales[language as keyof typeof locales] || ko;
    }, [language]);

    // Day names for each language
    const dayNames = useMemo(() => {
        const days = {
            ko: ['일', '월', '화', '수', '목', '금', '토'],
            en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
            ja: ['日', '月', '火', '水', '木', '金', '土'],
        };
        return days[language as keyof typeof days] || days.ko;
    }, [language]);

    // Date format patterns for each language
    const dateFormat = useMemo(() => {
        const formats = {
            ko: 'yyyy년 M월',
            en: 'MMMM yyyy',
            'zh-CN': 'yyyy年 M月',
            ja: 'yyyy年 M月',
        };
        return formats[language as keyof typeof formats] || formats.ko;
    }, [language]);

    const dateSidebarFormat = useMemo(() => {
        const formats = {
            ko: 'M월 d일 (EEE)',
            en: 'MMM d (EEE)',
            'zh-CN': 'M月 d日 (EEE)',
            ja: 'M月 d日 (EEE)',
        };
        return formats[language as keyof typeof formats] || formats.ko;
    }, [language]);

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
            setError(err instanceof Error ? err.message : t('calendar.error'));
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
                        {t('common.retry') || '다시 시도'}
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
                        {format(currentDate, dateFormat, { locale })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-mono border border-white/10 rounded-full hover:bg-white/5 text-white/60 hover:text-white">
                            {t('calendar.today')}
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Grid Days Header */}
                <div className="grid grid-cols-7 mb-4">
                    {dayNames.map((day, i) => (
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
                    <span>{format(selectedDate, dateSidebarFormat, { locale })} {t('calendar.schedule')}</span>
                </h3>

                {selectedDayEvents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 opacity-60">
                        <CalendarIcon size={40} className="mb-4 text-neutral-700" />
                        <p className="text-sm">{t('calendar.no_events')}</p>
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
                                        {event.isAllDay ? t('calendar.all_day') : t('calendar.scheduled')}
                                    </span>
                                    <span className="text-xs text-neutral-500 font-mono">
                                        {event.isAllDay ? t('calendar.all_day') : format(new Date(event.startTime), 'p', { locale })}
                                    </span>
                                </div>
                                <h4 className="text-white font-bold text-base mb-1 truncate group-hover:text-indigo-400 transition-colors">
                                    {event.title || t('calendar.no_title')}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                                    <span className="text-neutral-400">{event.workspace?.name}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        {t('calendar.created_by')}: {event.createdBy?.name || t('common.unknown')}
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
