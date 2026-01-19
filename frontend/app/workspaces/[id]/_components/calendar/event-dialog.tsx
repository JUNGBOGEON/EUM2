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
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A]/80 backdrop-blur-2xl border-white/[0.08] shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Modern Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <DialogTitle className="text-lg font-semibold text-white tracking-tight">
            {editingEvent ? t('calendar.event.edit_title') : t('calendar.event.new_title')}
          </DialogTitle>
          <DialogDescription className="hidden">
            {/* Hidden description for a11y, header is self-explanatory */}
            {editingEvent ? t('calendar.event.edit_desc') : t('calendar.event.new_desc')}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5">
          {/* Title - Large Input */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">
              {t('calendar.event.title_label')}
            </Label>
            <Input
              id="title"
              placeholder={t('calendar.event.title_placeholder')}
              value={formData.title}
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
              className="h-12 bg-white/[0.03] border-white/5 text-lg text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:bg-white/[0.05] rounded-xl transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Event Type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">
                {t('calendar.event.type_label')}
              </Label>
              <Select
                value={formData.eventTypeId || ''}
                onValueChange={(value) => onFormDataChange({ ...formData, eventTypeId: value })}
              >
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/5 text-neutral-200 focus:ring-1 focus:ring-white/10 rounded-lg hover:bg-white/[0.05] transition-colors">
                  <SelectValue placeholder={t('calendar.event.type_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-neutral-200">
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="focus:bg-white/10 focus:text-white cursor-pointer py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence */}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">
                {t('calendar.event.recurrence_label')}
              </Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value: RecurrenceType) =>
                  onFormDataChange({ ...formData, recurrence: value })
                }
              >
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/5 text-neutral-200 focus:ring-1 focus:ring-white/10 rounded-lg hover:bg-white/[0.05] transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-neutral-200">
                  {(['none', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map((type) => (
                    <SelectItem key={type} value={type} className="focus:bg-white/10 focus:text-white cursor-pointer py-2">
                      {getRecurrenceLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="isAllDay" className="text-neutral-300 font-medium">{t('calendar.event.all_day_label')}</Label>
              <Switch
                id="isAllDay"
                checked={formData.isAllDay}
                onCheckedChange={(checked) => onFormDataChange({ ...formData, isAllDay: checked })}
                className="data-[state=checked]:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">Starts</Label>
                <Input
                  id="startTime"
                  type={formData.isAllDay ? 'date' : 'datetime-local'}
                  value={formData.isAllDay ? formData.startTime.split('T')[0] : formData.startTime}
                  onChange={(e) => onFormDataChange({ ...formData, startTime: e.target.value })}
                  className="h-9 bg-black/20 border-white/5 text-sm text-neutral-300 focus-visible:ring-1 focus-visible:ring-white/10 rounded-md"
                />
              </div>
              {!formData.isAllDay && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">Ends</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => onFormDataChange({ ...formData, endTime: e.target.value })}
                    className="h-9 bg-black/20 border-white/5 text-sm text-neutral-300 focus-visible:ring-1 focus-visible:ring-white/10 rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">
              {t('calendar.event.desc_label')}
            </Label>
            <Textarea
              id="description"
              placeholder={t('calendar.event.desc_placeholder')}
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              rows={3}
              className="bg-white/[0.03] border-white/5 text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:bg-white/[0.05] rounded-xl resize-none"
            />
          </div>

          {/* Creator Info */}
          {editingEvent?.createdBy && (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs text-neutral-600 px-1">
                {editingEvent.createdBy.profileImage ? (
                  <Image
                    src={editingEvent.createdBy.profileImage}
                    alt={editingEvent.createdBy.name}
                    width={18}
                    height={18}
                    className="rounded-full ring-1 ring-white/10 opacity-70"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>Created by <span className="text-neutral-500">{editingEvent.createdBy.name}</span></span>
                <span className="text-neutral-700 mx-1">•</span>
                <span>{formatCreatedAt(editingEvent.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 flex justify-between sm:justify-between bg-black/20">
          {editingEvent && (
            <Button
              variant="ghost"
              onClick={onShowDeleteDialog}
              disabled={isSubmitting}
              className="text-red-500/70 hover:text-red-400 hover:bg-red-500/10 h-10 px-3"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white hover:bg-white/5 h-10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !formData.title.trim()}
              className="bg-white text-black hover:bg-neutral-200 h-10 px-6 font-semibold rounded-lg"
            >
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
