'use client';

import Image from 'next/image';
import { X, FileImage, Download, HardDrive, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { WorkspaceFile } from '../../_lib/types';

interface FilePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  file: WorkspaceFile | null;
  previewUrl: string | null;
  isLoading: boolean;
  onDownload: (file: WorkspaceFile) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function FilePreviewDialog({
  isOpen,
  onOpenChange,
  file,
  previewUrl,
  isLoading,
  onDownload,
}: FilePreviewDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-neutral-900/95 backdrop-blur-xl border border-white/10 sm:rounded-2xl">
        {file && (
          <>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm border border-white/10"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Image Area */}
            <div className="relative w-full min-h-[300px] max-h-[70vh] bg-black/50 flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm text-neutral-400">이미지 로딩 중...</span>
                </div>
              ) : previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={file.filename}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-neutral-500">
                  <FileImage className="h-12 w-12" />
                  <span>이미지를 불러올 수 없습니다</span>
                </div>
              )}
            </div>

            {/* File Info Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate text-lg">
                    {file.filename}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4" />
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateTime(file.createdAt)}</span>
                    </div>
                    {file.uploader && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>{file.uploader.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => onDownload(file)}
                  className="flex-shrink-0 bg-white text-black hover:bg-neutral-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  다운로드
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
