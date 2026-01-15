import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWhiteboardStore } from '../store';
import { RenderManager } from '../RenderManager';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useWhiteboardSync(
    renderManager: RenderManager | null,
    meetingId: string,
    onRefetch?: () => void,
    currentUser?: { id: string; name: string; profileImage?: string }
) {
    const socketRef = useRef<Socket | null>(null);
    const addItem = useWhiteboardStore((state) => state.addItem);
    const addRemoteItem = useWhiteboardStore((state) => state.addRemoteItem);
    const updateItem = useWhiteboardStore((state) => state.updateItem);
    const deleteItem = useWhiteboardStore((state) => state.deleteItem);
    const clearItems = useWhiteboardStore((state) => state.clearItems);
    // const params = useParams(); // Removed reliance on useParams inside hook
    // const meetingId = params.meetingId as string; // Passed as argument

    // STABLE LOCAL ID (Critical for ghosting/echo prevention)
    const localIdRef = useRef<string | null>(null);
    if (!localIdRef.current) {
        if (currentUser?.id) {
            localIdRef.current = currentUser.id;
        } else {
            // Try Storage for anonymous persistence across refreshes
            const stored = typeof window !== 'undefined' ? sessionStorage.getItem('wb_local_id') : null;
            if (stored) {
                localIdRef.current = stored;
            } else {
                const newId = 'anon-' + Math.random().toString(36).substr(2, 9);
                if (typeof window !== 'undefined') sessionStorage.setItem('wb_local_id', newId);
                localIdRef.current = newId;
            }
        }
    }
    const localId = localIdRef.current!;
    const localName = currentUser?.name || 'User';

    useEffect(() => {
        if (!renderManager) {
            console.log('[WhiteboardSync] Skipping connection: renderManager is null');
            return;
        }
        if (!meetingId) {
            console.log('[WhiteboardSync] Skipping connection: meetingId is null');
            return;
        }

        console.log('[WhiteboardSync] Initializing socket connection to namespace /whiteboard with meetingId:', meetingId);

        // Connect to Socket.io Gateway
        const socket = io(`${API_URL}/whiteboard`, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            autoConnect: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[WhiteboardSync] Connected to Gateway', socket.id);
            // Join Room
            socket.emit('join', { room: meetingId });
        });

        socket.on('connect_error', (err) => {
            console.error('[WhiteboardSync] Connection Error:', err.message);
        });

        // Event Listeners
        socket.on('add_item', (data: any) => {
            // Smart Filter:
            // 1. If it's another user -> Accept
            // 2. If it's ME (localId) BUT I don't have it locally (e.g. refresh/rejoin) -> Accept
            // 3. If it's ME and I HAVE it -> Ignore (Echo)
            const store = useWhiteboardStore.getState();
            if (data.senderId === localId && store.items.has(data.id)) {
                return;
            }

            // Clean up the draft lines for this user so we don't have double-draw
            if (renderManager && data.senderId) {
                renderManager.clearRemoteDrags(data.senderId);
            }

            console.log('[WhiteboardSync] Received add_item', data.id);
            addRemoteItem(data);
        });

        socket.on('update_item', (data: any) => {
            if (data.senderId === localId) return;
            // console.log('[WhiteboardSync] Received update_item', data.id);
            if (data.changes?.data?.erasures || data.data?.erasures) {
                console.log('[WhiteboardSync] Received Erasures for', data.id, data.changes || data);
            }
            // Clear remote drag graphics (eraser uses update_item for erasures)
            if (renderManager && data.senderId) {
                renderManager.clearRemoteDrags(data.senderId);
            }
            // Support both wrapped 'changes' (interaction) and direct updates (drawing/eraser)
            updateItem(data.id, data.changes || data);
        });

        socket.on('delete_item', (data: any) => {
            if (data.senderId === localId) return;
            // Clear remote drag graphics (eraser uses delete_item for full deletion)
            if (renderManager && data.senderId) {
                renderManager.clearRemoteDrags(data.senderId);
            }
            deleteItem(data.id);
        });

        socket.on('clear', (data: any) => {
            if (data.senderId === localId) return;
            clearItems();
        });

        socket.on('cursor', (data: any) => {
            // Data includes socketId probably, but we use data.senderId if sent
            // Remote cursor logic might rely on specific ID format
            // data should be { x, y, tool, name, avatar, senderId }
            if (data.senderId === localId) return;
            renderManager.updateRemoteCursor(data.senderId, data.x, data.y, data);
        });

        socket.on('draw_batch', (data: any) => {
            if (data.senderId === localId) return;
            renderManager.drawRemoteBatch(data);
        });

        socket.on('refetch', (data: any) => {
            if (data.senderId === localId) return;
            onRefetch?.();
        });

        socket.on('stroke_end', (data: any) => {
            if (data.senderId === localId) return;
            // Clear remote drag graphics when stroke ends without creating item
            if (renderManager && data.senderId) {
                renderManager.clearRemoteDrags(data.senderId);
            }
        });

        socket.on('user_left', (data: { socketId: string }) => {
            // We need to know which senderId maps to this socketId?
            // Or we assume the Gateway sends { senderId } if we tracked it?
            // Current Gateway sends { socketId }.
            // RenderManager tracks by `attendeeId` (which is senderId).
            // We don't have a map of socketId -> senderId here.
            // FIX: Gateway should send senderId? 
            // Or we just rely on the fact that we might not know.
            // Alternative: RenderManager clears ALL remote cursors on refresh? No.

            // Let's update Gateway to map socketId to senderId? Too complex for now.
            // Client sends `join` with no user info currently.
            // Let's change `join` to include `senderId`.

            // For now, let's use the loose coupling:
            // If the backend can't send senderId, we can't clear specific user.
            // BUT: `cursor` event sends `socketId` (appended by gateway).
            // We can map them in useWhiteboardSync.
            console.log("User left:", data.socketId);
            renderManager.removeRemoteUserBySocketId(data.socketId);
        });

        return () => {
            socket.emit('leave', { room: meetingId });
            socket.disconnect();
            console.log('[WhiteboardSync] Disconnected');
            socketRef.current = null;
        };
    }, [renderManager, meetingId, addItem, updateItem, deleteItem, clearItems, onRefetch, localId]);

    const broadcastEvent = (type: string, data: any): boolean => {
        if (!socketRef.current) return false;

        // Add senderId, userId, and meetingId to payload
        // senderId for logic, userId for database entity
        const payload = { ...data, senderId: localId, userId: localId, meetingId };

        // Emit directly to Gateway
        // Gateway expects specific events, not a generic 'event' with type
        // Mapping types to Gateway events:
        switch (type) {
            case 'add_item':
                socketRef.current.emit('add_item', payload);
                break;
            case 'update_item':
                socketRef.current.emit('update_item', payload);
                break;
            case 'delete_item':
                socketRef.current.emit('delete_item', payload);
                break;
            case 'clear':
                socketRef.current.emit('clear', payload);
                break;
            case 'draw_batch':
                socketRef.current.emit('draw_batch', payload);
                break;
            case 'refetch':
                socketRef.current.emit('refetch', payload);
                break;
            case 'stroke_end':
                socketRef.current.emit('stroke_end', payload);
                break;
            default:
                console.warn('[WhiteboardSync] Unknown event type:', type);
                return false;
        }
        return true;
    };

    const broadcastCursor = (x: number, y: number, tool: string) => {
        if (!socketRef.current) return;

        const payload = {
            x,
            y,
            tool,
            name: localName,
            avatar: currentUser?.profileImage,
            senderId: localId
        };
        socketRef.current.emit('cursor', payload);
    };

    return { broadcastEvent, broadcastCursor };
}
