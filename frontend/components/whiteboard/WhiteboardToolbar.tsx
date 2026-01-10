'use client';

import { memo, useState, useRef } from 'react';
import { useWhiteboardStore, WhiteboardTool } from './store';
import { PEN_COLORS, TOOL_SETTINGS } from './constants';
import { StorageModal } from './StorageModal';

interface WhiteboardToolbarProps {
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

function WhiteboardToolbarComponent({
    onUndo,
    onRedo,
    onClear,
    onMouseEnter,
    onMouseLeave,
}: WhiteboardToolbarProps) {
    const {
        tool,
        setTool,
        color,
        setColor,
        penSize,
        setPenSize,
        eraserSize,
        setEraserSize,
        smoothness,
        setSmoothness,
        canUndo,
        canRedo,
        setPendingImage
    } = useWhiteboardStore();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            if (!ev.target?.result) return;
            const dataUrl = ev.target.result as string;

            const img = new Image();
            img.onload = () => {
                // Limit Max Size (e.g., 500px)
                const MAX_SIZE = 500;
                let w = img.width;
                let h = img.height;

                if (w > MAX_SIZE || h > MAX_SIZE) {
                    const ratio = w / h;
                    if (w > h) {
                        w = MAX_SIZE;
                        h = MAX_SIZE / ratio;
                    } else {
                        h = MAX_SIZE;
                        w = MAX_SIZE * ratio;
                    }
                }

                setPendingImage({
                    url: dataUrl,
                    width: w,
                    height: h,
                    file: file
                });
                setTool('image');
                setShowToolSettings(false);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset
    };

    const [isToolbarOpen, setIsToolbarOpen] = useState(true);
    const [showToolSettings, setShowToolSettings] = useState(false);
    const [showImageMenu, setShowImageMenu] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);

    const handleToolClick = (t: WhiteboardTool) => {
        if (t === 'pen' || t === 'eraser' || t === 'magic-pen') {
            if (tool === t) {
                setShowToolSettings(!showToolSettings);
            } else {
                setTool(t);
                setShowToolSettings(true);
            }
        } else {
            setTool(t);
            setShowToolSettings(false);
        }
    };

