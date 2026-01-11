import { useEffect } from 'react';
import { useAudioVideo, useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { useWhiteboardStore } from '../store';
import { RenderManager } from '../RenderManager';

const WHITEBOARD_TOPIC = 'whiteboard_event';

export function useWhiteboardSync(renderManager: RenderManager | null, onRefetch?: () => void) {
    const audioVideo = useAudioVideo();
    const meetingManager = useMeetingManager();
    const addItem = useWhiteboardStore((state) => state.addItem);
    const updateItem = useWhiteboardStore((state) => state.updateItem);

    // Get Local Attendee ID
    const localAttendeeId = meetingManager.meetingSession?.configuration.credentials?.attendeeId;

    useEffect(() => {
        if (!audioVideo || !renderManager) return;

        const observer = {
            onDataMessageReceived: (dataMessage: any) => {
                if (dataMessage.topic !== WHITEBOARD_TOPIC) return;

                const payload = JSON.parse(dataMessage.text());
                const { type, data, senderId } = payload;

                // Avoid self-processing (unless refetch? No, refetch originates from self usually to Tell others to refetch, but here we receive it)
                if (senderId === localAttendeeId) return;

                switch (type) {
                    case 'add_item':
                        addItem(data);
                        break;
                    case 'update_item':
                        updateItem(data.id, data.changes);
                        break;
                    case 'delete_item':
                        useWhiteboardStore.getState().deleteItem(data.id);
                        break;
                    case 'clear':
                        // When someone clears, clear local state
                        useWhiteboardStore.getState().clearItems();
                        break;
                    case 'cursor':
                        renderManager.updateRemoteCursor(senderId, data);
                        break;
                    case 'draw_batch':
                        renderManager.drawRemoteBatch(data);
                        break;
                    case 'refetch':
                        onRefetch?.();
                        break;
                }
            }
        };

        audioVideo.realtimeSubscribeToReceiveDataMessage(WHITEBOARD_TOPIC, observer.onDataMessageReceived);

        return () => {
            audioVideo.realtimeUnsubscribeFromReceiveDataMessage(WHITEBOARD_TOPIC);
        };
    }, [audioVideo, renderManager, addItem, updateItem, localAttendeeId]);

    const broadcastEvent = (type: string, data: any): boolean => {
        if (!audioVideo || !localAttendeeId) return false;
        const payload = {
            type,
            data,
            senderId: localAttendeeId,
            timestamp: Date.now()
        };
        try {
            const json = JSON.stringify(payload);
            if (json.length > 2048) {
                console.warn("Payload size exceeds 2KB limit, skipping broadcast", json.length);
                return false;
            }
            audioVideo.realtimeSendDataMessage(WHITEBOARD_TOPIC, json);
            return true;
        } catch (error) {
            console.warn("Failed to broadcast whiteboard event", error);
            return false;
        }
    };

    // Get Local Name (simple heuristic based on Chime convention or fallback)
    const localName = meetingManager.meetingSession?.configuration.credentials?.externalUserId?.split('#').pop() || 'User';

    const broadcastCursor = (x: number, y: number, tool: string) => {
        if (!audioVideo || !localAttendeeId) return;
        const payload = {
            type: 'cursor',
            data: { x, y, tool, name: localName },
            senderId: localAttendeeId,
            timestamp: Date.now()
        };
        try {
            audioVideo.realtimeSendDataMessage(WHITEBOARD_TOPIC, JSON.stringify(payload));
        } catch (error) {
            // Ignore cursor errors
        }
    };

    return { broadcastEvent, broadcastCursor };
}
