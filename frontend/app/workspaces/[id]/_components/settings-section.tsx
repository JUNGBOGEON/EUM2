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
import { RoleManagementSection } from './role-management-section';
import type { MemberPermissions } from '@/lib/types/workspace';

interface SettingsSectionProps {
  workspace: Workspace;
  isOwner: boolean;
  permissions?: MemberPermissions;
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
  permissions,
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10">
            <Settings className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t('settings_title')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Manage workspace details and preferences</p>
          </div>
        </div>

        {hasChanges && isOwner && (
          <Button onClick={handleSave} disabled={isSaving} className="bg-white text-black hover:bg-neutral-200">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('save')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Language Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-400" />
              {t('language_settings')}
            </Label>
            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                <SelectValue placeholder={t('select_language')} />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10 text-white">
                <SelectItem value="ko" className="focus:bg-white/10 focus:text-white">한국어</SelectItem>
                <SelectItem value="en" className="focus:bg-white/10 focus:text-white">English</SelectItem>
                <SelectItem value="zh-CN" className="focus:bg-white/10 focus:text-white">中文 (简体)</SelectItem>
                <SelectItem value="ja" className="focus:bg-white/10 focus:text-white">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profile Image Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-neutral-300">{t('profile_image')}</Label>
            <div className="flex items-center gap-6 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div
                className="relative w-24 h-24 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer group shadow-lg"
                onClick={() => isOwner && thumbnailInputRef.current?.click()}
              >
                {thumbnail ? (
                  <>
                    <img
                      src={thumbnail}
                      alt={t('profile_image')}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {isOwner && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-500 bg-white/5">
                    <span className="text-3xl font-bold">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                    {isOwner && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 max-w-[200px] leading-relaxed">
                  {t('recommended_size')}
                </p>
                {isOwner && thumbnail && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                    onClick={() => {
                      setThumbnail('');
                      setHasChanges(true);
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
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

          {/* Name Section */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-neutral-300">
              {t('workspace_name')}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={handleInputChange(setName)}
              placeholder={t('workspace_name')}
              disabled={!isOwner}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold text-neutral-300">
              {t('description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={handleInputChange(setDescription)}
              placeholder={t('description_placeholder')}
              disabled={!isOwner}
              className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white/20 resize-none min-h-[120px]"
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* Banner Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-neutral-300">{t('banner_image')}</Label>
            <div
              className="relative h-48 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer group shadow-lg"
              onClick={() => isOwner && bannerInputRef.current?.click()}
            >
              {banner ? (
                <>
                  <img
                    src={banner}
                    alt={t('banner_image')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {isOwner && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 bg-white/[0.02]">
                  <div className="p-4 rounded-full bg-white/5 mb-3 group-hover:bg-white/10 transition-colors">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">
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

          {/* Info Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-neutral-300">{t('workspace_info')}</Label>
            <div className="grid gap-1 text-sm bg-white/5 rounded-xl border border-white/5 p-4">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-neutral-500">{t('created_at')}</span>
                <span className="text-neutral-300 font-mono">
                  {new Date(workspace.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {workspace.updatedAt && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-neutral-500">{t('last_updated')}</span>
                  <span className="text-neutral-300 font-mono">
                    {new Date(workspace.updatedAt).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'zh-CN' ? 'zh-CN' : 'ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">{t('admin')}</span>
                <span className="text-neutral-300 flex items-center gap-2">
                  {workspace.owner?.name || '-'}
                  {workspace.owner && <CrownWrapper />}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Role Management Section */}
      {(isOwner || permissions?.managePermissions) && (
        <>
          <RoleManagementSection
            workspaceId={workspace.id}
            isOwner={isOwner}
            canManagePermissions={permissions?.managePermissions}
          />
          <Separator className="bg-white/5" />
        </>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-bold text-red-500">{t('danger_zone')}</Label>
            <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-400">{t('delete_workspace')}</h4>
                  <p className="text-sm text-red-400/70 mt-1 max-w-xl">
                    {t('delete_warning')}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-4 bg-red-500 hover:bg-red-600 text-white border-none"
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
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">{t('confirm_delete_title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              <strong>{workspace.name}</strong> {t('confirm_delete_desc').replace('이 워크스페이스를', '')}
              <br /><br />
              <span className="text-red-400/80">{t('delete_warning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600 border-none"
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

function CrownWrapper() {
  return (
    <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
      <span className="text-[8px] text-black font-bold">👑</span>
    </div>
  )
}
