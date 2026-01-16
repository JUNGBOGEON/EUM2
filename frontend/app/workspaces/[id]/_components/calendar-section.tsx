'use client';

import { useState, useMemo } from 'react';
import { Calendar, Plus, Settings2, Loader2 } from 'lucide-react';
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

import { useLanguage } from '@/contexts/LanguageContext';

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
          <h2 className="text-lg font-semibold">{t('calendar.title')}</h2>
        </div>
        <div className="flex items-center gap-2">
          {canEditCalendar && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEventTypesDialog(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                {t('calendar.manage_types')}
              </Button>
              <Button onClick={() => handleDateClick(new Date())}>
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.add_event')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <TodayEvents
          events={todayEvents}
          onEventClick={handleEventClick}
        />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.delete_confirm').replace('{title}', editingEvent?.title || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
