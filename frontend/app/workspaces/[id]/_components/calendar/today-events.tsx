'use client';

import Image from 'next/image';
import { Calendar, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkspaceEvent } from '../../_lib/types';

interface TodayEventsProps {
  events: WorkspaceEvent[];
  onEventClick: (event: WorkspaceEvent, e: React.MouseEvent) => void;
}

const getEventColor = (event: WorkspaceEvent) => {
  if (event.color) return event.color;
  if (event.eventType) return event.eventType.color;
  return '#8b5cf6';
};

const getEventTypeLabel = (event: WorkspaceEvent) => {
  if (event.eventType) return event.eventType.name;
  return '기타';
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

export function TodayEvents({ events, onEventClick }: TodayEventsProps) {
  return (
    <div className="border border-border rounded-xl p-4">
      <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        오늘의 일정
      </h3>
      <ScrollArea className="h-[400px]">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">오늘 일정이 없습니다</p>
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
                    {getEventTypeLabel(event)}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {event.isAllDay
                    ? '종일'
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
