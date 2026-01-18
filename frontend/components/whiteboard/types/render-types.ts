import * as PIXI from 'pixi.js';
import { QuadTree, Rect } from '../utils/QuadTree';
import { WhiteboardItem } from '../store';

/**
 * Shared context for all render managers
 */
export interface RenderContext {
    app: PIXI.Application;
    layers: RenderLayers;
    quadTree: QuadTree<WhiteboardItem & { getBounds: () => Rect }>;
    zoom: number;
    dimensions: { width: number; height: number };
    iconTextures: Map<string, PIXI.Texture>;
    initialized: boolean;
}

/**
 * All PixiJS layer containers
 */
export interface RenderLayers {
    static: PIXI.Container;
    dynamic: PIXI.Container;
    drawing: PIXI.Container;
    selection: PIXI.Container;
    drag: PIXI.Container;
    ghost: PIXI.Container;
    effect: PIXI.Container;
    cursor: PIXI.Container;
}

/**
 * Selection box override for drag operations
 */
export interface SelectionOverride {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rotation: number;
}

/**
 * Effect object for animation system
 */
export interface Effect {
    update: (dt: number) => boolean;
}

/**
 * Remote cursor user info
 */
export interface RemoteCursorUser {
    name?: string;
    color?: string;
    avatar?: string;
    tool?: string;
    socketId?: string;
}

/**
 * Remote drawing batch data
 */
export interface DrawBatchData {
    senderId: string;
    points: { x: number; y: number }[];
    color: number;
    width: number;
    tool: string;
    isNewStroke?: boolean;
}

/**
 * Cursor visuals container with metadata
 */
export interface CursorVisuals {
    container: PIXI.Container;
    badge: PIXI.Container;
    arrow: PIXI.Graphics;
    bg: PIXI.Graphics;
    nameText: PIXI.Text;
}

/**
 * Ghost render types
 */
export type GhostType = 'image' | 'postit' | 'stamp' | null;

/**
 * Ghost render data
 */
export interface GhostData {
    url?: string;
    stampType?: string;
}

/**
 * Color palette for remote users
 */
export const USER_COLOR_PALETTE = [
    0xFF5733, 0x33FF57, 0x3357FF, 0xF333FF, 0x33FFF6,
    0xFF33A1, 0xFF8C33, 0x8C33FF, 0x33FF8C, 0xFFC733,
    0x581845, 0x900C3F, 0xC70039, 0xFF5733, 0xFFC300
];

/**
 * SVG tool icons (Base64 encoded)
 */
export const RAW_ICONS: Record<string, string> = {
    select: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 10.5H5.375M2.25 12h2.25m9.472 0h.008v.008H13.972V12zm0-4.5h.008v.008H13.972V7.5zm0 9h.008v.008H13.972V16.5z" /></svg>`,
    pan: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>`,
    pen: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>`,
    'magic-pen': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 5.5l-.5.5M15 4l4 4M4.5 19.5l7-7M17.5 13.5l1 1M14 10l-6.5 6.5a2.121 2.121 0 003 3L17 13M4 4l2 2m0-2l-2 2M7 2h.01M2 7h.01" /></svg>`,
    eraser: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16 8l-6 6" /></svg>`,
    image: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    shape: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>`,
    text: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 6h14M12 6v13m-3 0h6" /></svg>`
};

/**
 * Convert SVG string to Base64 data URI
 */
export const svgToBase64 = (svg: string): string =>
    `data:image/svg+xml;base64,${btoa(svg)}`;

/**
 * Pre-encoded SVG icons
 */
export const SVG_ICONS: Record<string, string> = Object.fromEntries(
    Object.entries(RAW_ICONS).map(([k, v]) => [k, svgToBase64(v)])
);

/**
 * Re-export Rect for convenience
 */
export type { Rect } from '../utils/QuadTree';
