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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { WorkspaceFile } from '../../_lib/types';

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
      <div className={`bg-primary/10 flex items-center justify-center ${className}`}>
        <FileImage className="h-5 w-5 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
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
      <ContextMenuContent className="w-48">
        {isImageFile(file.mimeType) && (
          <ContextMenuItem onClick={() => onImageClick(file)}>
            <FileImage className="mr-2 h-4 w-4" />
            미리보기
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onDownload(file)}>
          <Download className="mr-2 h-4 w-4" />
          다운로드
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRename(file)}>
          <Pencil className="mr-2 h-4 w-4" />
          이름 변경
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
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
      <div className="space-y-2">
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
                className={`group flex items-center gap-4 p-4 rounded-xl border border-border
                         hover:border-primary/30 hover:bg-muted/30 transition-all
                         ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
                onClick={isImage ? () => onImageClick(file) : undefined}
              >
                {/* File Icon or Thumbnail */}
                {isImage ? (
                  <ImageThumbnail
                    file={file}
                    thumbnailUrl={thumbnailUrls[file.id]}
                    className="w-10 h-10 rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {file.filename}
                  </h4>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                    {file.uploader && (
                      <span>{file.uploader.name}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>다운로드</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isImage && (
                        <DropdownMenuItem onClick={() => onImageClick(file)}>
                          <FileImage className="mr-2 h-4 w-4" />
                          미리보기
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRename(file)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        이름 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
              className={`group flex flex-col rounded-xl border border-border overflow-hidden
                       hover:border-primary/30 hover:bg-muted/30 transition-all
                       ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
              onClick={isImage ? () => onImageClick(file) : undefined}
            >
              {/* Thumbnail or Icon Area */}
              {isImage ? (
                <ImageThumbnail
                  file={file}
                  thumbnailUrl={thumbnailUrls[file.id]}
                  className="w-full h-24"
                />
              ) : (
                <div className="w-full h-24 bg-primary/5 flex items-center justify-center">
                  <FileIcon className="h-8 w-8 text-primary" />
                </div>
              )}
              {/* File Info */}
              <div className="p-3">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {file.filename}
                </h4>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
          </FileItemWrapper>
        );
      })}
    </div>
  );
}
