'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../_lib/constants';

// Import step components
import { StepProfile } from '../create/_components/step-profile';
import { StepDescription } from '../create/_components/step-description';
import { StepInvite } from '../create/_components/step-invite';

interface InvitedUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const pageTransition = {
  type: 'tween' as const,
  ease: [0.16, 1, 0.3, 1] as const, // Custom ease-out curve
  duration: 0.25,
};

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow exit animation
      const timer = setTimeout(() => {
        setCurrentStep(1);
        setName('');
        setDescription('');
        setProfileImage(null);
        setInvitedUsers([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Play video when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          thumbnail: profileImage || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '워크스페이스 생성에 실패했습니다.');
      }

      const workspace = await response.json();

      // Invite users if any
      if (invitedUsers.length > 0) {
        const invitePromises = invitedUsers.map((user) =>
          fetch(`${API_URL}/api/workspaces/${workspace.id}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId: user.id }),
          })
        );
        await Promise.allSettled(invitePromises);
      }

      toast.success('워크스페이스가 생성되었습니다!');
      onSuccess();
      onClose();
      router.push(`/workspaces/${workspace.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const slideVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? 40 : -40,
    }),
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? -40 : 40,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{
              type: 'tween' as const,
              ease: [0.16, 1, 0.3, 1], // Fast start, slow end
              duration: 0.5,
            }}
            className="fixed inset-0 z-50 flex"
          >
            {/* Left Side - Video (70%) */}
            <div className="hidden lg:flex lg:w-[70%] relative bg-background overflow-hidden">
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              >
                <source src="/video/idea_motion_graphics.MOV" type="video/mp4" />
              </video>
              {/* Gradient overlay for smooth transition to right panel */}
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-background" />
            </div>

            {/* Right Side - Form (30%) */}
            <div className="w-full lg:w-[30%] min-w-[420px] flex flex-col bg-background">
              {/* Minimal Header */}
              <header className="flex items-center justify-between px-8 py-6">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((step) => (
                    <motion.div
                      key={step}
                      initial={false}
                      animate={{
                        width: step === currentStep ? 24 : 6,
                        backgroundColor:
                          step <= currentStep
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--muted))',
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </header>

              {/* Form Content */}
              <div className="flex-1 overflow-hidden px-8 pb-8">
                <AnimatePresence mode="wait" custom={direction}>
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      custom={direction}
                      variants={slideVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="h-full"
                    >
                      <StepProfile
                        name={name}
                        setName={setName}
                        profileImage={profileImage}
                        setProfileImage={setProfileImage}
                        onNext={() => goToStep(2)}
                      />
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      custom={direction}
                      variants={slideVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="h-full"
                    >
                      <StepDescription
                        description={description}
                        setDescription={setDescription}
                        onNext={() => goToStep(3)}
                        onBack={() => goToStep(1)}
                        onSkip={() => goToStep(3)}
                      />
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      custom={direction}
                      variants={slideVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={pageTransition}
                      className="h-full"
                    >
                      <StepInvite
                        invitedUsers={invitedUsers}
                        setInvitedUsers={setInvitedUsers}
                        onSubmit={handleSubmit}
                        onBack={() => goToStep(2)}
                        onSkip={handleSubmit}
                        isSubmitting={isSubmitting}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
