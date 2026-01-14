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

    // Merge and Sort Items
    const items: CommunicationItem[] = useMemo(() => {
        // Normalize to Relative Time (ms from start) for sorting
        // This ensures both Chat (Absolute) and Transcript (Relative) align on the same timeline 0

        const startTime = meetingStartTime || 0;
        const hasStartTime = !!meetingStartTime;

        const tItems: CommunicationItem[] = transcripts.map(t => ({
            type: 'transcript',
            data: t,
            timestamp: t.timestamp
        }));

        const mItems: CommunicationItem[] = messages.map(m => {
            // Fix: Ensure createdAt is treated as UTC
            let dateStr = typeof m.createdAt === 'string' ? m.createdAt : '';
            if (dateStr) {
                if (!dateStr.includes('T')) dateStr = dateStr.replace(' ', 'T');
                if (!dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr += 'Z';
            } else {
                dateStr = new Date(m.createdAt).toISOString();
            }
            const absoluteTime = new Date(dateStr).getTime();
            // If we have a start time, convert Chat to Relative.
            // If NOT, we can't reliably compare, but we'll try to keep them large (Absolute) and Transcripts small (Relative) -> Failing case.
            // So we MUST have a start time. Use createdAt of first message/transcript as fallback if needed? 
            // For now, assume startTime exists. If not, fallback to using absolute for both (converting transcript to absolute using Date.now - elapsed)

            let relativeTime = 0;
            if (hasStartTime) {
                // Clamp to 0 if negative
                relativeTime = Math.max(0, absoluteTime - startTime);
            } else {
                // Fallback: Use absolute time for sorting
                // Convert transcript to absolute: Date.now() - elapsed? No, that shifts.
                // We'll just leave them separated if no start time, but try to convert Chat to large numbers.
                // Wait, to MIX them, we need a common base.
                // Let's use Absolute Time for everything internally.
                // Transcript Absolute = startTime + elapsed.
                // Chat Absolute = createdAt.

                // If startTime is missing, Transcripts (0..30min) vs Chat (1700000..).
                // User wants integration.
                // If startTime is missing, we basically can't integrate purely history.
                // But assuming usually we have it.
                relativeTime = absoluteTime;
            }

            return {
                type: 'chat',
                data: m,
                timestamp: hasStartTime ? (absoluteTime - startTime) : absoluteTime
            };
        });

        // Re-map Transcripts to Absolute if missing start time?
        // Actually, if missing start time, Transcripts are 0..X. Chat is Huge.
        // We MUST rely on meetingStartTime.
        // If sorting by RELATIVE:
        // Transcript: t.timestamp (e.g. 5000ms)
        // Chat: createdAt - startTime (e.g. 14:00:05 - 14:00:00 = 5000ms)
        // This puts them on the same scale!

        return [...tItems, ...mItems].sort((a, b) => a.timestamp - b.timestamp);
    }, [transcripts, messages, meetingStartTime]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [items, autoScroll, containerRef]);

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
                            const targetLang = translation ? TRANSCRIPTION_LANGUAGES.find((l) => l.code === translation.targetLanguage) : undefined;

                            return (
                                <div key={`t-${t.id}`} className={`flex gap-3 ${t.isPartial ? 'opacity-60' : ''}`}>
                                    <div className="flex-shrink-0 mt-1">
                                        {speakerProfileImage ? (
                                            <Image src={speakerProfileImage} alt={speakerName} width={32} height={32} className="rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-xs text-blue-400 font-bold border border-blue-500/20">
                                                {speakerName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-blue-300">{speakerName}</span>
                                            <span className="text-[10px] text-white/40">{formatElapsedTime(t.timestamp)}</span>
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3 border-blue-500/30 text-blue-400 bg-blue-500/10">
                                                음성
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-white/90 leading-relaxed break-words">
                                            {t.text}
                                        </div>
                                        {translation && (
                                            <div className="text-sm text-emerald-300/90 leading-relaxed mt-1.5 p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                                <span className="text-[10px] text-emerald-500 mr-2 uppercase tracking-wide opacity-80">{targetLang?.code}</span>
                                                {translation.translatedText}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        } else {
                            const m = item.data;
                            const isMyMessage = false; // TODO: Check if it's my message (senderId === session.user.id) - pass userId prop
                            // Assuming translation logic for chat is similar: 
                            // messages contain 'translations' Map. We pick the one matching selectedLanguage.
                            const translatedText = m.translations?.[selectedLanguage];

                            return (
                                <div key={`c-${m.id}`} className="flex gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {m.senderProfileImage ? (
                                            <Image
                                                src={m.senderProfileImage}
                                                alt={m.senderName}
                                                width={32}
                                                height={32}
                                                className="rounded-full object-cover w-8 h-8"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs text-purple-400 font-bold border border-purple-500/20">
                                                {m.senderName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-purple-300">{m.senderName}</span>
                                            {/* Display Elapsed Time for Chat to match Transcripts */}
                                            <span className="text-[10px] text-white/40">{formatElapsedTime(item.timestamp)}</span>
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3 border-purple-500/30 text-purple-400 bg-purple-500/10">
                                                채팅
                                            </Badge>
                                        </div>
                                        <div className="text-sm bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/10 text-white/90 break-words relative group">
                                            {m.content}
                                            {/* Translate Icon/Indicator could go here */}
                                        </div>
                                        {translatedText && (
                                            <div className="text-sm text-emerald-300/90 leading-relaxed mt-1.5 p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                                <span className="text-[10px] text-emerald-500 mr-2 uppercase tracking-wide opacity-80">{selectedLanguage}</span>
                                                {translatedText}
                                            </div>
                                        )}
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
                                <div className="flex items-center gap-2 truncate">
                                    <span>{currentLang?.flag}</span>
                                    <span className="truncate">{currentLang?.name}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#252525] border-white/10 max-h-[200px]">
                                {TRANSCRIPTION_LANGUAGES.map((lang) => (
                                    <SelectItem
                                        key={lang.code}
                                        value={lang.code}
                                        className="text-white hover:bg-white/10 focus:bg-white/10 text-xs"
                                    >
                                        {lang.flag} {lang.name} ('{lang.code}')
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
