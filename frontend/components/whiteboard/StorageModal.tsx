'use client';

import { useState, useEffect } from 'react';
import { useWhiteboardStore } from './store';

interface StorageFile {
    url: string;
    name: string;
    date: string;
}

export function StorageModal({ onClose }: { onClose: () => void }) {
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(true);
    const { setPendingImage, setTool } = useWhiteboardStore();

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/whiteboard/storage`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setFiles(data);
                }
            } catch (err) {
                console.error("Failed to load storage files", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, []);

    const handleSelect = (file: StorageFile) => {
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
            setPendingImage({
                url: file.url,
                width: img.width,
                height: img.height,
                // No file object needed for storage items as they are already uploaded
            });
            setTool('image');
            onClose();
        };
        img.src = file.url;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Workspace Storage</h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">Loading...</div>
                    ) : files.length === 0 ? (
                        <div className="text-center text-stone-400 py-10">No images found in storage.</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {files.map((file, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(file)}
                                    className="group relative aspect-square bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                                >
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {file.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
