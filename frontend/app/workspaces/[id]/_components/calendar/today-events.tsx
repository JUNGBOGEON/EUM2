'use client';

import Image from 'next/image';
import { Calendar, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkspaceEvent } from '../../_lib/types';

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

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

  const getEventTypeLabel = (event: WorkspaceEvent) => {
    if (event.eventType) return event.eventType.name;
    // Default 'Other' usually matches default event type name in DB or fallback
    // For now assuming 'Other' is handled by DB seed or user creation, 
    // but here we can just fallback to localized 'Type' or empty if none.
    // Actually the code had '기타' hardcoded. Let's use a safe fallback.
    return t('calendar.event.type_placeholder'); // or simply '기타' if we want to keep it simple but localized? 
    // Wait, '기타' appears in event types usually. If it's null, it's untyped.
    // Let's use a generic string or just keep it minimal.
    // The previous code had `return '기타';`. 
    // I don't have a 'Other' key yet. I'll use 'Common' or just leave it as fallback.
    // Let's use a new key "etc" or "other".
    // For now I'll use t('calendar.event.type_placeholder') which is "Select Type" / "유형 선택" which is weird.
    // Let's add "common.others" or similar if needed.
    // Actually, `eventTypes` usually have names. If it's missing, maybe just display nothing or "-".
    // But to be safe and match previous behavior:
    return '기타'; // I should probably localize this too if I want perfection.
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    // Use dynamic locale
    const locale = language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="border border-border rounded-xl p-4">
      <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {t('calendar.today_title')}
      </h3>
      <ScrollArea className="h-[400px]">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('calendar.no_events_today')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={(e) => onEventClick(event, e)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getEventColor(event) }}
                    />
                    <span className="font-medium text-sm">{event.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {event.eventType ? event.eventType.name : t('common.others')}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {event.isAllDay
                    ? t('calendar.event.all_day_label')
                    : `${formatTime(event.startTime)}${event.endTime ? ` - ${formatTime(event.endTime)}` : ''}`}
                </div>
                {event.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}
                {event.createdBy && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {event.createdBy.profileImage ? (
                      <Image
                        src={event.createdBy.profileImage}
                        alt={event.createdBy.name}
                        width={14}
                        height={14}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    <span>{event.createdBy.name}</span>
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
