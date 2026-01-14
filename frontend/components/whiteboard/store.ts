import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type WhiteboardTool = 'select' | 'pan' | 'pen' | 'eraser' | 'shape' | 'magic-pen' | 'image' | 'text' | 'postit';

export interface PendingImage {
    url: string;
    width: number;
    height: number;
    file?: File; // The raw file to upload
}

export interface WhiteboardItem {
    id: string;
    type: 'path' | 'image' | 'text' | 'shape' | 'postit';
    data: any;
    parentId?: string; // For objects inside a Post-it
    transform: {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
    };
    zIndex: number;
    isDeleted?: boolean;
    meetingId?: string;
    userId?: string;
}

interface WhiteboardState {
    // Tools & UI
    tool: WhiteboardTool;
    color: string;
    penColor: string;
    magicPenColor: string;
    penSize: number;
    eraserSize: number;
    smoothness: number;
    setTool: (tool: WhiteboardTool) => void;
    setColor: (color: string) => void;
    setPenSize: (size: number) => void;
    setEraserSize: (size: number) => void;

    setSmoothness: (smoothness: number) => void;

    // Session Context
    meetingId: string | null;
    setMeetingId: (id: string | null) => void;

    // Viewport
    zoom: number;
    pan: { x: number; y: number };
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;

    // Image Placement
    pendingImage: PendingImage | null;
    setPendingImage: (image: PendingImage | null) => void;

    // Data
    items: Map<string, WhiteboardItem>;
    addItem: (item: WhiteboardItem) => void;
    addRemoteItem: (item: WhiteboardItem) => void;
    updateItem: (id: string, updates: Partial<WhiteboardItem>) => void;
    deleteItem: (id: string) => void;
    setItems: (items: WhiteboardItem[]) => void;

    // Selection
    selectedIds: Set<string>;
    selectItem: (id: string, multi?: boolean) => void;
    deselectItem: (id: string) => void;
    clearSelection: () => void;
    setSelectedIds: (ids: Set<string>) => void;

    // History
    canUndo: boolean;
    canRedo: boolean;
    undoStack: WhiteboardItem[][];
    redoStack: WhiteboardItem[][];
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    syncHistoryForUndo: () => void;
    syncHistoryForRedo: () => void;
    clearItems: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
    tool: 'pen',
    color: '#000000',
    penColor: '#000000',
    magicPenColor: '#000000',
    penSize: 2,
    eraserSize: 20,
    smoothness: 7,
    setTool: (tool) => set((state) => {
        let newColor = state.color;
        if (tool === 'pen') {
            newColor = state.penColor;
        } else if (tool === 'magic-pen') {
            newColor = state.magicPenColor;
        }

        // Clear selection when switching away from select tool, or even to it (optional, but standard behavior is usually keep if switching TO select, lose if switching AWAY)
        // User asked: "Select different tool -> Selection cancelled".
        // So if I switch TO Pen, selection clears.
        // If I switch TO Select, selection logic shouldn't inherently clear, but usually you switch TO Select to start fresh or modify existing.
        // Let's safe bet: If newTool !== 'select', clear selection.
        const newSelectedIds = (tool !== 'select') ? new Set<string>() : state.selectedIds;

        return { tool, color: newColor, selectedIds: newSelectedIds };
    }),
    setColor: (color) => set((state) => {
        const updates: Partial<WhiteboardState> = { color };
        if (state.tool === 'pen') {
            updates.penColor = color;
        } else if (state.tool === 'magic-pen') {
            updates.magicPenColor = color;
        }
        return updates;
    }),
    setPenSize: (size) => set({ penSize: size }),
    setEraserSize: (size) => set({ eraserSize: size }),
    setSmoothness: (smoothness) => set({ smoothness }),

    meetingId: null,
    setMeetingId: (id) => set({ meetingId: id }),

    zoom: 1,
    pan: { x: 0, y: 0 },
    setZoom: (zoom) => set({ zoom }),
    setPan: (x, y) => set({ pan: { x, y } }),

    pendingImage: null,
    setPendingImage: (image) => set({ pendingImage: image }),

