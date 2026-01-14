import React from 'react';
import { useWhiteboardStore } from './store';
import { STAMP_PATHS, STAMP_COLORS } from './utils/stampAssets';

export const StampMenu = () => {
    const { stampMenuPosition, setStampMenuPosition, setCurrentStamp, currentStamp } = useWhiteboardStore();

    if (!stampMenuPosition) return null;

    const radius = 70;
    const stamps = Object.keys(STAMP_PATHS);

    return (
        <div
            className="fixed inset-0 z-[100]"
            onClick={() => setStampMenuPosition(null)}
            onContextMenu={(e) => { e.preventDefault(); setStampMenuPosition(null); }}
        >
            <div
                className="absolute"
                style={{
                    left: stampMenuPosition.x,
                    top: stampMenuPosition.y,
                }}
            >
                {stamps.map((key, index) => {
                    const angle = (index / stamps.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = currentStamp === key;
                    const color = STAMP_COLORS[key] || 0x000000;
                    const hex = '#' + color.toString(16).padStart(6, '0');

                    return (
                        <button
                            key={key}
                            className={`absolute w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-white border border-gray-200 ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            style={{
                                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                            }}
                            onPointerEnter={() => setCurrentStamp(key)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentStamp(key);
                                setStampMenuPosition(null);
                            }}
                            title={key}
                        >
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill={hex}>
                                <path d={STAMP_PATHS[key]} />
                            </svg>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
