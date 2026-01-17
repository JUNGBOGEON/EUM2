import * as PIXI from 'pixi.js';
import { Effect, RenderContext } from '../types/render-types';

/**
 * Manages particle effects and animations for the whiteboard
 */
export class EffectSystem {
    private effectLayer: PIXI.Container;
    private activeEffects: Effect[] = [];

    constructor(effectLayer: PIXI.Container) {
        this.effectLayer = effectLayer;
        this.effectLayer.eventMode = 'none';
    }

    /**
     * Update all active effects (called from render loop)
     */
    tick(dt: number): void {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            const keep = effect.update(dt);
            if (!keep) {
                this.activeEffects.splice(i, 1);
            }
        }
    }

    /**
     * Play burst effect when placing a stamp
     */
    playStampEffect(x: number, y: number): void {
        const lines: PIXI.Graphics[] = [];
        const count = 8;
        const startOffset = 45; // Start outside the stamp
        const lineLen = 15;

        for (let i = 0; i < count; i++) {
            const g = new PIXI.Graphics();
            g.moveTo(startOffset, 0);
            g.lineTo(startOffset + lineLen, 0);
            g.stroke({ width: 3, color: 0xFFD700, cap: 'round' });
            g.position.set(x, y);
            g.rotation = (i / count) * Math.PI * 2;
            lines.push(g);
            this.effectLayer.addChild(g);
        }

        let time = 0;
        this.activeEffects.push({
            update: (dt: number) => {
                time += dt;
                const progress = Math.min(time / 20, 1);

                lines.forEach(l => {
                    const speed = 3;
                    l.position.x += Math.cos(l.rotation) * speed * dt;
                    l.position.y += Math.sin(l.rotation) * speed * dt;
                    l.alpha = 1 - progress;
                });

                if (progress >= 1) {
                    lines.forEach(l => l.destroy());
                    return false;
                }
                return true;
            }
        });
    }

    /**
     * Add a custom effect
     */
    addEffect(effect: Effect): void {
        this.activeEffects.push(effect);
    }

    /**
     * Clear all active effects
     */
    clearAll(): void {
        this.activeEffects = [];
        this.effectLayer.removeChildren();
    }

    /**
     * Get the number of active effects
     */
    get activeCount(): number {
        return this.activeEffects.length;
    }
}
