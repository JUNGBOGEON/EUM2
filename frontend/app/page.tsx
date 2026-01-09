import { Header } from '@/components/landing/header';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#191919]">
      <Header />
      <main>
        <Hero />
        <Features />
      </main>
    </div>
  );
}
