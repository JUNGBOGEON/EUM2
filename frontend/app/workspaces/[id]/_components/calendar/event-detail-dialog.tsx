'use client';

import Image from 'next/image';
import { Clock, Calendar as CalendarIcon, MapPin, AlignLeft, User, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { WorkspaceEvent } from '../../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface EventDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    event: WorkspaceEvent | null;
    onEdit: () => void;
    onDelete: () => void;
}

export function EventDetailDialog({
    isOpen,
    onOpenChange,
    event,
    onEdit,
    onDelete,
}: EventDetailDialogProps) {
    const { language, t } = useLanguage();

    if (!event) return null;

    const getLocale = (lang: string) => {
        switch (lang) {
            case 'en': return 'en-US';
            case 'ja': return 'ja-JP';
            case 'zh-CN': return 'zh-CN';
            default: return 'ko-KR';
        }
    };

    const locale = getLocale(language);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat(locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] bg-[#0A0A0A]/90 backdrop-blur-3xl border-white/[0.08] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-0 gap-0 overflow-hidden rounded-[32px] [&>button]:hidden">
                {/* Decorative Color Glow */}
                <div
                    className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% -20%, ${event.eventType?.color || '#ffffff'}, transparent 70%)`
                    }}
                />

                <div className="relative p-8 pb-6">
                    {/* Header Actions */}
                    <div className="absolute top-6 right-6 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Event Type & Title */}
                    <div className="mt-2 mb-8">
                        {event.eventType && (
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px]"
                                    style={{
                                        backgroundColor: event.eventType.color,
                                        boxShadow: `0 0 10px ${event.eventType.color}`
                                    }}
                                />
                                <span className="text-xs font-bold tracking-widest uppercase text-neutral-400">
                                    {event.eventType.name}
                                </span>
                            </div>
                        )}
                        <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
                            {event.title}
                        </h2>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-6">
                        {/* Date & Time */}
                        <div className="flex items-start gap-4 group">
                            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.05] transition-colors">
                                <CalendarIcon className="h-5 w-5 text-neutral-300" />
                            </div>
                            <div>
                                <div className="text-lg font-medium text-neutral-200">
                                    {formatDate(event.startTime)}
                                </div>
                                <div className="text-sm text-neutral-500 mt-0.5 font-medium flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {event.isAllDay ? (
                                        t('calendar.event.all_day_label')
                                    ) : (
                                        `${formatTime(event.startTime)} - ${event.endTime ? formatTime(event.endTime) : ''}`
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <div className="flex items-start gap-4 group">
                                <div className="mt-1 w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.05] transition-colors">
                                    <AlignLeft className="h-5 w-5 text-neutral-300" />
                                </div>
                                <div className="pt-1.5">
                                    <p className="text-base text-neutral-300 leading-relaxed font-light whitespace-pre-wrap">
                                        {event.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Creator */}
                        {event.createdBy && (
                            <div className="flex items-center gap-4 pt-4 mt-8 border-t border-white/5">
                                {event.createdBy.profileImage ? (
                                    <Image
                                        src={event.createdBy.profileImage}
                                        alt={event.createdBy.name}
                                        width={32}
                                        height={32}
                                        className="rounded-full ring-2 ring-black bg-neutral-800"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center ring-2 ring-black">
                                        <User className="h-4 w-4 text-neutral-400" />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold">Created by</span>
                                    <span className="text-sm text-neutral-300 font-medium">{event.createdBy.name}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 pb-8 flex items-center gap-4 justify-between bg-gradient-to-t from-black/40 to-transparent">
                    <Button
                        variant="ghost"
                        onClick={onDelete}
                        className="h-12 w-12 rounded-full bg-neutral-800/50 text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5 hover:border-red-500/20"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>

                    <Button
                        onClick={onEdit}
                        className="h-12 px-8 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95 text-base border-none"
                    >
                        <Pencil className="h-4 w-4 mr-2.5" />
                        {t('calendar.event.edit_btn')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
