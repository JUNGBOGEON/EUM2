'use client';

import { useState, useMemo } from 'react';
import { Calendar, Plus, Settings2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { WorkspaceEvent, WorkspaceEventType, CreateEventDto, CreateEventTypeDto, UpdateEventTypeDto } from '../_lib/types';

// Sub-components
import { CalendarGrid, EventDialog, EventTypeDialog, TodayEvents } from './calendar';
import { useLanguage } from '@/contexts/LanguageContext';

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
  canEditCalendar?: boolean;
}

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
  canEditCalendar = true,
}: CalendarSectionProps) {
  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEventTypesDialog, setShowEventTypesDialog] = useState(false);

  // Event state
  const [editingEvent, setEditingEvent] = useState<WorkspaceEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const { t } = useLanguage();

  // Get today's events
  const todayEvents = useMemo(() => {
    const today = new Date();
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === today.getFullYear() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getDate() === today.getDate()
      );
    });
  }, [events]);

  // Format helpers
  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Navigation handlers
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
    if (!canEditCalendar) return;
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
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10">
            <Calendar className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t('calendar.title')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Mange your team schedules and events</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEditCalendar && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventTypesDialog(true)}
                className="border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t('calendar.manage_types')}
              </Button>
              <Button
                onClick={() => handleDateClick(new Date())}
                className="bg-white text-black hover:bg-neutral-200 border-none font-semibold shadow-lg shadow-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.add_event')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
        {/* Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
        />

        {/* Today's Events Sidebar */}
        <div className="lg:col-span-1 h-full">
          <TodayEvents
            events={todayEvents}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        isOpen={showEventDialog}
        onOpenChange={setShowEventDialog}
        editingEvent={editingEvent}
        eventTypes={eventTypes}
        formData={formData}
        onFormDataChange={setFormData}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onShowDeleteDialog={() => setShowDeleteDialog(true)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('calendar.delete_confirm').replace('{title}', editingEvent?.title || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Types Management Dialog */}
      <EventTypeDialog
        isOpen={showEventTypesDialog}
        onOpenChange={setShowEventTypesDialog}
        eventTypes={eventTypes}
        onCreateEventType={onCreateEventType}
        onUpdateEventType={onUpdateEventType}
        onDeleteEventType={onDeleteEventType}
      />
    </div>
  );
}