    return (
        <>
            {showStorageModal && <StorageModal onClose={() => setShowStorageModal(false)} />}
            <div
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 transition-all duration-500 ease-in-out ${isToolbarOpen ? 'translate-y-[-20px]' : 'translate-y-[calc(100%-32px)]'
                    }`}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsToolbarOpen(!isToolbarOpen)}
                    className="w-16 h-10 flex items-center justify-center bg-white/70 backdrop-blur-xl shadow-2xl rounded-t-[1.5rem] border border-stone-200 border-b-0 text-stone-400 hover:text-stone-900 transition-all group"
                    title={isToolbarOpen ? 'Close Toolbar' : 'Open Toolbar'}
                >
                    <svg
                        className={`w-6 h-6 transform transition-transform duration-500 ${isToolbarOpen ? 'rotate-180' : ''
                            } group-hover:scale-110`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                </button>

                {/* Toolbar & Settings Panel */}
                <div className="flex flex-col items-center gap-4 p-4 pt-0 bg-transparent">
                    {/* Tool Settings Popup */}
                    {showToolSettings && (
                        <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl p-6 border border-white/50 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 mb-4 w-80 ring-1 ring-black/[0.03]">
                            {/* Size */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-stone-500 w-12 uppercase tracking-tight">
                                    크기
                                </span>
                                <div className="flex-1 flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={(tool === 'pen' || tool === 'magic-pen') ? TOOL_SETTINGS.pen.minSize : TOOL_SETTINGS.eraser.minSize}
                                        max={(tool === 'pen' || tool === 'magic-pen') ? TOOL_SETTINGS.pen.maxSize : TOOL_SETTINGS.eraser.maxSize}
                                        value={(tool === 'pen' || tool === 'magic-pen') ? penSize : eraserSize}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (tool === 'eraser') {
                                                setEraserSize(val);
                                            } else {
                                                setPenSize(val);
                                            }
                                        }}
                                        className="flex-1 accent-stone-900 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-stone-900 w-8 text-right">
                                        {(tool === 'pen' || tool === 'magic-pen') ? penSize : eraserSize}
                                    </span>
                                </div>
                            </div>

                            {/* Smoothness (only for pen) */}
                            {(tool === 'pen' || tool === 'magic-pen') && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-stone-500 w-12 uppercase tracking-tight">
                                        자연스럽게
                                    </span>
                                    <div className="flex-1 flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={TOOL_SETTINGS.smoothness.min}
                                            max={TOOL_SETTINGS.smoothness.max}
                                            value={smoothness}
                                            onChange={(e) => setSmoothness(parseInt(e.target.value))}
                                            className="flex-1 accent-stone-900 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-stone-900 w-8 text-right">
                                            {smoothness}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Color Picker (only for pen) */}
                            {(tool === 'pen' || tool === 'magic-pen') && (
                                <>
                                    <div className="grid grid-cols-7 gap-1.5 pt-4 border-t border-stone-100">
                                        {PEN_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c)}
                                                className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${color === c
                                                    ? 'ring-2 ring-offset-2 ring-stone-900 border-transparent'
                                                    : 'border-stone-200'
                                                    }`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                                        <div
                                            className="w-10 h-10 rounded-xl border border-stone-200 shadow-sm"
                                            style={{ backgroundColor: color }}
                                        />
                                        <div className="flex-1 flex items-center bg-stone-50 rounded-xl px-3 border border-stone-200 h-10">
                                            <span className="text-stone-400 font-medium mr-1">#</span>
                                            <input
                                                type="text"
                                                value={color.replace('#', '')}
                                                readOnly
                                                className="w-full bg-transparent border-none text-sm font-bold text-stone-900 focus:ring-0 uppercase p-0 cursor-default"
                                                placeholder="000000"
                                            />
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={(e) => setColor(e.target.value)}
                                                className="w-10 h-10 opacity-0 absolute inset-0 cursor-pointer"
                                            />
                                            <button className="w-10 h-10 flex items-center justify-center bg-stone-100 rounded-xl hover:bg-stone-200 text-stone-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="bg-white/80 backdrop-blur-2xl shadow-2xl rounded-full px-4 py-3 flex items-center gap-2 border border-white/50 ring-1 ring-black/[0.03]">
                        {/* Undo */}
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${!canUndo
                                ? 'text-stone-300 cursor-not-allowed'
                                : 'hover:bg-stone-50 text-stone-600 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                            </svg>
                        </button>

                        {/* Redo */}
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${!canRedo
                                ? 'text-stone-300 cursor-not-allowed'
                                : 'hover:bg-stone-50 text-stone-600 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Redo (Ctrl+Y)"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                                />
                            </svg>
                        </button>

                        <div className="w-px h-8 bg-black/[0.05] mx-1" />

                        {/* Select (Cursor) */}
                        <button
                            onClick={() => handleToolClick('select')}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'select'
                                ? 'bg-black text-white shadow-xl scale-110'
                                : 'hover:bg-stone-50 text-stone-500 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Select & Move (V)"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 10.5H5.375M2.25 12h2.25m9.472 0h.008v.008H13.972V12zm0-4.5h.008v.008H13.972V7.5zm0 9h.008v.008H13.972V16.5z" />
                                {/* Simple Cursor Icon */}
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                            </svg>
                        </button>

                        {/* Pan/Hand */}
                        <button
                            onClick={() => handleToolClick('pan')}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'pan'
                                ? 'bg-black text-white shadow-xl scale-110'
                                : 'hover:bg-stone-50 text-stone-500 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Pan"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                                />
                            </svg>
                        </button>

                        {/* Pen */}
                        <button
                            onClick={() => handleToolClick('pen')}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'pen'
                                ? 'bg-black text-white shadow-xl scale-110'
                                : 'hover:bg-stone-50 text-stone-500 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Pen"
                        >
                            <div className="relative">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                </svg>
                                <div
                                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white"
                                    style={{ backgroundColor: color }}
                                />
                            </div>
                        </button>

                        {/* Magic Pen */}
                        <button
                            onClick={() => handleToolClick('magic-pen')}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'magic-pen'
                                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl scale-110 ring-2 ring-purple-200'
                                : 'hover:bg-purple-50 text-stone-500 hover:text-purple-600 hover:scale-110'
                                }`}
                            title="Magic Pen (Auto Shape)"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.5 5.5l-.5.5" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 4l4 4" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 19.5l7-7" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.5 13.5l1 1" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10l-6.5 6.5a2.121 2.121 0 003 3L17 13" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l2 2m0-2l-2 2" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 2h.01M2 7h.01" />
                            </svg>
                        </button>

                        {/* Image Tool */}
                        <div className="relative">
                            {showImageMenu && (
                                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-stone-100 py-2 w-48 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                                    <button
                                        onClick={() => { fileInputRef.current?.click(); setShowImageMenu(false); }}
                                        className="px-4 py-3 text-sm font-medium text-left hover:bg-stone-50 text-stone-700 transition-colors"
                                    >
                                        내 PC에서 업로드
                                    </button>
                                    <button
                                        onClick={() => { setShowStorageModal(true); setShowImageMenu(false); }}
                                        className="px-4 py-3 text-sm font-medium text-left hover:bg-stone-50 text-stone-700 transition-colors border-t border-stone-50"
                                    >
                                        워크스페이스 저장소
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setShowImageMenu(!showImageMenu)}
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'image'
                                    ? 'bg-black text-white shadow-xl scale-110'
                                    : 'hover:bg-stone-50 text-stone-500 hover:text-stone-900 hover:scale-110'
                                    }`}
                                title="Insert Image"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>

                        {/* Hidden Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        {/* Eraser */}
                        <button
                            onClick={() => handleToolClick('eraser')}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${tool === 'eraser'
                                ? 'bg-black text-white shadow-xl scale-110'
                                : 'hover:bg-stone-50 text-stone-500 hover:text-stone-900 hover:scale-110'
                                }`}
                            title="Eraser"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l-6 6" />
                            </svg>
                        </button>

                        <div className="w-px h-8 bg-black/[0.05] mx-1" />

                        {/* Clear */}
                        <button
                            onClick={onClear}
                            className="w-12 h-12 flex items-center justify-center bg-red-50/50 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all hover:scale-110 shadow-sm"
                            title="Clear All"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export const WhiteboardToolbar = memo(WhiteboardToolbarComponent);
