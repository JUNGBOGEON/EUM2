import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type WhiteboardTool = 'select' | 'pan' | 'pen' | 'eraser' | 'shape' | 'magic-pen';

export interface WhiteboardItem {
    id: string;
    type: 'path' | 'image' | 'text' | 'shape';
    data: any;
    transform: {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
    };
    zIndex: number;
    isDeleted?: boolean;
}

interface WhiteboardState {
    // Tools & UI
    tool: WhiteboardTool;
    color: string;
    penSize: number;
    eraserSize: number;
    smoothness: number;
    setTool: (tool: WhiteboardTool) => void;
    setColor: (color: string) => void;
    setPenSize: (size: number) => void;
    setEraserSize: (size: number) => void;
    setSmoothness: (smoothness: number) => void;

    // Viewport
    zoom: number;
    pan: { x: number; y: number };
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;

    // Data
    items: Map<string, WhiteboardItem>;
    addItem: (item: WhiteboardItem) => void;
    updateItem: (id: string, updates: Partial<WhiteboardItem>) => void;
    deleteItem: (id: string) => void;
    setItems: (items: WhiteboardItem[]) => void;

    // Selection
    selectedIds: Set<string>;
    selectItem: (id: string, multi?: boolean) => void;
    deselectItem: (id: string) => void;
    clearSelection: () => void;

    // History
    canUndo: boolean;
    canRedo: boolean;
    undoStack: WhiteboardItem[][];
    redoStack: WhiteboardItem[][];
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    clearItems: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
    tool: 'pen',
    color: '#000000',
    penSize: 2,
    eraserSize: 20,
    smoothness: 7,
    setTool: (tool) => set({ tool }),
    setColor: (color) => set({ color }),
    setPenSize: (size) => set({ penSize: size }),
    setEraserSize: (size) => set({ eraserSize: size }),
    setSmoothness: (smoothness) => set({ smoothness }),

    zoom: 1,
    pan: { x: 0, y: 0 },
    setZoom: (zoom) => set({ zoom }),
    setPan: (x, y) => set({ pan: { x, y } }),

    items: new Map(),
    addItem: (item) => {
        get().pushHistory();
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
    clearItems: () => set({
        items: new Map(),
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false
    }),
}));
