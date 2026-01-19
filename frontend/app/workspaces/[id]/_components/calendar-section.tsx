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
import { CalendarGrid, EventDialog, EventTypeDialog, TodayEvents, EventDetailDialog } from './calendar';
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
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dialog states
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEventTypesDialog, setShowEventTypesDialog] = useState(false);

  // Event state
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceEvent | null>(null);
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

  // Get selected date's events
  const selectedDayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
  }, [events, selectedDate]);

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
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Event handlers
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = (date?: Date) => {
    if (!canEditCalendar) return;
    const targetDate = date || selectedDate;

    setEditingEvent(null);
    const defaultType = eventTypes.find(t => t.name === '기타') || eventTypes[0];
    setFormData({
      title: '',
      description: '',
      eventTypeId: defaultType?.id,
      startTime: formatDateTimeLocal(targetDate),
      endTime: formatDateTimeLocal(new Date(targetDate.getTime() + 60 * 60 * 1000)),
      isAllDay: false,
      recurrence: 'none',
      reminderMinutes: undefined,
    });
    setShowEventDialog(true);
  };

  const handleEventClick = (event: WorkspaceEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowDetailDialog(true);
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;

    setEditingEvent(selectedEvent);
    setFormData({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      eventTypeId: selectedEvent.eventTypeId,
      startTime: formatDateTimeLocal(new Date(selectedEvent.startTime)),
      endTime: selectedEvent.endTime ? formatDateTimeLocal(new Date(selectedEvent.endTime)) : '',
      isAllDay: selectedEvent.isAllDay,
      recurrence: selectedEvent.recurrence,
      reminderMinutes: selectedEvent.reminderMinutes,
    });
    setShowDetailDialog(false); // Close detail
    setShowEventDialog(true); // Open edit form
  };

  const handleDeleteClick = () => {
    if (!selectedEvent) return;
    setEditingEvent(selectedEvent); // Prepare for delete execution
    setShowDetailDialog(false);
    setShowDeleteDialog(true);
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
    <div className="h-full flex flex-col animate-in fade-in duration-700">
      {/* Top Actions - Floating above */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-3">
          {canEditCalendar && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEventTypesDialog(true)}
                className="text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t('calendar.manage_types')}
              </Button>
              <Button
                onClick={() => handleCreateEvent()}
                className="bg-white text-black hover:bg-neutral-200 border-none font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.add_event')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Calendar Grid - Takes 2/3 */}
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
        />

        {/* Selected Date Events Timeline - Takes 1/3 */}
        <div className="lg:col-span-1 h-full pl-6 border-l border-white/5">
          <TodayEvents
            events={selectedDayEvents}
            date={selectedDate}
            onEventClick={handleEventClick}
            onAddEvent={() => handleCreateEvent(selectedDate)}
          />
        </div>
      </div>

      {/* Event Detail Dialog - Read Only */}
      <EventDetailDialog
        isOpen={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        event={selectedEvent}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* Event Dialog - Edit/Create */}
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
