import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WhiteboardItem } from './store';

interface TextInputOverlayProps {
    item: WhiteboardItem;
    zoom: number;
    pan: { x: number; y: number };
    onChange: (id: string, text: string) => void;
    onComplete: () => void;
}

const MAX_WIDTH = 400; // Maximum width before text wraps
const CONTENT_WIDTH = 376; // MAX_WIDTH - horizontal padding (12 * 2)
const MIN_WIDTH = 100;
const MIN_HEIGHT = 32;

/**
 * Detects where CSS word wrap occurs and inserts actual newlines at those points.
 * This ensures visual line breaks are preserved when text is rendered elsewhere.
 */
function insertNewlinesAtWrapPoints(
    text: string,
    fontFamily: string,
    fontSize: number,
    maxWidth: number
): string {
    // If text already has explicit newlines, process each line separately
    const existingLines = text.split('\n');
    const resultLines: string[] = [];

    // Create a canvas for text measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text;

    ctx.font = `${fontSize}px ${fontFamily}`;

    for (const line of existingLines) {
        if (line.length === 0) {
            resultLines.push('');
            continue;
        }

        // Measure the full line
        const lineWidth = ctx.measureText(line).width;

        if (lineWidth <= maxWidth) {
            // Line fits without wrapping
            resultLines.push(line);
            continue;
        }

        // Line needs wrapping - break it into multiple lines
        let currentLine = '';
        let currentWidth = 0;

        // Try word-based wrapping first
        const words = line.split(/(\s+)/); // Keep whitespace in results

        for (const word of words) {
            const wordWidth = ctx.measureText(word).width;

            if (currentWidth + wordWidth <= maxWidth) {
                currentLine += word;
                currentWidth += wordWidth;
            } else {
                // Word doesn't fit
                if (currentLine.length > 0) {
                    resultLines.push(currentLine.trimEnd());
                }

                // Check if the word itself is too long (needs character-level breaking)
                if (wordWidth > maxWidth && word.trim().length > 0) {
                    // Break the word character by character
                    let charLine = '';
                    let charWidth = 0;

                    for (const char of word) {
                        const charW = ctx.measureText(char).width;
                        if (charWidth + charW <= maxWidth) {
                            charLine += char;
                            charWidth += charW;
                        } else {
                            if (charLine.length > 0) {
                                resultLines.push(charLine);
                            }
                            charLine = char;
                            charWidth = charW;
                        }
                    }

                    // What's left becomes the current line
                    currentLine = charLine;
                    currentWidth = charWidth;
                } else {
                    // Start new line with this word
                    currentLine = word;
                    currentWidth = wordWidth;
                }
            }
        }

        // Don't forget the last line
        if (currentLine.length > 0) {
            resultLines.push(currentLine.trimEnd());
        }
    }

    return resultLines.join('\n');
}

export const TextInputOverlay: React.FC<TextInputOverlayProps> = ({
    item,
    zoom,
    pan,
    onChange,
    onComplete
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localText, setLocalText] = useState(item.data.text || '');

    // Focus and select on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(localText.length, localText.length);
        }
    }, []);

    // Auto-resize textarea height based on content
    const autoResize = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to get accurate scrollHeight
            textarea.style.height = 'auto';
            // Set height to fit content
            textarea.style.height = `${Math.max(MIN_HEIGHT, textarea.scrollHeight)}px`;
        }
    }, []);

    useEffect(() => {
        autoResize();
    }, [localText, autoResize]);

    // Calculate screen position
    const t = item.transform;
    const x = t.x * zoom + pan.x;
    const y = t.y * zoom + pan.y;
    const baseFontSize = item.data.fontSize || 24;
    const rotation = t.rotation || 0;
    const scaleX = t.scaleX || 1;
    const scaleY = t.scaleY || 1;
    const fontFamily = item.data.fontFamily || 'Arial, sans-serif';

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        // Debug: Log text with newline count
        const newlineCount = (newText.match(/\n/g) || []).length;
        console.log(`[TextInputOverlay] Text changed: ${newText.length} chars, ${newlineCount} newlines`);
        setLocalText(newText);
        onChange(item.id, newText);
    }, [item.id, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Complete on Escape
        if (e.key === 'Escape') {
            e.preventDefault();
            // Convert CSS word wrap to actual newlines before completing
            const textWithNewlines = insertNewlinesAtWrapPoints(localText, fontFamily, baseFontSize, CONTENT_WIDTH);
            if (textWithNewlines !== localText) {
                console.log(`[TextInputOverlay] Converting word wrap to newlines`);
                onChange(item.id, textWithNewlines);
            }
            onComplete();
        }
        // Allow Enter for new lines (Shift+Enter or just Enter)
        // Complete only on Ctrl+Enter or Cmd+Enter for more control
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            // Convert CSS word wrap to actual newlines before completing
            const textWithNewlines = insertNewlinesAtWrapPoints(localText, fontFamily, baseFontSize, CONTENT_WIDTH);
            if (textWithNewlines !== localText) {
                console.log(`[TextInputOverlay] Converting word wrap to newlines`);
                onChange(item.id, textWithNewlines);
            }
            onComplete();
        }
    }, [onComplete, localText, fontFamily, baseFontSize, onChange, item.id]);

    const handleBlur = useCallback((e: React.FocusEvent) => {
        // Small delay to allow clicking elsewhere intentionally
        setTimeout(() => {
            // Convert CSS word wrap to actual newlines before completing
            const textWithNewlines = insertNewlinesAtWrapPoints(localText, fontFamily, baseFontSize, CONTENT_WIDTH);
            if (textWithNewlines !== localText) {
                console.log(`[TextInputOverlay] Converting word wrap to newlines on blur`);
                onChange(item.id, textWithNewlines);
            }
            onComplete();
        }, 100);
    }, [onComplete, localText, fontFamily, baseFontSize, onChange, item.id]);

    return (
        <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="텍스트 입력..."
            style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `rotate(${rotation}rad) scale(${scaleX}, ${scaleY})`,
                transformOrigin: 'top left',

                // Typography - must match exactly for consistent wrapping
                fontSize: `${baseFontSize}px`,
                fontFamily: fontFamily,
                color: item.data.color || '#000000',
                lineHeight: 1.4,

                // Sizing - FIXED width to match our wrap calculation
                // Use content-box so padding is added outside
                boxSizing: 'content-box',
                width: `${CONTENT_WIDTH}px`,
                minHeight: `${MIN_HEIGHT}px`,

                // Text behavior
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                textAlign: 'left',
                direction: 'ltr',

                // Appearance
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '4px',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',

                // Layout
                margin: 0,
                padding: '8px 12px',
                resize: 'none',
                overflow: 'hidden',

                // Caret
                caretColor: item.data.color || '#3b82f6',

                // Stacking
                zIndex: 100,
            }}
        />
    );
};
