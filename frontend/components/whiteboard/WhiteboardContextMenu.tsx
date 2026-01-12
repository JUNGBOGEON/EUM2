import React, { useEffect, useRef } from 'react';
import { Trash2, Copy, RotateCw } from 'lucide-react';

interface WhiteboardContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAction: (action: 'delete' | 'duplicate' | 'rotate-45') => void;
}

export const WhiteboardContextMenu: React.FC<WhiteboardContextMenuProps> = ({ x, y, onClose, onAction }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Close on escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position if out of bounds (naive implementation, can be improved)
    const style = {
        top: y,
        left: x,
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px] flex flex-col text-sm animate-in fade-in zoom-in-95 duration-100"
            style={style}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button
                className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors text-gray-700 mx-1 rounded-md"
                onClick={() => onAction('duplicate')}
            >
                <Copy size={16} />
                복제
            </button>

            <button
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700 mx-1 rounded-md"
                onClick={() => onAction('rotate-45')}
            >
                <RotateCw size={16} />
                45도 회전
            </button>

            <div className="h-px bg-gray-200 my-1 mx-2" />

            <button
                className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 hover:text-red-600 transition-colors text-red-500 mx-1 rounded-md"
                onClick={() => onAction('delete')}
            >
                <Trash2 size={16} />
                삭제
            </button>
        </div>
    );
};
