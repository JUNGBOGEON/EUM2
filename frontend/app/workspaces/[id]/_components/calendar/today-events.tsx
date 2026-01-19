'use client';

import Image from 'next/image';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button'; // Added Button
import type { WorkspaceEvent } from '../../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TodayEventsProps {
  events: WorkspaceEvent[];
  date: Date; // Added date
  onEventClick: (event: WorkspaceEvent, e: React.MouseEvent) => void;
  onAddEvent?: () => void; // Added onAddEvent
}

export function TodayEvents({ events, date, onEventClick, onAddEvent }: TodayEventsProps) {
  const { language, t } = useLanguage();

  const getLocale = (lang: string) => {
    switch (lang) {
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'zh-CN': return 'zh-CN';
      default: return 'ko-KR';
    }
  };

  const locale = getLocale(language);

  // Check if dates are same day
  const isSelectedDateToday = (d: Date) => {
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const formatTitleDate = (d: Date) => {
    return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(d);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const getEventColor = (event: WorkspaceEvent) => {
    if (event.color) return event.color;
    if (event.eventType) return event.eventType.color;
    return '#8b5cf6';
  };

  return (
    <div className="h-full flex flex-col pl-2">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="w-1.5 h-6 bg-gradient-to-b from-rose-500 to-orange-500 rounded-full" />
          {isSelectedDateToday(date) ? t('calendar.today_title') : `${formatTitleDate(date)} 일정`}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono text-neutral-400 border-white/10 bg-white/5">
            {events.length}개의 일정
          </Badge>
          {onAddEvent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddEvent}
              className="h-6 w-6 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4 rotate-3">
              <Calendar className="h-6 w-6 text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-400 font-medium">{t('calendar.no_events_today')}</p>
            <p className="text-xs text-neutral-600 mt-1 max-w-[200px]">
              {isSelectedDateToday(date)
                ? "오늘 예정된 일정이 없습니다.\n여유로운 하루를 보내세요."
                : "예정된 일정이 없습니다.\n새로운 일정을 추가해보세요."}
            </p>
            {onAddEvent && (
              <Button
                variant="link"
                onClick={onAddEvent}
                className="mt-2 text-blue-400 hover:text-blue-300 text-xs"
              >
                + 일정 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const color = getEventColor(event);
              return (
                <div
                  key={event.id}
                  className="group relative flex items-start gap-3 p-3 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-white/5"
                  onClick={(e) => onEventClick(event, e)}
                >
                  {/* Color Indicator */}
                  <div
                    className="w-1 self-stretch rounded-full opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 my-1"
                    style={{ backgroundColor: color }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold tracking-wide uppercase opacity-80"
                          style={{ color: color }}
                        >
                          {event.isAllDay ? 'ALL DAY' : formatTime(event.startTime)}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-white leading-snug mb-1 truncate">
                      {event.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">
                      {event.eventType && (
                        <span className="flex-shrink-0">{event.eventType.name}</span>
                      )}
                      {event.createdBy && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-neutral-600" />
                          <span className="truncate">by {event.createdBy.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
