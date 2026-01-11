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

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: '반복 안함',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>유형</Label>
            <Select
              value={formData.eventTypeId || ''}
              onValueChange={(value) => onFormDataChange({ ...formData, eventTypeId: value })}
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
              onCheckedChange={(checked) => onFormDataChange({ ...formData, isAllDay: checked })}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">시작</Label>
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
              <Label htmlFor="endTime">종료</Label>
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
            <Label>반복</Label>
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
              onClick={onShowDeleteDialog}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingEvent ? '수정' : '추가'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
