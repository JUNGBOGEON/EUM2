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
      <DialogContent className="sm:max-w-[450px] bg-[#0A0A0A]/80 backdrop-blur-2xl border-white/[0.08] shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <DialogTitle className="text-lg font-semibold text-white tracking-tight">
            {t('calendar.manage_types_dialog.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 mt-1 font-medium">
            {t('calendar.manage_types_dialog.desc')}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Type */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">Add New Type</label>
            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-white/10 bg-white/[0.02] focus-within:bg-white/[0.04] focus-within:border-white/20 transition-all">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-lg border border-white/10 flex-shrink-0 ring-2 ring-transparent hover:ring-white/20 transition-all shadow-inner"
                    style={{ backgroundColor: newTypeColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-[#111] border-white/10 text-white rounded-xl shadow-xl" align="start">
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                          newTypeColor === color ? 'border-white' : 'border-transparent'
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
                className="flex-1 bg-transparent border-none text-white placeholder:text-neutral-600 focus-visible:ring-0 h-9 font-medium"
              />
              <Button
                size="sm"
                onClick={handleCreateEventType}
                disabled={isTypeSubmitting || !newTypeName.trim()}
                className="h-9 w-9 p-0 bg-white text-black hover:bg-neutral-200 rounded-lg shadow-lg shadow-white/5"
              >
                {isTypeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Existing Types List */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 pl-1">Existing Types</label>
            <ScrollArea className="h-[280px] -mr-3 pr-3">
              <div className="space-y-1">
                {eventTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group border border-transparent hover:border-white/5"
                  >
                    {editingTypeId === type.id ? (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0 ring-2 ring-transparent hover:ring-white/20 transition-all shadow-inner"
                              style={{ backgroundColor: editingTypeColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 bg-[#111] border-white/10 text-white rounded-xl" align="start">
                            <div className="grid grid-cols-5 gap-2">
                              {PRESET_COLORS.map((color) => (
                                <button
                                  key={color}
                                  className={cn(
                                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                                    editingTypeColor === color ? 'border-white' : 'border-transparent'
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
                          className="flex-1 bg-white/[0.05] border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEditType(type.id)}
                          disabled={isTypeSubmitting}
                          className="h-8 px-2.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-md bg-green-500/5 border border-green-500/10"
                        >
                          {t('calendar.manage_types_dialog.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTypeId(null)}
                          className="h-8 w-8 p-0 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mx-2"
                          style={{ backgroundColor: type.color, boxShadow: `0 0 10px ${type.color}40` }}
                        />
                        <span className="flex-1 text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">{type.name}</span>
                        {type.isDefault && (
                          <Badge variant="secondary" className="text-[10px] bg-white/5 text-neutral-500 border border-white/5 px-2 py-0.5 h-5">{t('calendar.manage_types_dialog.default_badge')}</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEditType(type)}
                          className="h-8 px-2 text-xs text-neutral-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all ml-auto rounded-md"
                        >
                          {t('calendar.manage_types_dialog.edit')}
                        </Button>
                        {!type.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEventType(type.id)}
                            disabled={isDeletingType}
                            className="h-8 w-8 p-0 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all rounded-md"
                          >
                            {isDeletingType ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
