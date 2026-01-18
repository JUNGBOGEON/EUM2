'use client';

import Image from 'next/image';
import { Calendar, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkspaceEvent } from '../../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface TodayEventsProps {
  events: WorkspaceEvent[];
  onEventClick: (event: WorkspaceEvent, e: React.MouseEvent) => void;
}

const getEventColor = (event: WorkspaceEvent) => {
  if (event.color) return event.color;
  if (event.eventType) return event.eventType.color;
  return '#8b5cf6';
};

export function TodayEvents({ events, onEventClick }: TodayEventsProps) {
  const { language, t } = useLanguage();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="border border-white/5 rounded-2xl p-6 bg-neutral-900/40 backdrop-blur-sm shadow-xl h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
        <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <Clock className="h-4 w-4 text-orange-400" />
        </div>
        {t('calendar.today_title')}
        <span className="ml-auto text-xs font-normal text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">
          {events.length}
        </span>
      </h3>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-400 font-medium">{t('calendar.no_events_today')}</p>
            <p className="text-xs text-neutral-600 mt-1">Check back later or schedule something new.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="group p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 cursor-pointer transition-all duration-200 hover:border-white/10"
                onClick={(e) => onEventClick(event, e)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full ring-2 ring-transparent group-hover:ring-white/10 transition-all"
                      style={{ backgroundColor: getEventColor(event) }}
                    />
                    <span className="font-medium text-sm text-neutral-200 group-hover:text-white truncate transition-colors">
                      {event.title}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-white/5 hover:bg-white/10 text-neutral-400 border-none px-1.5 py-0 h-5">
                    {event.eventType ? event.eventType.name : t('common.others')}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-500 group-hover:text-neutral-400 mb-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    {event.isAllDay
                      ? t('calendar.event.all_day_label')
                      : `${formatTime(event.startTime)}${event.endTime ? ` - ${formatTime(event.endTime)}` : ''}`}
                  </span>
                </div>

                {event.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-2 group-hover:text-neutral-400">
                    {event.description}
                  </p>
                )}

                {event.createdBy && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                    {event.createdBy.profileImage ? (
                      <Image
                        src={event.createdBy.profileImage}
                        alt={event.createdBy.name}
                        width={16}
                        height={16}
                        className="rounded-full ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-neutral-400" />
                      </div>
                    )}
                    <span className="text-[10px] text-neutral-500">{event.createdBy.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
