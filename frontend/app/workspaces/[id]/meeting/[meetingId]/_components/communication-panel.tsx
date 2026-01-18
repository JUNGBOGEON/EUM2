'use client';

import { RefObject, useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { Languages, Loader2, Send } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // IME 입력 중(한국어 조합 중)에는 Enter 무시
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-96 flex-shrink-0 flex flex-col bg-black border-l border-neutral-800 h-full">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-medium tracking-tight flex items-center gap-2">
                        <Languages className="w-4 h-4 text-neutral-400" />
                        커뮤니케이션
                    </h2>
                    {isTranscribing && (
                        <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
                            <span className="w-1.5 h-1.5 bg-white" />
                            LIVE
                        </div>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent px-5 py-4 space-y-5"
            >
                {isLoadingHistory ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-8 w-8 bg-neutral-900" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-24 bg-neutral-900" />
                                    <Skeleton className="h-12 w-full bg-neutral-900" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                        <div className="w-16 h-16 bg-neutral-900 flex items-center justify-center mb-4">
                            <Languages className="h-8 w-8 text-neutral-700" />
                        </div>
                        <p className="text-neutral-600 text-sm">
                            대화를 시작하세요
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
                                    <div className="flex items-start gap-3">
                                        {speakerProfileImage ? (
                                            <Image src={speakerProfileImage} alt={speakerName} width={32} height={32} className="flex-shrink-0 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-xs text-neutral-500 font-medium flex-shrink-0 rounded-full">
                                                {speakerName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-neutral-400">{speakerName}</span>
                                                <span className="text-xs font-mono text-neutral-700">{formatElapsedTime(t.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-white leading-relaxed">{t.text}</p>
                                            {translation && (
                                                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{translation.translatedText}</p>
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
                                    <div className="flex items-start gap-3">
                                        {m.senderProfileImage ? (
                                            <Image src={m.senderProfileImage} alt={m.senderName} width={32} height={32} className="flex-shrink-0 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-xs text-neutral-500 font-medium flex-shrink-0 rounded-full">
                                                {m.senderName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-neutral-400">{m.senderName}</span>
                                                <span className="text-xs font-mono text-neutral-700">{formatElapsedTime(item.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-white leading-relaxed px-3 py-2 bg-neutral-900 inline-block">{m.content}</p>
                                            {translatedText && (
                                                <p className="mt-1 text-xs text-neutral-500 leading-relaxed pl-3">{translatedText}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })
                )}
            </div>

            {/* Combined Input & Language Area */}
            <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 flex-shrink-0 space-y-2">
                {/* Language Selector Row */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Languages className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        <Select
                            value={selectedLanguage}
                            onValueChange={onLanguageChange}
                            disabled={isChangingLanguage}
                        >
                            <SelectTrigger className="h-7 bg-neutral-900/80 border-neutral-800 text-white text-xs rounded-md flex-1 max-w-[140px]">
                                <SelectValue placeholder="언어 선택" />
                            </SelectTrigger>
                            <SelectContent
                                className="bg-neutral-900/95 backdrop-blur-xl border-neutral-700 max-h-[200px] rounded-lg"
                                position="popper"
                                sideOffset={5}
                            >
                                {TRANSCRIPTION_LANGUAGES.map((lang) => (
                                    <SelectItem
                                        key={lang.code}
                                        value={lang.code}
                                        className="text-white hover:bg-white/10 focus:bg-white/10 text-xs rounded-md"
                                    >
                                        {lang.flag} {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isChangingLanguage ? (
                            <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
                        ) : (
                            <div className={`w-1.5 h-1.5 rounded-full ${translationEnabled ? 'bg-green-500' : 'bg-neutral-600'}`} />
                        )}
                        <span className="text-[10px] text-neutral-500 font-mono">
                            {translationEnabled ? '번역 ON' : '번역 OFF'}
                        </span>
                    </div>
                </div>

                {/* Message Input Row */}
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="메시지 입력..."
                        autoComplete="off"
                        className="flex-1 h-10 px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 pr-11 transition-all"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSend}
                        disabled={!chatInput.trim()}
                        className="absolute right-1 w-8 h-8 rounded-md text-neutral-400 hover:text-white hover:bg-blue-500/20 disabled:text-neutral-700 disabled:hover:bg-transparent transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
