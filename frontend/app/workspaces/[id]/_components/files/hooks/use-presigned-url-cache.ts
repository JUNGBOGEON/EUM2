'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkspaceFile } from '../../../_lib/types';

// Cache for presigned URLs
const urlCache = new Map<string, { url: string; expiry: number }>();

interface UsePresignedUrlCacheOptions {
  files: WorkspaceFile[];
  onGetPreviewUrl: (file: WorkspaceFile) => Promise<string | null>;
}

export function usePresignedUrlCache({ files, onGetPreviewUrl }: UsePresignedUrlCacheOptions) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  const isImageFile = useCallback((mimeType: string) => mimeType?.startsWith('image/'), []);

  // Get cached or fresh presigned URL
  const getCachedUrl = useCallback(async (file: WorkspaceFile): Promise<string | null> => {
    const cached = urlCache.get(file.id);
    const now = Date.now();

    // Use cached URL if it exists and hasn't expired (with 5 min buffer)
    if (cached && cached.expiry > now + 5 * 60 * 1000) {
      return cached.url;
    }

    const url = await onGetPreviewUrl(file);
    if (url) {
      // Cache for 55 minutes (presigned URLs typically last 1 hour)
      urlCache.set(file.id, { url, expiry: now + 55 * 60 * 1000 });
    }
    return url;
  }, [onGetPreviewUrl]);

  // Load thumbnails for image files
  useEffect(() => {
    const loadThumbnails = async () => {
      const imageFiles = files.filter(f => isImageFile(f.mimeType));

      for (const file of imageFiles) {
        if (!thumbnailUrls[file.id]) {
          const url = await getCachedUrl(file);
          if (url) {
            setThumbnailUrls(prev => ({ ...prev, [file.id]: url }));
          }
        }
      }
    };

    loadThumbnails();
  }, [files, getCachedUrl, thumbnailUrls, isImageFile]);

  return {
    thumbnailUrls,
    getCachedUrl,
    isImageFile,
  };
}
