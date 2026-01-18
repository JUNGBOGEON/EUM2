'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, Globe, Mic, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useVoiceEnrollment } from '@/hooks/useVoiceEnrollment';
import { VoiceRecorder } from '@/components/voice-enrollment/VoiceRecorder';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const LANGUAGES = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

const SAMPLE_TEXT_KO = `안녕하세요. 저는 EUM 서비스를 통해 음성 더빙 기능을 테스트하고 있습니다. 이 문장은 약 5초 정도의 녹음 시간이 필요합니다.`;

type VoiceEnrollStep = 'intro' | 'record' | 'processing' | 'complete' | 'error';

export function GlobalSettings() {
    const { language, setLanguage, t } = useLanguage();

    // Voice enrollment state
    const {
        enrollVoice,
        getVoiceStatus,
        toggleVoiceDubbing,
        deleteVoiceData,
        isLoading: isVoiceLoading,
    } = useVoiceEnrollment();

    const [voiceStatus, setVoiceStatus] = useState<{
        hasVoiceEmbedding: boolean;
        voiceDubbingEnabled: boolean;
        voiceEnrolledAt: string | null;
    } | null>(null);

    const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
    const [voiceStep, setVoiceStep] = useState<VoiceEnrollStep>('intro');
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    // Fetch voice status on mount
    useEffect(() => {
        const fetchVoiceStatus = async () => {
            try {
                const status = await getVoiceStatus();
                setVoiceStatus(status);
            } catch {
                // User may not be logged in or API error
                setVoiceStatus(null);
            }
        };
        fetchVoiceStatus();
    }, [getVoiceStatus]);

    const handleRecordingComplete = useCallback((audioBlob: Blob) => {
        setRecordedBlob(audioBlob);
    }, []);

    const handleSubmitVoice = useCallback(async () => {
        if (!recordedBlob) return;

        setVoiceStep('processing');
        setErrorMessage('');

        try {
            await enrollVoice(recordedBlob);
            setVoiceStep('complete');
            // Refresh voice status
            const status = await getVoiceStatus();
            setVoiceStatus(status);
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : '음성 등록 중 오류가 발생했습니다.'
            );
            setVoiceStep('error');
        }
    }, [recordedBlob, enrollVoice, getVoiceStatus]);

    const handleVoiceDialogClose = useCallback(() => {
        setVoiceDialogOpen(false);
        setVoiceStep('intro');
        setRecordedBlob(null);
        setErrorMessage('');
    }, []);

    const handleToggleVoiceDubbing = useCallback(async (enabled: boolean) => {
        try {
            await toggleVoiceDubbing(enabled);
            setVoiceStatus(prev => prev ? { ...prev, voiceDubbingEnabled: enabled } : null);
        } catch {
            // Error handled in hook
        }
    }, [toggleVoiceDubbing]);

    const handleDeleteVoice = useCallback(async () => {
        setIsDeleting(true);
        try {
            await deleteVoiceData();
            setVoiceStatus({
                hasVoiceEmbedding: false,
                voiceDubbingEnabled: false,
                voiceEnrolledAt: null,
            });
            setDeleteDialogOpen(false);
        } catch {
            // Error handled in hook
        } finally {
            setIsDeleting(false);
        }
    }, [deleteVoiceData]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

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

                    {/* Voice Dubbing Section */}
                    <div className="bg-neutral-900/50 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <Mic className="text-white/60" size={18} />
                                <span className="font-medium text-white">음성 더빙</span>
                                {voiceStatus?.hasVoiceEmbedding && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                        등록됨
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Description */}
                            <p className="text-sm text-neutral-400">
                                실시간 번역 시 본인의 목소리로 음성이 합성됩니다.
                                <br />
                                다른 언어로 말해도 당신의 목소리로 들립니다.
                            </p>

                            {/* Voice Status & Actions */}
                            {voiceStatus?.hasVoiceEmbedding ? (
                                <>
                                    {/* Toggle Switch */}
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${voiceStatus.voiceDubbingEnabled ? 'bg-purple-500/20' : 'bg-neutral-800'}`}>
                                                <Mic className={`${voiceStatus.voiceDubbingEnabled ? 'text-purple-400' : 'text-neutral-500'}`} size={16} />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-white">음성 더빙 사용</span>
                                                {voiceStatus.voiceEnrolledAt && (
                                                    <p className="text-xs text-neutral-500">
                                                        {formatDate(voiceStatus.voiceEnrolledAt)} 등록
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={voiceStatus.voiceDubbingEnabled}
                                            onCheckedChange={handleToggleVoiceDubbing}
                                            disabled={isVoiceLoading}
                                        />
                                    </div>

                                    {/* Re-record & Delete Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setVoiceStep('record');
                                                setVoiceDialogOpen(true);
                                            }}
                                            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                        >
                                            <Mic className="mr-2 h-4 w-4" />
                                            다시 녹음
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setDeleteDialogOpen(true)}
                                            className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                /* Register Button */
                                <Button
                                    onClick={() => {
                                        setVoiceStep('intro');
                                        setVoiceDialogOpen(true);
                                    }}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    <Mic className="mr-2 h-4 w-4" />
                                    음성 등록하기
                                </Button>
                            )}

                            {/* Supported Languages Info */}
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <span>지원 언어:</span>
                                <span className="text-neutral-400">한국어, 영어, 일본어, 중국어</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Voice Enrollment Dialog */}
            <Dialog open={voiceDialogOpen} onOpenChange={(open) => !open && handleVoiceDialogClose()}>
                <DialogContent className="sm:max-w-lg bg-neutral-900 border-white/10 text-white">
                    {/* Step: Intro */}
                    {voiceStep === 'intro' && (
                        <>
                            <DialogHeader>
                                <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Mic className="h-8 w-8 text-purple-400" />
                                </div>
                                <DialogTitle className="text-center text-xl">음성 등록</DialogTitle>
                                <DialogDescription className="text-center text-neutral-400">
                                    실시간 번역 시 본인의 목소리로 음성이 합성됩니다.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-white/5 rounded-lg p-4 text-sm text-neutral-300">
                                    <p className="font-medium mb-2">녹음 안내</p>
                                    <ul className="space-y-1 text-neutral-400">
                                        <li>• 조용한 환경에서 녹음해 주세요</li>
                                        <li>• 3~10초 정도의 음성이 필요합니다</li>
                                        <li>• 자연스럽게 또박또박 읽어주세요</li>
                                    </ul>
                                </div>
                                <Button
                                    onClick={() => setVoiceStep('record')}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    녹음 시작하기
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step: Record */}
                    {voiceStep === 'record' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-center">다음 문장을 읽어주세요</DialogTitle>
                                <DialogDescription className="text-center text-neutral-400">
                                    조용한 환경에서 녹음해 주세요
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                <div className="bg-white/5 rounded-lg p-4">
                                    <p className="text-sm text-neutral-300 leading-relaxed">
                                        &ldquo;{SAMPLE_TEXT_KO}&rdquo;
                                    </p>
                                </div>
                                <VoiceRecorder
                                    onRecordingComplete={handleRecordingComplete}
                                    minDuration={3}
                                    maxDuration={10}
                                />
                                {recordedBlob && (
                                    <Button
                                        onClick={handleSubmitVoice}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        등록하기
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Step: Processing */}
                    {voiceStep === 'processing' && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">음성을 분석 중입니다</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    AI가 당신의 목소리를 학습하고 있습니다...
                                </p>
                            </div>
                            <div className="flex justify-center gap-1">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step: Complete */}
                    {voiceStep === 'complete' && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">음성 등록 완료!</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    이제 회의에서 실시간 번역 시 본인의 목소리로 음성이 합성됩니다.
                                </p>
                            </div>
                            <Button
                                onClick={handleVoiceDialogClose}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                완료
                            </Button>
                        </div>
                    )}

                    {/* Step: Error */}
                    {voiceStep === 'error' && (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">등록에 실패했습니다</h3>
                                <p className="text-sm text-neutral-400 mt-1">{errorMessage}</p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                <Button
                                    onClick={() => {
                                        setRecordedBlob(null);
                                        setVoiceStep('record');
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    다시 시도
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleVoiceDialogClose}
                                    className="border-white/20 hover:bg-white/10"
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-white">
                    <DialogHeader>
                        <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-6 w-6 text-red-400" />
                        </div>
                        <DialogTitle className="text-center">음성 데이터 삭제</DialogTitle>
                        <DialogDescription className="text-center text-neutral-400">
                            등록된 음성 데이터를 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="flex-1 border-white/20 hover:bg-white/10"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleDeleteVoice}
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                '삭제'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
