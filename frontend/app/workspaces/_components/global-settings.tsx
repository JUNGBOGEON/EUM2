'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, Globe, ChevronRight } from 'lucide-react';

const LANGUAGES = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function GlobalSettings() {
    const { language, setLanguage, t } = useLanguage();

    const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    return (
        <div className="flex-1 flex flex-col bg-black/50 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
                        <Settings className="text-white/60" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">{t('menu.settings')}</h1>
                        <p className="text-sm text-neutral-500">{t('settings.description') || 'Manage your preferences'}</p>
                    </div>
                </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Language Section */}
                    <div className="bg-neutral-900/50 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Globe className="text-white/60" size={18} />
                                <span className="font-medium text-white">{t('settings.language')}</span>
                            </div>
                        </div>

                        <div className="p-2">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code as any)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${language === lang.code
                                            ? 'bg-white/10 text-white'
                                            : 'hover:bg-white/5 text-neutral-400'
                                        }`}
                                >
                                    <span className="text-xl">{lang.flag}</span>
                                    <span className="flex-1 text-left font-medium">{lang.label}</span>
                                    {language === lang.code && (
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
