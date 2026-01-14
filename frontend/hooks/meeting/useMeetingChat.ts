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
}

export function useMeetingChat(meetingId: string, currentUser?: { id: string; name?: string | null }) {

    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<MeetingChatMessage[]>([]);

    // Initial fetch of chat history
    useEffect(() => {
        if (!meetingId) return;

        const fetchMessages = async () => {
            try {
                // Assuming apiClient or fetch is available
                // We use standard fetch here to avoid circular deps if apiClient is complex, 
                // but ideally use the project's apiClient.
                // Let's use the local fetch with credentials since we are inside a component.
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/meetings/${meetingId}/chat/messages`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setMessages(data);
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
            setMessages((prev) => {
                // Prevent duplicates
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        };

        socket.on('meeting-chat:new_message', handleNewMessage);

        return () => {
            socket.off('meeting-chat:new_message', handleNewMessage);
        };
    }, [socket, isConnected, meetingId]);

    // Debug logging
    useEffect(() => {
        console.log('[useMeetingChat] Hook State:', {
            meetingId,
            isConnected,
            socketId: socket?.id,
            hasCurrentUser: !!currentUser,
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name
        });
    }, [meetingId, isConnected, socket, currentUser]);

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
