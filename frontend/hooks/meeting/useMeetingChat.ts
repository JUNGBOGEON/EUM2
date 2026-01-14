'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';


export interface MeetingChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderProfileImage?: string;
    content: string;
    sourceLanguage: string;
    translations: Record<string, string>;
    createdAt: string;
    // New: Elapsed time in ms from meeting start (for unified timeline)
    elapsedTime?: number;
}

interface UseMeetingChatOptions {
    meetingId: string;
    currentUser?: { id: string; name?: string | null };
    meetingStartTime?: number | null; // Epoch ms of when meeting started
}

export function useMeetingChat({ meetingId, currentUser, meetingStartTime }: UseMeetingChatOptions) {

    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<MeetingChatMessage[]>([]);

    // Helper: Calculate elapsed time from meeting start
    const calculateElapsedTime = useCallback(() => {
        if (!meetingStartTime) return 0;
        return Math.max(0, Date.now() - meetingStartTime);
    }, [meetingStartTime]);

    // Initial fetch of chat history
    useEffect(() => {
        if (!meetingId) return;

        const fetchMessages = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/meetings/${meetingId}/chat/messages`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        // For history messages, use elapsedTime from server if available
                        // Otherwise calculate based on createdAt (fallback)
                        setMessages(data.map((m: MeetingChatMessage) => ({
                            ...m,
                            // If server provides elapsedTime, use it; otherwise leave undefined
                            elapsedTime: m.elapsedTime ?? undefined
                        })));
                    }
                }
            } catch (error) {
                console.error('[useMeetingChat] Failed to fetch history:', error);
            }
        };

        fetchMessages();

    }, [meetingId]);

    // Join chat room based on socket connection
    useEffect(() => {
        if (!socket || !isConnected || !meetingId) return;

        socket.emit('meeting-chat:join_meeting', { meetingId });

        // Listen for new messages
        const handleNewMessage = (message: MeetingChatMessage) => {
            // Calculate elapsed time at the moment we receive the message
            const elapsedTime = calculateElapsedTime();

            setMessages((prev) => {
                // Prevent duplicates
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, { ...message, elapsedTime }];
            });
        };

        socket.on('meeting-chat:new_message', handleNewMessage);

        return () => {
            socket.off('meeting-chat:new_message', handleNewMessage);
        };
    }, [socket, isConnected, meetingId, calculateElapsedTime]);

    // Debug logging
    useEffect(() => {
        console.log('[useMeetingChat] Hook State:', {
            meetingId,
            isConnected,
            socketId: socket?.id,
            hasCurrentUser: !!currentUser,
            meetingStartTime
        });
    }, [meetingId, isConnected, socket, currentUser, meetingStartTime]);

    const sendMessage = useCallback((content: string, sourceLanguage: string) => {
        console.log('[useMeetingChat] sendMessage called:', { content, sourceLanguage, currentUser });

        if (!socket || !isConnected || !meetingId || !currentUser?.id) {
            console.warn('[useMeetingChat] Cannot send message - missing requirements:', {
                hasSocket: !!socket,
                isConnected,
                hasMeetingId: !!meetingId,
                hasUserId: !!currentUser?.id
            });
            return;
        }

        const payload = {
            meetingId,
            content,
            senderId: currentUser.id,
            senderName: currentUser.name || 'Unknown',
            sourceLanguage,
        };
        console.log('[useMeetingChat] Emitting event:', payload);

        socket.emit('meeting-chat:send_message', payload);
    }, [socket, isConnected, meetingId, currentUser]);

    return {
        messages,
        sendMessage,
    };
}
