'use client';

export function Flow() {
    return (
        <section className="py-20 bg-black overflow-hidden border-y border-white/5 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="mx-auto max-w-full px-4 overflow-hidden">
                <div className="flex items-center gap-10 animate-infinite-scroll whitespace-nowrap">
                    {/* Repeated Flow Elements */}
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-10">
                            <span className="text-[100px] md:text-[180px] font-black tracking-tighter text-transparent stroke-text opacity-20 hover:opacity-100 transition-opacity duration-500 cursor-default">
                                FLOW
                            </span>
                            <div className="w-[200px] h-[1px] bg-white/20 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white w-1/2 animate-flow-line" />
                            </div>
                            <span className="text-[100px] md:text-[180px] font-black tracking-tighter text-transparent stroke-text opacity-20 hover:opacity-100 transition-opacity duration-500 cursor-default">
                                CONNECT
                            </span>
                            <div className="w-[200px] h-[1px] bg-white/20 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white w-1/2 animate-flow-line delay-75" />
                            </div>
                            <span className="text-[100px] md:text-[180px] font-black tracking-tighter text-transparent stroke-text opacity-20 hover:opacity-100 transition-opacity duration-500 cursor-default">
                                SYNC
                            </span>
                            <div className="w-[200px] h-[1px] bg-white/20 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white w-1/2 animate-flow-line delay-150" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .stroke-text {
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
        }
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes flow-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 40s linear infinite;
        }
        .animate-flow-line {
          animation: flow-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
        </section>
    );
}
