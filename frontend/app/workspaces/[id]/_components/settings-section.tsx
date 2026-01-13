'use client';

import { useState, useRef } from 'react';
import {
  Settings,
  Camera,
  ImageIcon,
  Save,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from 'sonner';
import type { Workspace } from '../_lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface SettingsSectionProps {
  workspace: Workspace;
  isOwner: boolean;
  onUpdateWorkspace: (data: {
    name?: string;
    description?: string;
    thumbnail?: string;
    banner?: string;
  }) => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
}

export function SettingsSection({
  workspace,
  isOwner,
  onUpdateWorkspace,
  onDeleteWorkspace,
}: SettingsSectionProps) {
  const { t, language, setLanguage } = useLanguage();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [thumbnail, setThumbnail] = useState(workspace.thumbnail || '');
  const [banner, setBanner] = useState(workspace.banner || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth = 400, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400, 0.8);
      setThumbnail(compressed);
      setHasChanges(true);
    } catch (error) {
      toast.error('이미지 처리에 실패했습니다');
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1200, 0.8);
      setBanner(compressed);
      setHasChanges(true);
    } catch (error) {
      toast.error('이미지 처리에 실패했습니다');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('workspace_name') + '을 입력해주세요');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        thumbnail: thumbnail || undefined,
        banner: banner || undefined,
      });
      setHasChanges(false);
      toast.success(t('save') + '되었습니다');
    } catch (error) {
      toast.error('저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteWorkspace();
    } catch (error) {
      toast.error('삭제에 실패했습니다');
      setIsDeleting(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('settings_title')}</h2>
        </div>
        {hasChanges && isOwner && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('save')}
          </Button>
        )}
      </div>

      {/* Language Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('language_settings')}
        </Label>
        <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
          <SelectTrigger className="max-w-[200px]">
            <SelectValue placeholder={t('select_language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh-CN">中文 (简体)</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Banner Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('banner_image')}</Label>
        <div
          className="relative h-40 rounded-xl overflow-hidden bg-muted border border-border cursor-pointer group"
          onClick={() => isOwner && bannerInputRef.current?.click()}
        >
          {banner ? (
            <>
              <img
                src={banner}
                alt={t('banner_image')}
                className="w-full h-full object-cover"
              />
              {isOwner && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mb-2" />
              <p className="text-sm">
                {isOwner ? t('click_to_add_banner') : t('no_banner_image')}
              </p>
            </div>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerChange}
          disabled={!isOwner}
        />
      </div>

      {/* Profile Image Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('profile_image')}</Label>
        <div className="flex items-center gap-4">
          <div
            className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted border border-border cursor-pointer group"
            onClick={() => isOwner && thumbnailInputRef.current?.click()}
          >
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt={t('profile_image')}
                  className="w-full h-full object-cover"
                />
                {isOwner && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <span className="text-3xl font-bold">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('recommended_size')}
            </p>
            {isOwner && thumbnail && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setThumbnail('');
                  setHasChanges(true);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                {t('delete')}
              </Button>
            )}
          </div>
        </div>
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleThumbnailChange}
          disabled={!isOwner}
        />
      </div>

      <Separator />

      {/* Name Section */}
      <div className="space-y-3">
        <Label htmlFor="name" className="text-sm font-medium">
          {t('workspace_name')}
        </Label>
        <Input
          id="name"
          value={name}
          onChange={handleInputChange(setName)}
          placeholder={t('workspace_name')}
          disabled={!isOwner}
          className="max-w-md"
        />
      </div>

      {/* Description Section */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-sm font-medium">
          {t('description')}
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={handleInputChange(setDescription)}
          placeholder={t('description_placeholder')}
          disabled={!isOwner}
          className="max-w-md resize-none"
          rows={4}
        />
      </div>

      {/* Info Section */}
      <Separator />

      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('workspace_info')}</Label>
        <div className="grid gap-4 text-sm max-w-md">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">{t('created_at')}</span>
            <span className="text-foreground">
              {new Date(workspace.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          {workspace.updatedAt && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">{t('last_updated')}</span>
              <span className="text-foreground">
                {new Date(workspace.updatedAt).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">{t('admin')}</span>
            <span className="text-foreground">{workspace.owner?.name || '-'}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium text-destructive">{t('danger_zone')}</Label>
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{t('delete_workspace')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('delete_warning')}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete_workspace')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{workspace.name}</strong> {t('confirm_delete_desc').replace('이 워크스페이스를', '')}
              <br /><br />
              {t('delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
