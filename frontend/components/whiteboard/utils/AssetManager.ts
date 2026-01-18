import * as PIXI from 'pixi.js';
import { STAMP_ICONS, STAMP_PATHS, STAMP_COLORS } from './stampAssets';
import { SVG_ICONS, svgToBase64 } from '../types/render-types';

/**
 * Manages loading and caching of textures and icons for the whiteboard
 */
export class AssetManager {
    private iconTextures: Map<string, PIXI.Texture> = new Map();
    private loadingPromises: Map<string, Promise<PIXI.Texture>> = new Map();

    /**
     * Get the icon textures map
     */
    get textures(): Map<string, PIXI.Texture> {
        return this.iconTextures;
    }

    /**
     * Preload all icons and stamps
     */
    async preloadAll(): Promise<void> {
        const promises: Promise<void>[] = [];

        // Preload PNG stamp icons
        promises.push(this.preloadStampIcons());

        // Preload SVG tool icons
        promises.push(this.preloadSvgIcons());

        // Preload SVG stamp paths
        promises.push(this.preloadStampPaths());

        await Promise.allSettled(promises);
    }

    /**
     * Preload PNG stamp icons from STAMP_ICONS
     */
    private async preloadStampIcons(): Promise<void> {
        const promises = Object.entries(STAMP_ICONS).map(async ([key, url]) => {
            const cacheKey = `stamp-${key}`;
            try {
                const tex = await PIXI.Assets.load({ src: url });
                this.iconTextures.set(cacheKey, tex);
                console.log(`[AssetManager] Loaded stamp icon: ${key}`);
            } catch (err) {
                console.warn(`[AssetManager] Failed to load stamp icon: ${key}`, err);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Preload SVG tool icons
     */
    private async preloadSvgIcons(): Promise<void> {
        const promises = Object.entries(SVG_ICONS).map(async ([key, url]) => {
            try {
                const tex = await PIXI.Assets.load({ src: url, format: 'svg' });
                this.iconTextures.set(key, tex);
            } catch (err) {
                console.warn(`[AssetManager] Failed to load icon: ${key}`, err);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Preload SVG stamps generated from STAMP_PATHS
     */
    private async preloadStampPaths(): Promise<void> {
        const promises = Object.entries(STAMP_PATHS).map(async ([key, path]) => {
            const color = STAMP_COLORS[key] || 0x000000;
            const hex = '#' + color.toString(16).padStart(6, '0');

            // Generate SVG with higher resolution for scaling
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="${hex}" stroke="${hex}" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${path}" />
                </svg>`;

            const dataUri = svgToBase64(svg);
            const cacheKey = `stamp-${key}`;

            try {
                const tex = await PIXI.Assets.load({ src: dataUri, format: 'svg' });
                this.iconTextures.set(cacheKey, tex);
                console.log(`[AssetManager] Loaded stamp path: ${key}`);
            } catch (err) {
                console.warn(`[AssetManager] Failed to load stamp path: ${key}`, err);
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Get a cached texture by key
     */
    getTexture(key: string): PIXI.Texture | undefined {
        return this.iconTextures.get(key);
    }

    /**
     * Get a stamp texture by stamp type
     */
    getStampTexture(stampType: string): PIXI.Texture | undefined {
        return this.iconTextures.get(`stamp-${stampType}`);
    }

    /**
     * Check if a texture is loaded
     */
    hasTexture(key: string): boolean {
        return this.iconTextures.has(key);
    }

    /**
     * Set a texture directly (for dynamic loading)
     */
    setTexture(key: string, texture: PIXI.Texture): void {
        this.iconTextures.set(key, texture);
    }

    /**
     * Clear all cached textures
     */
    clear(): void {
        this.iconTextures.clear();
        this.loadingPromises.clear();
    }
}
