'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { API_URL } from '../_lib/constants';
import type { WorkspaceEvent, WorkspaceEventType, CreateEventDto, CreateEventTypeDto, UpdateEventTypeDto } from '../_lib/types';

interface UseWorkspaceEventsProps {
  workspaceId: string;
}

interface UseWorkspaceEventsReturn {
  events: WorkspaceEvent[];
  eventTypes: WorkspaceEventType[];
  isEventsLoading: boolean;
  isEventTypesLoading: boolean;
  fetchEvents: () => Promise<void>;
  fetchEventTypes: () => Promise<void>;
  createEvent: (data: CreateEventDto) => Promise<void>;
  updateEvent: (eventId: string, data: Partial<CreateEventDto>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  createEventType: (data: CreateEventTypeDto) => Promise<void>;
  updateEventType: (typeId: string, data: UpdateEventTypeDto) => Promise<void>;
  deleteEventType: (typeId: string) => Promise<void>;
}

export function useWorkspaceEvents({ workspaceId }: UseWorkspaceEventsProps): UseWorkspaceEventsReturn {
  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<WorkspaceEventType[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isEventTypesLoading, setIsEventTypesLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsEventsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setEvents([]);
        return;
      }
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, [workspaceId]);

  const fetchEventTypes = useCallback(async () => {
    setIsEventTypesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setEventTypes([]);
        return;
      }
      const data = await response.json();
      setEventTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching event types:', error);
      setEventTypes([]);
    } finally {
      setIsEventTypesLoading(false);
    }
  }, [workspaceId]);

  const createEvent = useCallback(async (data: CreateEventDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create event');
      }

      toast.success('일정이 추가되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error instanceof Error ? error.message : '일정 추가에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, data: Partial<CreateEventDto>) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update event');
      }

      toast.success('일정이 수정되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error instanceof Error ? error.message : '일정 수정에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete event');
      }

      toast.success('일정이 삭제되었습니다.');
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error instanceof Error ? error.message : '일정 삭제에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEvents]);

  const createEventType = useCallback(async (data: CreateEventTypeDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create event type');
      }

      toast.success('이벤트 유형이 추가되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error creating event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 추가에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  const updateEventType = useCallback(async (typeId: string, data: UpdateEventTypeDto) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update event type');
      }

      toast.success('이벤트 유형이 수정되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error updating event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 수정에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  const deleteEventType = useCallback(async (typeId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/event-types/${typeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete event type');
      }

      toast.success('이벤트 유형이 삭제되었습니다.');
      await fetchEventTypes();
    } catch (error) {
      console.error('Error deleting event type:', error);
      toast.error(error instanceof Error ? error.message : '이벤트 유형 삭제에 실패했습니다.');
      throw error;
    }
  }, [workspaceId, fetchEventTypes]);

  return {
    events,
    eventTypes,
    isEventsLoading,
    isEventTypesLoading,
    fetchEvents,
    fetchEventTypes,
    createEvent,
    updateEvent,
    deleteEvent,
    createEventType,
    updateEventType,
    deleteEventType,
  };
}
