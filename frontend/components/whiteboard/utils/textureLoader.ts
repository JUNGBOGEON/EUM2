
import * as PIXI from 'pixi.js';

export const loadTexture = async (url: string): Promise<PIXI.Texture> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;

        img.onload = () => {
            // Use explicit source creation for v8 compatibility if needed, but 'from' works generally.
            // For v8, Texture.from(img) is still valid.
            const texture = PIXI.Texture.from(img);
            // Manually add to Assets cache to allow retrieval by URL later if needed? 
            // Better to let the caller handle higher level caching logic or just rely on browser cache.
            // But we can try to register it if we want 'Assets.get(url)' to work later.
            if (PIXI.Assets && PIXI.Assets.cache) {
                PIXI.Assets.cache.set(url, texture);
            }
            resolve(texture);
        };

        img.onerror = (e) => {
            reject(e);
        };
    });
};