    items: new Map(),
    addItem: (item) => {
        get().pushHistory();
        set((state) => {
            const newItems = new Map(state.items);
            // Enforce meetingId from current session if missing
            if (!item.meetingId && state.meetingId) {
                item.meetingId = state.meetingId;
            } else if (!item.meetingId) {
                console.warn('[Store] addItem called without meetingId and no active session meetingId');
                item.meetingId = 'default';
            }

            newItems.set(item.id, item);
            return { items: newItems };
        });
    },
    addRemoteItem: (item) => {
        // Same as addItem but NO history push (for socket events/history load)
        set((state) => {
            const newItems = new Map(state.items);
            newItems.set(item.id, item);
            return { items: newItems };
        });
    },
    updateItem: (id, updates) =>
        set((state) => {
            const newItems = new Map(state.items);
            const item = newItems.get(id);
            if (item) {
                newItems.set(id, { ...item, ...updates });
            }
            return { items: newItems };
        }),
    deleteItem: (id) => {
        get().pushHistory();
        set((state) => {
            const newItems = new Map(state.items);
            const itemToDelete = newItems.get(id);

            // If deleting a Post-it, also delete all child items
            if (itemToDelete?.type === 'postit') {
                const childIds: string[] = [];
                newItems.forEach((item, itemId) => {
                    if (item.parentId === id) {
                        childIds.push(itemId);
                    }
                });
                childIds.forEach(childId => newItems.delete(childId));
            }

            newItems.delete(id);
            return { items: newItems };
        });
    },
    setItems: (items) => {
        const newItems = new Map();
        items.forEach((item) => newItems.set(item.id, item));
        set({ items: newItems });
    },

    selectedIds: new Set<string>(),
    selectItem: (id, multi) =>
        set((state) => {
            const newSelection = multi ? new Set(state.selectedIds) : new Set<string>();
            newSelection.add(id);
            return { selectedIds: newSelection };
        }),
    deselectItem: (id) =>
        set((state) => {
            const newSelection = new Set(state.selectedIds);
            newSelection.delete(id);
            return { selectedIds: newSelection };
        }),
    clearSelection: () => set({ selectedIds: new Set<string>() }),
    setSelectedIds: (ids) => set({ selectedIds: ids }),

    canUndo: false,
    canRedo: false,
    undoStack: [],
    redoStack: [],
    pushHistory: () => {
        const currentItems = Array.from(get().items.values());
        set((state) => ({
            undoStack: [...state.undoStack, currentItems].slice(-50), // Limit history
            redoStack: [],
            canUndo: true,
            canRedo: false
        }));
    },
    undo: () => set((state) => {
        if (state.undoStack.length === 0) return state;
        const currentItems = Array.from(state.items.values());
        const previousItems = state.undoStack[state.undoStack.length - 1];
        const newUndoStack = state.undoStack.slice(0, -1);

        const newItems = new Map();
        previousItems.forEach(item => newItems.set(item.id, item));

        return {
            items: newItems,
            undoStack: newUndoStack,
            redoStack: [...state.redoStack, currentItems],
            canUndo: newUndoStack.length > 0,
            canRedo: true
        };
    }),
    redo: () => set((state) => {
        if (state.redoStack.length === 0) return state;
        const currentItems = Array.from(state.items.values());
        const nextItems = state.redoStack[state.redoStack.length - 1];
        const newRedoStack = state.redoStack.slice(0, -1);

        const newItems = new Map();
        nextItems.forEach(item => newItems.set(item.id, item));

        return {
            items: newItems,
            undoStack: [...state.undoStack, currentItems],
            redoStack: newRedoStack,
            canUndo: true,
            canRedo: newRedoStack.length > 0
        };
    }),
    // Helper to sync history stacks when Server handles the Undo/Redo data logic
    syncHistoryForUndo: () => set((state) => {
        if (state.undoStack.length === 0) return state;
        // Move current state to Redo, pop Undo, but DO NOT restore items (Server did it)
        const currentItems = Array.from(state.items.values());
        const newUndoStack = state.undoStack.slice(0, -1);
        return {
            undoStack: newUndoStack,
            redoStack: [...state.redoStack, currentItems],
            canUndo: newUndoStack.length > 0,
            canRedo: true
        };
    }),
    syncHistoryForRedo: () => set((state) => {
        if (state.redoStack.length === 0) return state;
        // Move current state to Undo, pop Redo
        const currentItems = Array.from(state.items.values());
        const newRedoStack = state.redoStack.slice(0, -1);
        return {
            undoStack: [...state.undoStack, currentItems],
            redoStack: newRedoStack,
            canUndo: true,
            canRedo: newRedoStack.length > 0
        };
    }),
    clearItems: () => set({
        items: new Map(),
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false
    }),
}));
