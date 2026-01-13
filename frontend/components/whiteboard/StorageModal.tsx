'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWhiteboardStore } from './store';
import { getProxiedUrl } from './utils/urlUtils';

// Define minimal interface to match WorkspaceFile structure we observed
interface WorkspaceFile {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: string;
    // other fields...
}

// Helper to fetch keys
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function StorageModal({ onClose }: { onClose: () => void }) {
    const params = useParams();
    const workspaceId = params?.id as string;

    const [files, setFiles] = useState<WorkspaceFile[]>([]);
    const [loading, setLoading] = useState(true);
    const { setPendingImage, setTool } = useWhiteboardStore();

    // Cache for signed URLs
    const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!workspaceId) {
            setLoading(false);
            return;
        }

        const fetchFiles = async () => {
            try {
                const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Failed to fetch files');

                const data = await res.json();
                const allFiles = Array.isArray(data) ? data : (data.files || []);

                // Filter images only
                const images = allFiles.filter((f: WorkspaceFile) =>
                    f.mimeType.startsWith('image/')
                );

                setFiles(images);

                // Fetch preview URLs for images
                // Note: Fetching one by one might be slow, but it's consistent with current architecture
                images.forEach((file: WorkspaceFile) => {
                    fetchPresignedUrl(file.id);
                });

            } catch (err) {
                console.error("Failed to load workspace files", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [workspaceId]);

    const fetchPresignedUrl = async (fileId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${fileId}/download`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.presignedUrl) {
                    setImageUrls(prev => new Map(prev).set(fileId, data.presignedUrl));
                }
            }
        } catch (e) {
            console.error("Failed to load preview for", fileId, e);
        }
    };

    const handleSelect = async (file: WorkspaceFile) => {
        // Reuse cached URL or fetch fresh? 
        // Cached URL might expire properly, but usually lasts 15-60m.
        let url = imageUrls.get(file.id);

        if (!url) {
            // Try fetching one last time synchronously-ish logic
            try {
                const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files/${file.id}/download`, {
                    credentials: 'include'
                });
                const data = await res.json();
                url = data.presignedUrl;
            } catch (e) {
                console.error("Failed to get file URL", e);
                return;
            }
        }

        if (!url) return;

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
            setPendingImage({
                url: url!,
                width: img.width,
                height: img.height,
                // No file object needed for storage items as they are already uploaded
            });
            setTool('image');
            onClose();
        };
        img.onerror = () => {
            console.error("Failed to load image from URL");
        };
        // Handle CORS
        img.crossOrigin = "anonymous";
        // Use proxy for loading to avoid CORS issues
        img.src = getProxiedUrl(url);
    };

    // Date formatter
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Workspace Files</h2>
                        <p className="text-sm text-gray-500">Insert images from your workspace storage</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">No images found in workspace</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {files.map((file, i) => {
                                const url = imageUrls.get(file.id);
                                return (
                                    <button
                                        key={file.id}
                                        onClick={() => handleSelect(file)}
                                        className="group relative aspect-square bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all text-left"
                                        disabled={!url}
                                    >
                                        {url ? (
                                            <img src={url} alt={file.filename} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                <div className="animate-pulse bg-gray-200 w-full h-full" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                                            <span className="text-white text-xs font-medium truncate w-full block">{file.filename}</span>
                                            <span className="text-white/70 text-[10px]">{formatDate(file.createdAt)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
