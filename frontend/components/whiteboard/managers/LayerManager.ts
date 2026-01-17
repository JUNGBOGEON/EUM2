import * as PIXI from 'pixi.js';
import { RenderLayers } from '../types/render-types';

/**
 * Manages PixiJS layer containers and their hierarchy
 */
export class LayerManager {
    private layers: RenderLayers;
    private drawingLayer: PIXI.Container;

    constructor() {
        // Create all layer containers
        this.layers = {
            static: new PIXI.Container(),
            dynamic: new PIXI.Container(),
            drawing: new PIXI.Container(),
            selection: new PIXI.Container(),
            drag: new PIXI.Container(),
            ghost: new PIXI.Container(),
            effect: new PIXI.Container(),
            cursor: new PIXI.Container(),
        };

        // Drawing layer is a composite container
        this.drawingLayer = this.layers.drawing;

        // Set up drawing layer hierarchy
        this.drawingLayer.addChild(this.layers.static);
        this.drawingLayer.addChild(this.layers.dynamic);

        // Disable event interactivity on all layers by default
        this.setAllNonInteractive();
    }

    /**
     * Set all layers to non-interactive
     */
    private setAllNonInteractive(): void {
        this.layers.static.eventMode = 'none';
        this.layers.dynamic.eventMode = 'none';
        this.layers.drawing.eventMode = 'none';
        this.layers.selection.eventMode = 'none';
        this.layers.cursor.eventMode = 'none';
        this.layers.ghost.eventMode = 'none';
        this.layers.effect.eventMode = 'none';
        this.layers.drag.eventMode = 'none';
    }

    /**
     * Attach layers to the PixiJS stage in correct order
     */
    attachToStage(stage: PIXI.Container): void {
        stage.addChild(this.drawingLayer);
        stage.addChild(this.layers.ghost);
        stage.addChild(this.layers.effect);
        stage.addChild(this.layers.selection);
        stage.addChild(this.layers.drag);
        stage.addChild(this.layers.cursor);
        stage.eventMode = 'none';
    }

    /**
     * Get all layer references
     */
    getLayers(): RenderLayers {
        return this.layers;
    }

    /**
     * Get static layer (for finalized items)
     */
    get staticLayer(): PIXI.Container {
        return this.layers.static;
    }

    /**
     * Get dynamic layer (for in-progress items)
     */
    get dynamicLayer(): PIXI.Container {
        return this.layers.dynamic;
    }

    /**
     * Get selection layer
     */
    get selectionLayer(): PIXI.Container {
        return this.layers.selection;
    }

    /**
     * Get cursor layer
     */
    get cursorLayer(): PIXI.Container {
        return this.layers.cursor;
    }

    /**
     * Get ghost layer
     */
    get ghostLayer(): PIXI.Container {
        return this.layers.ghost;
    }

    /**
     * Get effect layer
     */
    get effectLayer(): PIXI.Container {
        return this.layers.effect;
    }

    /**
     * Get drag layer
     */
    get dragLayer(): PIXI.Container {
        return this.layers.drag;
    }

    /**
     * Get drawing layer (composite)
     */
    get drawingComposite(): PIXI.Container {
        return this.drawingLayer;
    }

    /**
     * Clear all layer contents
     */
    clearAll(): void {
        Object.values(this.layers).forEach(layer => {
            layer.removeChildren();
        });
    }

    /**
     * Destroy all layers
     */
    destroy(): void {
        Object.values(this.layers).forEach(layer => {
            layer.destroy({ children: true });
        });
    }
}
