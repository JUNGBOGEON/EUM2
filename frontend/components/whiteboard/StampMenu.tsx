'use client';

import { useEffect, useRef } from 'react';
import { STAMP_ICONS, STAMP_NAMES, STAMP_ORDER } from './utils/stampAssets';
import { useWhiteboardStore } from './store';
import Image from 'next/image';

export function StampMenu() {
    const {
        stampMenuPosition,
        setStampMenuPosition,
        setCurrentStamp,
        currentStamp
    } = useWhiteboardStore();

    const menuRef = useRef<HTMLDivElement>(null);

    // Close on right-click release or click outside
    useEffect(() => {
        if (!stampMenuPosition) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setStampMenuPosition(null);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        window.addEventListener('pointerdown', handleClickOutside);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('pointerdown', handleClickOutside);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [stampMenuPosition, setStampMenuPosition]);

    if (!stampMenuPosition) return null;

    const iconCount = STAMP_ORDER.length;
    const radius = 80; // Distance from center to icons
    const iconSize = 48; // Icon button size

    return (
        <div
            ref={menuRef}
            className="absolute z-50"
            style={{
                left: stampMenuPosition.x,
                top: stampMenuPosition.y,
                transform: 'translate(-50%, -50%)',
                width: radius * 2 + iconSize,
                height: radius * 2 + iconSize,
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Center indicator */}
            <div
                className="absolute bg-white/80 backdrop-blur-sm rounded-full shadow-lg border-2 border-stone-200"
                style={{
                    width: 40,
                    height: 40,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            >
                {currentStamp && STAMP_ICONS[currentStamp] && (
                    <Image
                        src={STAMP_ICONS[currentStamp]}
                        alt={currentStamp}
                        width={28}
                        height={28}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                        unoptimized
                    />
                )}
            </div>

            {/* Radial icons */}
            {STAMP_ORDER.map((key: string, index: number) => {
                const angle = (index / iconCount) * 2 * Math.PI - Math.PI / 2; // Start from top
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const isSelected = currentStamp === key;
                const iconUrl = STAMP_ICONS[key];

                return (
                    <button
                        key={key}
                        onPointerEnter={() => {
                            // Change stamp on hover
                            setCurrentStamp(key);
                        }}
                        onClick={() => {
                            setCurrentStamp(key);
                            setStampMenuPosition(null);
                        }}
                        className={`absolute flex items-center justify-center rounded-full transition-all duration-150 ${isSelected
                            ? 'bg-white scale-125 shadow-xl ring-2 ring-blue-500'
                            : 'bg-white/90 hover:scale-110 shadow-lg hover:shadow-xl'
                            }`}
                        style={{
                            width: iconSize,
                            height: iconSize,
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        title={STAMP_NAMES[key] || key}
                    >
                        <Image
                            src={iconUrl}
                            alt={key}
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                        />
                    </button>
                );
            })}
        </div>
    );
}
