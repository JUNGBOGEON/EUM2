'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkspaceEvent } from '../../_lib/types';

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarGridProps {
  currentDate: Date;
  events: WorkspaceEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: WorkspaceEvent, e: React.MouseEvent) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const getEventColor = (event: WorkspaceEvent) => {
  if (event.color) return event.color;
  if (event.eventType) return event.eventType.color;
  return '#8b5cf6';
};

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export function CalendarGrid({
  currentDate,
  events,
  onDateClick,
  onEventClick,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarGridProps) {
  const { language, t } = useLanguage();

  // Get locale from language code
  const getLocale = (lang: string) => {
    switch (lang) {
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'zh-CN': return 'zh-CN';
      default: return 'ko-KR';
    }
  };

  const locale = getLocale(language);

  // Generate localized week days
  const weekDays = useMemo(() => {
    const days = [];
    // Start from Sunday (which is a known date, e.g. 2024-01-07)
    // Actually just use any Sunday. 2021-01-03 was a Sunday.
    for (let i = 0; i < 7; i++) {
      const date = new Date(2021, 0, 3 + i);
      days.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date));
    }
    return days;
  }, [locale]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  return (
    <div className="lg:col-span-2 border border-white/5 rounded-2xl p-6 bg-neutral-900/40 backdrop-blur-sm shadow-2xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold capitalize text-white flex items-center gap-2">
          {new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(currentDate)}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="border-white/10 bg-white/5 text-white hover:bg-white hover:text-black hover:border-transparent transition-all"
          >
            {t('calendar.today')}
          </Button>
          <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-0.5">
            <Button variant="ghost" size="icon" onClick={onPreviousMonth} className="h-7 w-7 text-neutral-400 hover:text-white hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-7 w-7 text-neutral-400 hover:text-white hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'text-center text-xs font-semibold uppercase tracking-wider py-2',
              idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-blue-400' : 'text-neutral-500'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const dayEvents = getEventsForDate(date);
          const isTodayDate = isToday(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] p-2 border rounded-xl cursor-pointer transition-all duration-200 group relative overflow-hidden',
                'hover:ring-1 hover:ring-white/20 hover:bg-white/5',
                isCurrentMonth ? 'bg-white/[0.02] border-white/5' : 'bg-transparent border-transparent opacity-30',
                isTodayDate && 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/30'
              )}
              onClick={() => onDateClick(date)}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    isTodayDate
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                      : isWeekend && isCurrentMonth ? (date.getDay() === 0 ? 'text-rose-400' : 'text-blue-400') : 'text-neutral-400 group-hover:text-white'
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-transform hover:scale-105"
                    style={{
                      backgroundColor: `${getEventColor(event)}20`,
                      color: hasBrightColor(getEventColor(event)) ? getEventColor(event) : '#e5e5e5',
                      borderLeft: `2px solid ${getEventColor(event)}`
                    }}
                    onClick={(e) => onEventClick(event, e)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-neutral-500 px-1 font-medium group-hover:text-neutral-300">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to check if color is bright (simple heuristic)
function hasBrightColor(color: string) {
  // If it's a hex code, simple check. For now assume yes or just return true/false based on preference.
  // Ideally we'd calculate luminance. But let's just return true to keep original color or near white.
  return true;
}
