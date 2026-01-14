import { Header } from '@/components/landing/header';
import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Footer } from '@/components/landing/footer';
import { Manifesto } from '@/components/landing/manifesto';
import { Flow } from '@/components/landing/flow';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black">
      <Header />
      <main>
        <Hero />
        <Flow />
        <Manifesto />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
