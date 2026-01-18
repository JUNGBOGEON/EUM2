'use client';

import { useState, useRef } from 'react';
import { Folder, Upload, Search, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import type { WorkspaceFile } from '../../_lib/types';
import { FileListView } from './file-list-view';
import { FilePreviewDialog } from './file-preview-dialog';
import { RenameDialog, DeleteDialog } from './file-dialogs';
import { usePresignedUrlCache } from './hooks/use-presigned-url-cache';
import { useLanguage } from '@/contexts/LanguageContext';

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
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-white/10 rounded-lg" />
          <div className="h-9 w-24 bg-white/10 rounded-lg" />
        </div>
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header - Minimal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t('files.title')}
              <span className="text-neutral-500 text-sm font-normal">{files.length}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={() => setViewMode('list')}
                size="sm"
                className="data-[state=on]:bg-white/10 data-[state=on]:text-white text-neutral-500 hover:text-white transition-all rounded-md h-7 w-7 p-0"
              >
                <List className="h-3.5 w-3.5" />
              </Toggle>
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={() => setViewMode('grid')}
                size="sm"
                className="data-[state=on]:bg-white/10 data-[state=on]:text-white text-neutral-500 hover:text-white transition-all rounded-md h-7 w-7 p-0"
              >
                <Grid className="h-3.5 w-3.5" />
              </Toggle>
            </div>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="bg-white text-black hover:bg-neutral-200 h-8 font-medium rounded-lg text-xs px-3"
            >
              {isUploading ? (
                <>
                  <span className="h-3 w-3 border-2 border-neutral-400 border-t-black rounded-full animate-spin mr-2" />
                  {t('files.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
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

        {/* Search - Minimal */}
        <div className="relative group max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-500 group-focus-within:text-neutral-300 transition-colors" />
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('files.search_placeholder')}
            className="pl-10 h-10 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-600 rounded-lg focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20 transition-all hover:border-neutral-700"
          />
        </div>

        {/* Content */}
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-white/5 mt-8">
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 text-neutral-500">
              <Folder className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-medium text-white mb-1">{t('files.empty')}</h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-sm">
              Get started by uploading documents, images, or other resources.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              className="border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 h-8"
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              {t('files.upload_btn')}
            </Button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-white/5 mt-8">
            <p className="text-neutral-500 text-sm">
              No files found matching &quot;<span className="text-white">{searchQuery}</span>&quot;
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
