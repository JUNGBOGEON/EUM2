import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-20 bg-black border-t border-white/10">
      <div className="mx-auto max-w-[1080px] px-4 text-center">
        <p className="text-[18px] md:text-[24px] font-bold tracking-tight text-white mb-8">
          경계 없는 세상의 시작.<br />
          <span className="text-[100px] leading-none block mt-4 font-black tracking-tighter opacity-20 hover:opacity-100 transition-opacity duration-700 cursor-default">
            EUM.
          </span>
        </p>

        <div className="flex justify-center gap-8 mt-12 text-[11px] font-mono text-white/30 uppercase tracking-widest">
          <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-white transition-colors">Contact</Link>
        </div>

        <p className="mt-8 text-[10px] text-white/20 font-mono">
          © 2024 EUM. THE ARCHITECTURE OF SILENCE.
        </p>
      </div>
    </footer>
  );
}
