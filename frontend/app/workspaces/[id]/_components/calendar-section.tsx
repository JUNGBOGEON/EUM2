'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Loader2,
  Settings2,
  X,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WorkspaceEvent, WorkspaceEventType, CreateEventDto, CreateEventTypeDto, UpdateEventTypeDto, RecurrenceType } from '../_lib/types';

interface CalendarSectionProps {
  events: WorkspaceEvent[];
  eventTypes: WorkspaceEventType[];
  isLoading: boolean;
  isEventTypesLoading: boolean;
  onCreateEvent: (data: CreateEventDto) => Promise<void>;
  onUpdateEvent: (eventId: string, data: Partial<CreateEventDto>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onCreateEventType: (data: CreateEventTypeDto) => Promise<void>;
  onUpdateEventType: (typeId: string, data: UpdateEventTypeDto) => Promise<void>;
  onDeleteEventType: (typeId: string) => Promise<void>;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: '반복 안함',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export function CalendarSection({
  events,
  eventTypes,
  isLoading,
  isEventTypesLoading,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onCreateEventType,
  onUpdateEventType,
  onDeleteEventType,
}: CalendarSectionProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEventTypesDialog, setShowEventTypesDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkspaceEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Event Type Management State
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeColor, setEditingTypeColor] = useState('');
  const [isTypeSubmitting, setIsTypeSubmitting] = useState(false);
  const [isDeletingType, setIsDeletingType] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateEventDto>({
    title: '',
    description: '',
    eventTypeId: undefined,
    startTime: '',
    endTime: '',
    isAllDay: false,
    recurrence: 'none',
    reminderMinutes: undefined,
  });

  // Helper to get color for an event
  const getEventColor = (event: WorkspaceEvent) => {
    if (event.color) return event.color;
    if (event.eventType) return event.eventType.color;
    return '#8b5cf6'; // default fallback
  };

  // Helper to get type label for an event
  const getEventTypeLabel = (event: WorkspaceEvent) => {
    if (event.eventType) return event.eventType.name;
    return '기타';
  };

  // Get current month's calendar data
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
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
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

  // Get today's events
  const todayEvents = useMemo(() => {
    const today = new Date();
    return getEventsForDate(today);
  }, [events]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    const defaultType = eventTypes.find(t => t.name === '기타') || eventTypes[0];
    setFormData({
      title: '',
      description: '',
      eventTypeId: defaultType?.id,
      startTime: formatDateTimeLocal(date),
      endTime: formatDateTimeLocal(new Date(date.getTime() + 60 * 60 * 1000)),
      isAllDay: false,
      recurrence: 'none',
      reminderMinutes: undefined,
    });
    setShowEventDialog(true);
  };

  const handleEventClick = (event: WorkspaceEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      eventTypeId: event.eventTypeId,
      startTime: formatDateTimeLocal(new Date(event.startTime)),
      endTime: event.endTime ? formatDateTimeLocal(new Date(event.endTime)) : '',
      isAllDay: event.isAllDay,
      recurrence: event.recurrence,
      reminderMinutes: event.reminderMinutes,
    });
    setShowEventDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, formData);
      } else {
        await onCreateEvent(formData);
      }
      setShowEventDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;

    setIsDeleting(true);
    try {
      await onDeleteEvent(editingEvent.id);
      setShowDeleteDialog(false);
      setShowEventDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    const defaultType = eventTypes.find(t => t.name === '기타') || eventTypes[0];
    setFormData({
      title: '',
      description: '',
      eventTypeId: defaultType?.id,
      startTime: '',
      endTime: '',
      isAllDay: false,
      recurrence: 'none',
      reminderMinutes: undefined,
    });
    setEditingEvent(null);
    setSelectedDate(null);
  };

  // Event Type Management Handlers
  const handleCreateEventType = async () => {
    if (!newTypeName.trim()) return;

    setIsTypeSubmitting(true);
    try {
      await onCreateEventType({
        name: newTypeName.trim(),
        color: newTypeColor,
      });
      setNewTypeName('');
      setNewTypeColor('#3b82f6');
    } catch (error) {
      console.error('Error creating event type:', error);
    } finally {
      setIsTypeSubmitting(false);
    }
  };

  const handleStartEditType = (type: WorkspaceEventType) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name);
    setEditingTypeColor(type.color);
  };

  const handleSaveEditType = async (typeId: string) => {
    if (!editingTypeName.trim()) return;

    setIsTypeSubmitting(true);
    try {
      await onUpdateEventType(typeId, {
        name: editingTypeName.trim(),
        color: editingTypeColor,
      });
      setEditingTypeId(null);
      setEditingTypeName('');
      setEditingTypeColor('');
    } catch (error) {
      console.error('Error updating event type:', error);
    } finally {
      setIsTypeSubmitting(false);
    }
  };

  const handleDeleteEventType = async (typeId: string) => {
    setIsDeletingType(true);
    try {
      await onDeleteEventType(typeId);
    } catch (error) {
      console.error('Error deleting event type:', error);
    } finally {
      setIsDeletingType(false);
    }
  };

  // Format helpers
  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCreatedAt = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">일정</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEventTypesDialog(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            유형 관리
          </Button>
          <Button onClick={() => handleDateClick(new Date())}>
            <Plus className="h-4 w-4 mr-2" />
            일정 추가
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 border border-border rounded-xl p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
              </Button>
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
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
                  onClick={() => handleDateClick(date)}
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
                        onClick={(e) => handleEventClick(event, e)}
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

        {/* Today's Events Sidebar */}
        <div className="border border-border rounded-xl p-4">
          <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            오늘의 일정
          </h3>
          <ScrollArea className="h-[400px]">
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">오늘 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={(e) => handleEventClick(event, e)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: getEventColor(event),
                          }}
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
                    {/* Creator info */}
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
      </div>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? '일정 수정' : '새 일정'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? '일정 정보를 수정하세요.' : '새로운 일정을 추가하세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="일정 제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label>유형</Label>
              <Select
                value={formData.eventTypeId || ''}
                onValueChange={(value) => setFormData({ ...formData, eventTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* All Day */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isAllDay">종일</Label>
              <Switch
                id="isAllDay"
                checked={formData.isAllDay}
                onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
              />
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">시작</Label>
              <Input
                id="startTime"
                type={formData.isAllDay ? 'date' : 'datetime-local'}
                value={formData.isAllDay ? formData.startTime.split('T')[0] : formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            {/* End Time */}
            {!formData.isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime">종료</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            )}

            {/* Recurrence */}
            <div className="space-y-2">
              <Label>반복</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value: RecurrenceType) =>
                  setFormData({ ...formData, recurrence: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="일정에 대한 설명 (선택)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Creator Info (for editing mode) */}
            {editingEvent?.createdBy && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {editingEvent.createdBy.profileImage ? (
                    <Image
                      src={editingEvent.createdBy.profileImage}
                      alt={editingEvent.createdBy.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{editingEvent.createdBy.name}님이 등록</span>
                  <span>({formatCreatedAt(editingEvent.createdAt)})</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setShowEventDialog(false)} disabled={isSubmitting}>
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title.trim()}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingEvent ? '수정' : '추가'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{editingEvent?.title}&quot; 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Types Management Dialog */}
      <Dialog open={showEventTypesDialog} onOpenChange={setShowEventTypesDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>이벤트 유형 관리</DialogTitle>
            <DialogDescription>
              커스텀 이벤트 유형을 추가하거나 수정하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add New Type */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-8 h-8 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: newTypeColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-5 gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'w-6 h-6 rounded-full border-2',
                          newTypeColor === color ? 'border-primary' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTypeColor(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                placeholder="새 유형 이름"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreateEventType}
                disabled={isTypeSubmitting || !newTypeName.trim()}
              >
                {isTypeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Existing Types List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {eventTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border"
                  >
                    {editingTypeId === type.id ? (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-8 h-8 rounded-full border border-border flex-shrink-0"
                              style={{ backgroundColor: editingTypeColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                              {PRESET_COLORS.map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    'w-6 h-6 rounded-full border-2',
                                    editingTypeColor === color ? 'border-primary' : 'border-transparent'
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setEditingTypeColor(color)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEditType(type.id)}
                          disabled={isTypeSubmitting}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTypeId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="flex-1 text-sm">{type.name}</span>
                        {type.isDefault && (
                          <Badge variant="secondary" className="text-xs">기본</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEditType(type)}
                        >
                          수정
                        </Button>
                        {!type.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEventType(type.id)}
                            disabled={isDeletingType}
                            className="text-destructive hover:text-destructive"
                          >
                            {isDeletingType ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
