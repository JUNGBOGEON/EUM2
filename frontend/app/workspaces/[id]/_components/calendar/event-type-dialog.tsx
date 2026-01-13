'use client';

import { useState } from 'react';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WorkspaceEventType, CreateEventTypeDto, UpdateEventTypeDto } from '../../_lib/types';

interface EventTypeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventTypes: WorkspaceEventType[];
  onCreateEventType: (data: CreateEventTypeDto) => Promise<void>;
  onUpdateEventType: (typeId: string, data: UpdateEventTypeDto) => Promise<void>;
  onDeleteEventType: (typeId: string) => Promise<void>;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

export function EventTypeDialog({
  isOpen,
  onOpenChange,
  eventTypes,
  onCreateEventType,
  onUpdateEventType,
  onDeleteEventType,
}: EventTypeDialogProps) {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3b82f6');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeColor, setEditingTypeColor] = useState('');
  const [isTypeSubmitting, setIsTypeSubmitting] = useState(false);
  const [isDeletingType, setIsDeletingType] = useState(false);
  const { t } = useLanguage();

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('calendar.manage_types_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('calendar.manage_types_dialog.desc')}
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
              placeholder={t('calendar.manage_types_dialog.new_type_placeholder')}
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
                        {t('calendar.manage_types_dialog.save')}
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
                        <Badge variant="secondary" className="text-xs">{t('calendar.manage_types_dialog.default_badge')}</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEditType(type)}
                      >
                        {t('calendar.manage_types_dialog.edit')}
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
  );
}
