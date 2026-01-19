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
    <div className="lg:col-span-2 flex flex-col h-full">
      {/* Calendar Header - Minimalist & Airy */}
      <div className="flex items-center justify-between mb-8 pl-2">
        <h3 className="text-3xl font-bold capitalize text-white tracking-tight flex items-center gap-3">
          {new Intl.DateTimeFormat(locale, { month: 'long' }).format(currentDate)}
          <span className="text-neutral-600 font-light">
            {currentDate.getFullYear()}
          </span>
        </h3>

        <div className="flex items-center gap-1 bg-neutral-900/50 rounded-full border border-white/5 p-1 backdrop-blur-md">
          <Button variant="ghost" size="icon" onClick={onPreviousMonth} className="h-8 w-8 rounded-full text-neutral-400 hover:text-white hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="h-8 px-3 text-xs rounded-full text-neutral-300 hover:text-white hover:bg-white/10 font-medium"
          >
            {t('calendar.today')}
          </Button>
          <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8 rounded-full text-neutral-400 hover:text-white hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Glass Panel */}
      <div className="relative flex-1 bg-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">

        {/* Days of Week - Sleek Header */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.01]">
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                'text-center text-[10px] font-medium uppercase tracking-[0.2em] py-4',
                idx === 0 ? 'text-rose-400/70' : idx === 6 ? 'text-blue-400/70' : 'text-neutral-500'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Borderless Modern Feel */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const dayEvents = getEventsForDate(date);
            const isTodayDate = isToday(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            // Simple row borders logic (every 7th item starts a new row, but we can also rely on grid-cols-7)
            // We'll use negative margins or just border-right/bottom for grid division

            return (
              <div
                key={idx}
                className={cn(
                  'relative min-h-[120px] p-3 transition-all duration-300 group',
                  'border-b border-r border-white/[0.03]', // Subtle grid lines
                  // Remove right border for last column to be cleaner
                  (idx + 1) % 7 === 0 && 'border-r-0',

                  isCurrentMonth ? 'bg-transparent' : 'bg-neutral-950/30',
                  !isCurrentMonth && 'opacity-40 saturate-0', // Dim non-current days significantly

                  'hover:bg-white/[0.03]' // Subtle hover
                )}
                onClick={() => onDateClick(date)}
              >
                {/* Active Day Indicator (Background Glow) - Removed for cleaner look */}

                <div className="relative z-10 flex justify-between items-start mb-3">
                  <span
                    className={cn(
                      'text-sm transition-all duration-300',
                      isTodayDate
                        ? 'flex items-center justify-center w-7 h-7 rounded-full bg-white text-neutral-950 font-bold'
                        : cn(
                          'font-medium',
                          isWeekend ? (date.getDay() === 0 ? 'text-rose-400' : 'text-blue-400') : 'text-neutral-400 group-hover:text-neutral-200'
                        )
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="space-y-1.5 relative z-10">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="group/event relative pl-3 py-1 pr-2 rounded-sm text-[11px] font-medium leading-tight truncate transition-all duration-200 hover:translate-x-1"
                      onClick={(e) => onEventClick(event, e)}
                    >
                      {/* Vertical Bar Indicator */}
                      <div
                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
                        style={{ backgroundColor: getEventColor(event) }}
                      />
                      {/* Subtle background on hover */}
                      <div
                        className="absolute inset-0 rounded-sm bg-white/0 group-hover/event:bg-white/5 transition-colors -z-10"
                      />
                      <span style={{ color: '#e5e5e5' }}>{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-neutral-600 pl-3 font-medium group-hover:text-neutral-400 transition-colors">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
