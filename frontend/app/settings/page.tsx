'use client';

import { useRouter } from 'next/navigation';
import { Settings, ArrowLeft, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/workspaces')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('app_settings')}</h1>
          </div>
        </div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Language Settings */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{t('language_settings')}</h2>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('select_language')}</Label>
              <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                <SelectTrigger className="w-full sm:w-[300px]">
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
          </div>
        </div>
      </div>
    </div>
  );
}
