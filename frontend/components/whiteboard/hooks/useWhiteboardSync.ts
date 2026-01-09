import { useEffect } from 'react';
import { useAudioVideo, useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { useWhiteboardStore } from '../store';
import { RenderManager } from '../RenderManager';

const WHITEBOARD_TOPIC = 'whiteboard_event';

export function useWhiteboardSync(renderManager: RenderManager | null) {
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

                // Avoid self-processing
                if (senderId === localAttendeeId) return;

                switch (type) {
                    case 'add_item':
                        addItem(data);
                        break;
                    case 'update_item':
                        updateItem(data.id, data.changes);
                        break;
                    case 'clear':
                        // When someone clears, clear local state
                        useWhiteboardStore.getState().clearItems();
                        break;
                    case 'cursor':
                        renderManager.updateRemoteCursor(senderId, data);
                        break;
                }
            }
        };

        audioVideo.realtimeSubscribeToReceiveDataMessage(WHITEBOARD_TOPIC, observer.onDataMessageReceived);

        return () => {
            audioVideo.realtimeUnsubscribeFromReceiveDataMessage(WHITEBOARD_TOPIC);
        };
    }, [audioVideo, renderManager, addItem, updateItem, localAttendeeId]);

    const broadcastEvent = (type: string, data: any) => {
        if (!audioVideo || !localAttendeeId) return;
        const payload = {
            type,
            data,
            senderId: localAttendeeId,
            timestamp: Date.now()
        };
        audioVideo.realtimeSendDataMessage(WHITEBOARD_TOPIC, JSON.stringify(payload));
    };

    const broadcastCursor = (x: number, y: number, tool: string) => {
        if (!audioVideo || !localAttendeeId) return;
        const payload = {
            type: 'cursor',
            data: { x, y, tool },
            senderId: localAttendeeId,
            timestamp: Date.now()
        };
        audioVideo.realtimeSendDataMessage(WHITEBOARD_TOPIC, JSON.stringify(payload));
    };

    return { broadcastEvent, broadcastCursor };
}
