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
    <div className="lg:col-span-2 border border-border rounded-xl p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold capitalize">
          {new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(currentDate)}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            {t('calendar.today')}
          </Button>
          <Button variant="ghost" size="icon" onClick={onPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'text-center text-sm font-medium py-2',
              idx === 0 && 'text-red-500',
              idx === 6 && 'text-blue-500'
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

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[80px] p-1 border border-border rounded-lg cursor-pointer transition-colors hover:bg-muted/50',
                !isCurrentMonth && 'opacity-40',
                isTodayDate && 'bg-primary/10 border-primary'
              )}
              onClick={() => onDateClick(date)}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isTodayDate && 'text-primary',
                  date.getDay() === 0 && 'text-red-500',
                  date.getDay() === 6 && 'text-blue-500'
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${getEventColor(event)}20`,
                      color: getEventColor(event),
                    }}
                    onClick={(e) => onEventClick(event, e)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 3}개 더
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
