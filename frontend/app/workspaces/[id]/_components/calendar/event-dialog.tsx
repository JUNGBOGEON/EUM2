'use client';

import Image from 'next/image';
import { Loader2, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import type { WorkspaceEvent, WorkspaceEventType, CreateEventDto, RecurrenceType } from '../../_lib/types';

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

interface EventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: WorkspaceEvent | null;
  eventTypes: WorkspaceEventType[];
  formData: CreateEventDto;
  onFormDataChange: (data: CreateEventDto) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onShowDeleteDialog: () => void;
}

export function EventDialog({
  isOpen,
  onOpenChange,
  editingEvent,
  eventTypes,
  formData,
  onFormDataChange,
  isSubmitting,
  onSubmit,
  onShowDeleteDialog,
}: EventDialogProps) {
  const { language, t } = useLanguage();

  // Map language code to locale for date formatting
  const getLocale = (lang: string) => {
    switch (lang) {
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'zh-CN': return 'zh-CN';
      default: return 'ko-KR';
    }
  };

  const formatCreatedAt = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(getLocale(language), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecurrenceLabel = (type: RecurrenceType) => {
    return t(`calendar.event.recurrence.${type}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingEvent ? t('calendar.event.edit_title') : t('calendar.event.new_title')}</DialogTitle>
          <DialogDescription>
            {editingEvent ? t('calendar.event.edit_desc') : t('calendar.event.new_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('calendar.event.title_label')}</Label>
            <Input
              id="title"
              placeholder={t('calendar.event.title_placeholder')}
              value={formData.title}
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>{t('calendar.event.type_label')}</Label>
            <Select
              value={formData.eventTypeId || ''}
              onValueChange={(value) => onFormDataChange({ ...formData, eventTypeId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('calendar.event.type_placeholder')} />
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
            <Label htmlFor="isAllDay">{t('calendar.event.all_day_label')}</Label>
            <Switch
              id="isAllDay"
              checked={formData.isAllDay}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, isAllDay: checked })}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">{t('calendar.event.start_label')}</Label>
            <Input
              id="startTime"
              type={formData.isAllDay ? 'date' : 'datetime-local'}
              value={formData.isAllDay ? formData.startTime.split('T')[0] : formData.startTime}
              onChange={(e) => onFormDataChange({ ...formData, startTime: e.target.value })}
            />
          </div>

          {/* End Time */}
          {!formData.isAllDay && (
            <div className="space-y-2">
              <Label htmlFor="endTime">{t('calendar.event.end_label')}</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => onFormDataChange({ ...formData, endTime: e.target.value })}
              />
            </div>
          )}

          {/* Recurrence */}
          <div className="space-y-2">
            <Label>{t('calendar.event.recurrence_label')}</Label>
            <Select
              value={formData.recurrence}
              onValueChange={(value: RecurrenceType) =>
                onFormDataChange({ ...formData, recurrence: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['none', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getRecurrenceLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('calendar.event.desc_label')}</Label>
            <Textarea
              id="description"
              placeholder={t('calendar.event.desc_placeholder')}
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
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
                <span>{t('calendar.event.created_by').replace('{name}', editingEvent.createdBy.name)}</span>
                <span>({formatCreatedAt(editingEvent.createdAt)})</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {editingEvent && (
            <Button
              variant="destructive"
              onClick={onShowDeleteDialog}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingEvent ? t('calendar.event.edit_btn') : t('calendar.event.add_btn')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
