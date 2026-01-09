export interface Point {
    x: number;
    y: number;
}

export interface DrawEvent {
    x: number;
    y: number;
    // prevX/prevY might be redundant if we store full path, but keeping for compatibility
    prevX?: number;
    prevY?: number;
    color: number;
    width: number;
}
