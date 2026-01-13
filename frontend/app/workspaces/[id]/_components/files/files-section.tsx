'use client';

import { useState, useRef } from 'react';
import { Folder, Upload, Search, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import type { WorkspaceFile } from '../../_lib/types';

// Sub-components
import { FileListView } from './file-list-view';
import { FilePreviewDialog } from './file-preview-dialog';
import { RenameDialog, DeleteDialog } from './file-dialogs';
import { usePresignedUrlCache } from './hooks/use-presigned-url-cache';

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

// ... imports
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

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

  // Use presigned URL cache hook
  const { thumbnailUrls, getCachedUrl, isImageFile } = usePresignedUrlCache({
    files,
    onGetPreviewUrl,
  });

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('files.title')}</h2>
          </div>
        </div>
        <div className="space-y-2">
// ...
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
            <h2 className="text-lg font-semibold">{t('files.title')}</h2>
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
                  {viewMode === 'grid' ? t('files.view_list') : t('files.view_grid')}
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
                  {t('files.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('files.upload')}
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
            placeholder={t('files.search_placeholder')}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
            <Folder className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-lg">
              {t('files.empty')}
            </p>
            <Button
              variant="link"
              className="mt-2"
              onClick={handleUploadClick}
            >
              {t('files.upload_btn')}
            </Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
            </p>
          </div>
        ) : (
          <FileListView
            files={filteredFiles}
            viewMode={viewMode}
            thumbnailUrls={thumbnailUrls}
            onDownload={onDownload}
            onRename={handleRenameClick}
            onDelete={handleDeleteClick}
            onImageClick={handleImageClick}
          />
        )}
      </div>

      {/* Image Preview Dialog */}
      <FilePreviewDialog
        isOpen={previewDialogOpen}
        onOpenChange={handlePreviewClose}
        file={previewFile}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        onDownload={onDownload}
      />

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        file={selectedFile}
        newFileName={newFileName}
        fileExtension={fileExtension}
        onFileNameChange={setNewFileName}
        onConfirm={handleRenameConfirm}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        file={selectedFile}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
