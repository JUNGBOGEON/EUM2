'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Camera, X, ArrowRight } from 'lucide-react';

interface StepProfileProps {
  name: string;
  setName: (name: string) => void;
  profileImage: string | null;
  setProfileImage: (image: string | null) => void;
  onNext: () => void;
}

// Compress image to reduce payload size
const compressImage = (file: File, maxWidth = 400, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
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

export function StepProfile({
  name,
  setName,
  profileImage,
  setProfileImage,
  onNext,
}: StepProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress image before storing
        const compressedImage = await compressImage(file, 400, 0.7);
        setProfileImage(compressedImage);
      } catch (error) {
        console.error('Failed to compress image:', error);
        // Fallback to original if compression fails
        const reader = new FileReader();
        reader.onload = (event) => {
          setProfileImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      onNext();
    }
  };

  return (
    <div className="h-full flex flex-col justify-center">
      {/* Step Number */}
      <div className="mb-6">
        <span className="text-xs font-medium text-muted-foreground/50 tracking-widest">
          STEP 01
        </span>
      </div>

      {/* Title */}
      <div className="mb-12">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          새 워크스페이스
        </h1>
        <p className="text-muted-foreground/70 mt-2 text-sm">
          프로필과 이름을 설정하세요
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8 mb-12">
        {/* Profile Image */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-2xl bg-muted/30 hover:bg-muted/50 cursor-pointer overflow-hidden flex items-center justify-center transition-all duration-200"
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            {profileImage && (
              <button
                onClick={handleRemoveImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Name Input */}
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="워크스페이스 이름"
            maxLength={50}
            className="w-full h-12 text-base bg-transparent border-0 border-b border-border/50 focus:border-foreground/30 px-0 outline-none placeholder:text-muted-foreground/40 transition-colors"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground/40 text-right mt-2">
            {name.length}/50
          </p>
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="group flex items-center justify-center gap-2 w-full h-12 bg-foreground text-background text-sm font-medium disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        다음
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
