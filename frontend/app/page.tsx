'use client';

import { useState } from 'react';
import { Header } from '@/components/landing/header';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Footer } from '@/components/landing/footer';
import { Manifesto } from '@/components/landing/manifesto';
import { Flow } from '@/components/landing/flow';
import { LoginModal } from '@/components/auth/login-modal';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />
      <main>
        <Hero onLoginClick={() => setIsLoginModalOpen(true)} />
        <Flow />
        <Manifesto />
        <Features />
      </main>
      <Footer />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
