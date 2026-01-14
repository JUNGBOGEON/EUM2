import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../_lib/constants';
import type { UserInfo } from '../_lib/types';

export interface ChatMessage {
    id: string;
    content: string;
    senderId: string;
    channelId: string;
    createdAt: string;
    sender: UserInfo;
}

export interface Channel {
    id: string;
    name: string;
    workspaceId: string;
    type: string;
    createdAt: string;
}

export function useChat(workspaceId: string, userId: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Connect to Socket
    useEffect(() => {
        // API_URL is base URL (e.g. localhost:4000)
        const newSocket = io(`${API_URL}/chat`, {
            transports: ['websocket'],
            withCredentials: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to chat namespace');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Fetch Channels
    const fetchChannels = useCallback(async () => {
        if (!workspaceId) return;
        setIsLoadingChannels(true);
        try {
            const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/channels`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setChannels(data);
                // Set default channel if none selected and channels exist
                if (!activeChannelId && data.length > 0) {
                    setActiveChannelId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
        } finally {
            setIsLoadingChannels(false);
        }
    }, [workspaceId, activeChannelId]);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    // Fetch Messages and Join Room when activeChannelId changes
    useEffect(() => {
        if (!activeChannelId || !socket) return;

        // Join room
        socket.emit('join_channel', { channelId: activeChannelId });

        // Fetch history
        setIsLoadingMessages(true);
        fetch(`${API_URL}/api/channels/${activeChannelId}/messages?limit=50`, {
            credentials: 'include',
        })
            .then(res => res.json())
            .then(data => {
                setMessages(data);
                setIsLoadingMessages(false);
            })
            .catch(err => {
                console.error('Failed to fetch messages:', err);
                setIsLoadingMessages(false);
            });

        return () => {
            socket.emit('leave_channel', { channelId: activeChannelId });
        };
    }, [activeChannelId, socket]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: ChatMessage) => {
            if (message.channelId === activeChannelId) {
                setMessages(prev => [...prev, message]);
            }
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, activeChannelId]);

    // Actions
    const sendMessage = useCallback((content: string) => {
        console.log('[DEBUG] sendMessage called', { socket: !!socket, activeChannelId, content, userId });

        if (!socket) {
            console.error('[DEBUG] sendMessage failed: No socket connection');
            return;
        }
        if (!activeChannelId) {
            console.error('[DEBUG] sendMessage failed: No active channel');
            return;
        }
        if (!content.trim()) {
            console.warn('[DEBUG] sendMessage failed: Empty content');
            return;
        }

        socket.emit('send_message', {
            channelId: activeChannelId,
            content,
            senderId: userId,
        });
    }, [socket, activeChannelId, userId]);

    const createChannel = useCallback(async (name: string) => {
        try {
            const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                const newChannel = await res.json();
                setChannels(prev => [...prev, newChannel]);
                setActiveChannelId(newChannel.id); // Switch to new channel
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to create channel:', error);
            return false;
        }
    }, [workspaceId]);

    return {
        channels,
        activeChannelId,
        setActiveChannelId,
        messages,
        sendMessage,
        createChannel,
        isLoadingChannels,
        isLoadingMessages,
        refreshChannels: fetchChannels,
    };
}
