'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Upload,
  Download,
  Trash2,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Pencil,
  X,
  User,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import type { WorkspaceFile } from '../_lib/types';

interface FilesSectionProps {
  files: WorkspaceFile[];
  isLoading: boolean;
  onUpload: (files: FileList) => void;
  onDownload: (file: WorkspaceFile) => void;
  onDelete: (file: WorkspaceFile) => void;
  onRename: (file: WorkspaceFile, newName: string) => void;
  onGetPreviewUrl: (file: WorkspaceFile) => Promise<string | null>;
  isUploading?: boolean;
}

// Cache for presigned URLs
const urlCache = new Map<string, { url: string; expiry: number }>();

export function FilesSection({
  files,
  isLoading,
  onUpload,
  onDownload,
  onDelete,
  onRename,
  onGetPreviewUrl,
  isUploading,
}: FilesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [fileExtension, setFileExtension] = useState('');

  // Image preview states
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Thumbnail URL cache state
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  const isImageFile = (mimeType: string) => mimeType?.startsWith('image/');

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return FileImage;
    if (mimeType?.startsWith('video/')) return FileVideo;
    if (mimeType?.startsWith('audio/')) return FileAudio;
    return FileText;
  };

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

  const filteredFiles = files.filter((file) =>
    file.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

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
  }, [files, getCachedUrl, thumbnailUrls]);

  // Helper to split filename and extension
  const splitFilename = (filename: string) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return { name: filename, ext: '' };
    }
    return {
      name: filename.substring(0, lastDotIndex),
      ext: filename.substring(lastDotIndex), // includes the dot
    };
  };

  // Rename handlers
  const handleRenameClick = (file: WorkspaceFile) => {
    const { name, ext } = splitFilename(file.filename);
    setSelectedFile(file);
    setNewFileName(name);
    setFileExtension(ext);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = () => {
    if (selectedFile && newFileName.trim()) {
      const fullName = newFileName.trim() + fileExtension;
      onRename(selectedFile, fullName);
      setRenameDialogOpen(false);
      setSelectedFile(null);
      setNewFileName('');
      setFileExtension('');
    }
  };

  // Delete handlers
  const handleDeleteClick = (file: WorkspaceFile) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedFile) {
      onDelete(selectedFile);
      setDeleteDialogOpen(false);
      setSelectedFile(null);
    }
  };

  // Image preview handlers
  const handleImageClick = async (file: WorkspaceFile) => {
    if (!isImageFile(file.mimeType)) return;

    setPreviewFile(file);
    setPreviewDialogOpen(true);
    setPreviewLoading(true);

    const url = await getCachedUrl(file);
    setPreviewUrl(url);
    setPreviewLoading(false);
  };

  const handlePreviewClose = () => {
    setPreviewDialogOpen(false);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // File item with context menu
  const FileItemWrapper = ({ file, children }: { file: WorkspaceFile; children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isImageFile(file.mimeType) && (
          <ContextMenuItem onClick={() => handleImageClick(file)}>
            <FileImage className="mr-2 h-4 w-4" />
            미리보기
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onDownload(file)}>
          <Download className="mr-2 h-4 w-4" />
          다운로드
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleRenameClick(file)}>
          <Pencil className="mr-2 h-4 w-4" />
          이름 변경
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => handleDeleteClick(file)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  // Image thumbnail component
  const ImageThumbnail = ({ file, className }: { file: WorkspaceFile; className?: string }) => {
    const url = thumbnailUrls[file.id];

    if (!url) {
      return (
        <div className={`bg-primary/10 flex items-center justify-center ${className}`}>
          <FileImage className="h-5 w-5 text-primary animate-pulse" />
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={url}
          alt={file.filename}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 200px"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">파일</h2>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">파일</h2>
            <Badge variant="secondary">{files.length}개</Badge>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={viewMode === 'grid'}
                    onPressedChange={(pressed) => setViewMode(pressed ? 'grid' : 'list')}
                    size="sm"
                  >
                    {viewMode === 'grid' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  {viewMode === 'grid' ? '리스트 보기' : '그리드 보기'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  업로드
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="파일 검색..."
            className="pl-9"
          />
        </div>

        {/* Content */}
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
            <Folder className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-lg">
              아직 업로드된 파일이 없습니다
            </p>
            <Button
              variant="link"
              className="mt-2"
              onClick={handleUploadClick}
            >
              파일 업로드하기
            </Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              const isImage = isImageFile(file.mimeType);
              return (
                <FileItemWrapper key={file.id} file={file}>
                  <div
                    className={`group flex items-center gap-4 p-4 rounded-xl border border-border
                             hover:border-primary/30 hover:bg-muted/30 transition-all
                             ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
                    onClick={isImage ? () => handleImageClick(file) : undefined}
                  >
                    {/* File Icon or Thumbnail */}
                    {isImage ? (
                      <ImageThumbnail
                        file={file}
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
                            <DropdownMenuItem onClick={() => handleImageClick(file)}>
                              <FileImage className="mr-2 h-4 w-4" />
                              미리보기
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onDownload(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            다운로드
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRenameClick(file)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            이름 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(file)}
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              const isImage = isImageFile(file.mimeType);
              return (
                <FileItemWrapper key={file.id} file={file}>
                  <div
                    className={`group flex flex-col rounded-xl border border-border overflow-hidden
                             hover:border-primary/30 hover:bg-muted/30 transition-all
                             ${isImage ? 'cursor-pointer' : 'cursor-context-menu'}`}
                    onClick={isImage ? () => handleImageClick(file) : undefined}
                  >
                    {/* Thumbnail or Icon Area */}
                    {isImage ? (
                      <ImageThumbnail
                        file={file}
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
        )}
      </div>

      {/* Image Preview Dialog (Discord-style) */}
      <Dialog open={previewDialogOpen} onOpenChange={handlePreviewClose}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-sm">
          {previewFile && (
            <>
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={handlePreviewClose}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Image Area */}
              <div className="relative w-full min-h-[300px] max-h-[70vh] bg-black/50 flex items-center justify-center">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">이미지 로딩 중...</span>
                  </div>
                ) : previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={previewFile.filename}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    priority
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileImage className="h-12 w-12" />
                    <span>이미지를 불러올 수 없습니다</span>
                  </div>
                )}
              </div>

              {/* File Info Footer */}
              <div className="p-4 border-t border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate text-lg">
                      {previewFile.filename}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4" />
                        <span>{formatFileSize(previewFile.size)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateTime(previewFile.createdAt)}</span>
                      </div>
                      {previewFile.uploader && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          <span>{previewFile.uploader.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => onDownload(previewFile)}
                    className="flex-shrink-0"
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>파일 이름 변경</DialogTitle>
            <DialogDescription>
              새로운 파일 이름을 입력하세요. 확장자는 변경할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="filename" className="sr-only">
              파일 이름
            </Label>
            <div className="flex items-center gap-0">
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="파일 이름"
                className={fileExtension ? "rounded-r-none border-r-0" : ""}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm();
                  }
                }}
              />
              {fileExtension && (
                <div className="flex items-center px-3 h-9 bg-muted border border-input rounded-r-md text-sm text-muted-foreground select-none">
                  {fileExtension}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!newFileName.trim()}>
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedFile?.filename}</strong> 파일을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
