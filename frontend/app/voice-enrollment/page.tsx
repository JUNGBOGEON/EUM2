'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder } from '@/components/voice-enrollment/VoiceRecorder';
import { Button } from '@/components/ui/button';
import { useVoiceEnrollment } from '@/hooks/useVoiceEnrollment';
import { Mic, CheckCircle2, Loader2, ArrowRight, Volume2, AlertCircle } from 'lucide-react';

type Step = 'intro' | 'record' | 'processing' | 'complete' | 'error';

const SAMPLE_TEXT_KO = `안녕하세요. 저는 EUM 서비스를 통해 음성 더빙 기능을 테스트하고 있습니다. 이 문장은 약 5초 정도의 녹음 시간이 필요합니다.`;

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function VoiceEnrollmentPage() {
  const [step, setStep] = useState<Step>('intro');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const router = useRouter();
  const { enrollVoice, isLoading } = useVoiceEnrollment();

  const handleRecordingComplete = useCallback((audioBlob: Blob) => {
    setRecordedBlob(audioBlob);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!recordedBlob) return;

    setStep('processing');
    setErrorMessage('');

    try {
      await enrollVoice(recordedBlob);
      setStep('complete');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '음성 등록 중 오류가 발생했습니다.'
      );
      setStep('error');
    }
  }, [recordedBlob, enrollVoice]);

  const handleSkip = useCallback(() => {
    router.push('/workspaces');
  }, [router]);

  const handleRetry = useCallback(() => {
    setRecordedBlob(null);
    setErrorMessage('');
    setStep('record');
  }, []);

  const handleComplete = useCallback(() => {
    router.push('/workspaces');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <AnimatePresence mode="wait">
        {/* Step 1: Introduction */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-md w-full"
          >
            <div className="bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mic className="h-10 w-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">음성 더빙을 사용하시겠습니까?</h1>
                <p className="text-muted-foreground">
                  실시간 번역 시 본인의 목소리로 음성이 합성됩니다.
                  <br />
                  다른 언어로 말해도 당신의 목소리로 들립니다.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">지원 언어</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  한국어, 영어, 일본어, 중국어
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={() => setStep('record')} className="gap-2">
                  <Mic className="h-5 w-5" />
                  음성 등록하기
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  나중에 설정
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Recording */}
        {step === 'record' && (
          <motion.div
            key="record"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-lg w-full"
          >
            <div className="bg-card rounded-2xl shadow-lg p-8 space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">다음 문장을 읽어주세요</h1>
                <p className="text-sm text-muted-foreground">
                  조용한 환경에서 녹음해 주세요
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6">
                <p className="text-lg leading-relaxed">&ldquo;{SAMPLE_TEXT_KO}&rdquo;</p>
              </div>

              <VoiceRecorder
                onRecordingComplete={handleRecordingComplete}
                minDuration={3}
                maxDuration={10}
              />

              {recordedBlob && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <Button size="lg" onClick={handleSubmit} className="gap-2">
                    등록하기
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  건너뛰기
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-md w-full"
          >
            <div className="bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">음성을 분석 중입니다</h1>
                <p className="text-muted-foreground">
                  잠시만 기다려 주세요...
                  <br />
                  AI가 당신의 목소리를 학습하고 있습니다.
                </p>
              </div>

              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-primary rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-md w-full"
          >
            <div className="bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">음성 등록 완료!</h1>
                <p className="text-muted-foreground">
                  이제 회의에서 실시간 번역 시
                  <br />
                  본인의 목소리로 음성이 합성됩니다.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-medium">설정에서 언제든지 변경 가능합니다</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 음성 더빙 켜기/끄기</li>
                  <li>• 음성 데이터 재등록</li>
                  <li>• 음성 데이터 삭제</li>
                </ul>
              </div>

              <Button size="lg" onClick={handleComplete} className="gap-2">
                시작하기
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <motion.div
            key="error"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-md w-full"
          >
            <div className="bg-card rounded-2xl shadow-lg p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">등록에 실패했습니다</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={handleRetry} className="gap-2">
                  다시 시도
                </Button>
                <Button variant="ghost" onClick={handleSkip}>
                  나중에 설정
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
