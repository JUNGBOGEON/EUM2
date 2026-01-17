'use client';

import { RefObject, useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { Languages, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatElapsedTime } from '@/lib/utils/time';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/constants/languages';
import type { TranscriptItem, TranslatedTranscript } from '@/lib/types';
import type { MeetingChatMessage } from '@/hooks/meeting/useMeetingChat';

interface CommunicationPanelProps {
    transcripts: TranscriptItem[];
    messages: MeetingChatMessage[];
    isTranscribing: boolean;
    isLoadingHistory: boolean;
    selectedLanguage: string;
    isChangingLanguage: boolean;
    onLanguageChange: (languageCode: string) => void;
    containerRef: RefObject<HTMLDivElement | null>;
    getParticipantByAttendeeId?: (attendeeId: string) => { name: string; profileImage?: string };
    // Translation
    translationEnabled?: boolean;
    getTranslation?: (resultId: string) => TranslatedTranscript | undefined;
    // Chat Actions
    onSendMessage: (content: string) => void;
    meetingStartTime?: number | null;
}

type CommunicationItem =
    | { type: 'transcript'; data: TranscriptItem; timestamp: number }
    | { type: 'chat'; data: MeetingChatMessage; timestamp: number };

export function CommunicationPanel({
    transcripts,
    messages,
    isTranscribing,
    isLoadingHistory,
    selectedLanguage,
    isChangingLanguage,
    onLanguageChange,
    containerRef,
    getParticipantByAttendeeId,
    translationEnabled = false,
    getTranslation,
    onSendMessage,
    meetingStartTime,
}: CommunicationPanelProps) {
    useEffect(() => {
        console.log('[CommunicationPanel] Props:', {
            selectedLanguage,
            isChangingLanguage,
            translationEnabled,
            messageCount: messages.length,
            meetingStartTime
        });
    }, [selectedLanguage, isChangingLanguage, translationEnabled, messages.length, meetingStartTime]);

    const currentLang = TRANSCRIPTION_LANGUAGES.find((l) => l.code === selectedLanguage);
    const [chatInput, setChatInput] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);

    // Merge and Sort Items - All items sorted by timestamp for stable ordering
    const items: CommunicationItem[] = useMemo(() => {
        // All transcripts: use t.timestamp directly
        const tItems: CommunicationItem[] = transcripts.map(t => ({
            type: 'transcript',
            data: t,
            timestamp: t.timestamp
        }));

        // Chat: use elapsedTime if available (set when message received)
        // For history messages without elapsedTime, calculate from createdAt
        const mItems: CommunicationItem[] = messages.map(m => {
            let timestamp: number;

            if (typeof m.elapsedTime === 'number') {
                // Real-time message: use pre-calculated elapsedTime
                timestamp = m.elapsedTime;
            } else if (meetingStartTime) {
                // History message: try to calculate from createdAt
                try {
                    let dateStr = typeof m.createdAt === 'string' ? m.createdAt : '';
                    if (dateStr && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                        if (!dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T');
                        dateStr += 'Z';
                    }
                    const msgTime = dateStr ? new Date(dateStr).getTime() : new Date(m.createdAt).getTime();
                    timestamp = Math.max(0, msgTime - meetingStartTime);
                } catch {
                    timestamp = 0;
                }
            } else {
                // Fallback: no meetingStartTime, use 0
                timestamp = 0;
            }

            return {
                type: 'chat',
                data: m,
                timestamp
            };
        });

        // Sort all items by timestamp - stable sort keeps same-timestamp items in order
        return [...tItems, ...mItems].sort((a, b) => a.timestamp - b.timestamp);
    }, [transcripts, messages, meetingStartTime]);

    // Auto-scroll with smooth behavior
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
            });
        }
    }, [items, autoScroll]);

    // Handle scroll to toggle auto-scroll
    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setAutoScroll(isAtBottom);
    };

    const handleSend = () => {
        if (!chatInput.trim()) return;
        onSendMessage(chatInput);
        setChatInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-[360px] flex-shrink-0 flex flex-col bg-[#1f1f1f] border-l border-white/10 h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                        <Languages className="w-4 h-4 text-blue-400" />
                        통합 커뮤니케이션
                    </h2>
                    {isTranscribing && (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-none ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                            Live
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-4 space-y-6"
            >
                {isLoadingHistory ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-20 bg-white/10" />
                                    <Skeleton className="h-10 w-full bg-white/10 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Languages className="h-8 w-8 text-white/30" />
                        </div>
                        <p className="text-white/50 text-sm">
                            대화를 시작해보세요!
                        </p>
                    </div>
                ) : (
                    items.map((item) => {
                        if (item.type === 'transcript') {
                            const t = item.data;
                            const dynamicSpeaker = t.speakerId ? getParticipantByAttendeeId?.(t.speakerId) : undefined;
                            const speakerName = dynamicSpeaker?.name || t.speakerName;
                            const speakerProfileImage = dynamicSpeaker?.profileImage || t.speakerProfileImage;

                            const translation = translationEnabled && getTranslation ? getTranslation(t.id) : undefined;

                            return (
                                <div key={`t-${t.id}`} className={`py-1 ${t.isPartial ? 'opacity-40' : ''}`}>
                                    <div className="flex items-start gap-2.5">
                                        {speakerProfileImage ? (
                                            <Image src={speakerProfileImage} alt={speakerName} width={28} height={28} className="rounded-full flex-shrink-0" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 font-medium flex-shrink-0">
                                                {speakerName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[11px] font-medium text-white/70">{speakerName}</span>
                                                <span className="text-[10px] text-white/25">{formatElapsedTime(t.timestamp)}</span>
                                            </div>
                                            <p className="text-[13px] text-white/90 leading-snug">{t.text}</p>
                                            {translation && (
                                                <p className="mt-0.5 text-[12px] text-white/40 leading-snug">{translation.translatedText}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        } else {
                            const m = item.data;
                            const translatedText = m.translations?.[selectedLanguage];

                            return (
                                <div key={`c-${m.id}`} className="py-1">
                                    <div className="flex items-start gap-2.5">
                                        {m.senderProfileImage ? (
                                            <Image src={m.senderProfileImage} alt={m.senderName} width={28} height={28} className="rounded-full flex-shrink-0" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 font-medium flex-shrink-0">
                                                {m.senderName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[11px] font-medium text-white/70">{m.senderName}</span>
                                                <span className="text-[10px] text-white/25">{formatElapsedTime(item.timestamp)}</span>
                                            </div>
                                            <p className="text-[13px] text-white/90 leading-snug px-2.5 py-1.5 bg-white/[0.04] rounded-lg inline-block">{m.content}</p>
                                            {translatedText && (
                                                <p className="mt-0.5 text-[12px] text-white/40 leading-snug pl-2.5">{translatedText}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#1a1a1a] border-t border-white/10 flex-shrink-0">
                <div className="relative flex items-center gap-2">
                    <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="메시지를 입력하세요 (Enter로 전송)"
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 pr-10"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSend}
                        disabled={!chatInput.trim()}
                        className="absolute right-1 w-8 h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Footer: Language Selector */}
            <div className="p-3 border-t border-white/10 bg-[#151515]">
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] text-white/40 whitespace-nowrap">번역 언어</span>
                        <Select
                            value={selectedLanguage}
                            onValueChange={onLanguageChange}
                            disabled={isChangingLanguage}
                        >
                            <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white text-xs w-full">
                                <SelectValue placeholder="언어 선택" />
                            </SelectTrigger>
                            <SelectContent
                                className="bg-[#252525] border-white/10 max-h-[200px]"
                                position="popper"
                                sideOffset={5}
                            >
                                {TRANSCRIPTION_LANGUAGES.map((lang) => (
                                    <SelectItem
                                        key={lang.code}
                                        value={lang.code}
                                        className="text-white hover:bg-white/10 focus:bg-white/10 text-xs"
                                    >
                                        {lang.flag} {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isChangingLanguage ? (
                        <Loader2 className="h-3 w-3 animate-spin text-white/50 flex-shrink-0" />
                    ) : (
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${translationEnabled ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                    )}
                </div>
            </div>
        </div>
    );
}
