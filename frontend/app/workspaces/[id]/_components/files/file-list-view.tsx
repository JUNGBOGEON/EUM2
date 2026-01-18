'use client';

import Image from 'next/image';
import { FileText, FileImage, FileVideo, FileAudio, Download, Trash2, MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { WorkspaceFile } from '../../_lib/types';
import { cn } from '@/lib/utils';

interface FileListViewProps {
  files: WorkspaceFile[];
  viewMode: 'grid' | 'list';
  thumbnailUrls: Record<string, string>;
  onDownload: (file: WorkspaceFile) => void;
  onRename: (file: WorkspaceFile) => void;
  onDelete: (file: WorkspaceFile) => void;
  onImageClick: (file: WorkspaceFile) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType?.startsWith('video/')) return FileVideo;
  if (mimeType?.startsWith('audio/')) return FileAudio;
  return FileText;
};

const isImageFile = (mimeType: string) => mimeType?.startsWith('image/');

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Image thumbnail component
function ImageThumbnail({ file, thumbnailUrl, className }: { file: WorkspaceFile; thumbnailUrl?: string; className?: string }) {
  if (!thumbnailUrl) {
    return (
      <div className={cn("bg-neutral-900 flex items-center justify-center", className)}>
        <FileImage className="h-5 w-5 text-neutral-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-neutral-900", className)}>
      <Image
        src={thumbnailUrl}
        alt={file.filename}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 200px"
      />
    </div>
  );
}

// File item with context menu
function FileItemWrapper({
  file,
  children,
  onDownload,
  onRename,
  onDelete,
  onImageClick,
}: {
  file: WorkspaceFile;
  children: React.ReactNode;
  onDownload: (file: WorkspaceFile) => void;
  onRename: (file: WorkspaceFile) => void;
  onDelete: (file: WorkspaceFile) => void;
  onImageClick: (file: WorkspaceFile) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-neutral-900 border-white/10 text-white shadow-xl">
        {isImageFile(file.mimeType) && (
          <ContextMenuItem onClick={() => onImageClick(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
            <FileImage className="mr-2 h-4 w-4" />
            미리보기
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onDownload(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          다운로드
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRename(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
          <Pencil className="mr-2 h-4 w-4" />
          이름 변경
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/10" />
        <ContextMenuItem
          className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
          onClick={() => onDelete(file)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileListView({
  files,
  viewMode,
  thumbnailUrls,
  onDownload,
  onRename,
  onDelete,
  onImageClick,
}: FileListViewProps) {
  if (viewMode === 'list') {
    return (
      <div className="border-t border-white/5">
        {files.map((file) => {
          const FileIcon = getFileIcon(file.mimeType);
          const isImage = isImageFile(file.mimeType);
          return (
            <FileItemWrapper
              key={file.id}
              file={file}
              onDownload={onDownload}
              onRename={onRename}
              onDelete={onDelete}
              onImageClick={onImageClick}
            >
              <div
                className={`group flex items-center gap-4 py-3 px-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors
                         ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
                onClick={isImage ? () => onImageClick(file) : undefined}
              >
                {/* File Icon or Thumbnail */}
                {isImage ? (
                  <ImageThumbnail
                    file={file}
                    thumbnailUrl={thumbnailUrls[file.id]}
                    className="w-10 h-10 rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-neutral-900 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-12 md:col-span-6">
                    <h4 className="font-medium text-sm text-neutral-300 group-hover:text-white truncate transition-colors">
                      {file.filename}
                    </h4>
                  </div>
                  <div className="col-span-6 md:col-span-2 hidden md:block">
                    <span className="text-xs text-neutral-500">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="col-span-6 md:col-span-2 hidden md:block">
                    <span className="text-xs text-neutral-500">{formatDate(file.createdAt)}</span>
                  </div>
                  <div className="col-span-6 md:col-span-2 hidden md:block">
                    {file.uploader && (
                      <span className="text-xs text-neutral-500">{file.uploader.name}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 text-white shadow-xl">
                      {isImage && (
                        <DropdownMenuItem onClick={() => onImageClick(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                          <FileImage className="mr-2 h-4 w-4" />
                          미리보기
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRename(file)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        이름 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                        onClick={() => onDelete(file)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </FileItemWrapper>
          );
        })}
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {files.map((file) => {
        const FileIcon = getFileIcon(file.mimeType);
        const isImage = isImageFile(file.mimeType);
        return (
          <FileItemWrapper
            key={file.id}
            file={file}
            onDownload={onDownload}
            onRename={onRename}
            onDelete={onDelete}
            onImageClick={onImageClick}
          >
            <div
              className={`group flex flex-col rounded-lg border border-transparent hover:bg-neutral-900/50 transition-all duration-200
                       ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
              onClick={isImage ? () => onImageClick(file) : undefined}
            >
              {/* Thumbnail or Icon Area */}
              {isImage ? (
                <ImageThumbnail
                  file={file}
                  thumbnailUrl={thumbnailUrls[file.id]}
                  className="w-full aspect-[4/3] rounded-lg border border-white/5"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center">
                  <FileIcon className="h-10 w-10 text-neutral-600 group-hover:text-neutral-400 transition-all duration-300" />
                </div>
              )}
              {/* File Info */}
              <div className="p-2">
                <h4 className="font-medium text-xs text-neutral-300 group-hover:text-white truncate transition-colors">
                  {file.filename}
                </h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-neutral-600 group-hover:text-neutral-500 transition-colors">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
            </div>
          </FileItemWrapper>
        );
      })}
    </div>
  );
}
