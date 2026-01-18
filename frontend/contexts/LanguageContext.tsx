'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import translations from '../lang.json';

export type Language = 'ko' | 'en' | 'zh-CN' | 'ja';
type TranslationKey = keyof typeof translations.ko;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ko');

    useEffect(() => {
        // Load saved language from localStorage
        const savedLanguage = localStorage.getItem('app-language') as Language;
        if (savedLanguage && ['ko', 'en', 'zh-CN', 'ja'].includes(savedLanguage)) {
            setLanguageState(savedLanguage);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-language', lang);
    };

    const t = (key: string): string => {
        const keys = key.split('.');

        // Try current language
        let value: any = translations[language];
        for (const k of keys) {
            if (value === undefined || value === null) break;
            value = value[k];
        }
        if (value !== undefined && typeof value === 'string') return value;

        // Fallback to default language (ko)
        value = translations['ko'];
        for (const k of keys) {
            if (value === undefined || value === null) break;
            value = value[k];
        }

        return (value !== undefined && typeof value === 'string') ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
