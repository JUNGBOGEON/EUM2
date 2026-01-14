const features = [
  {
    title: '공명 (Resonance)',
    engTitle: 'Real-time AI Translation',
    description: '당신의 말소리를 AI가 즉시 인식하고 번역합니다.\n상대방의 언어로 자연스럽게 전달되는 경험을 하세요.',
  },
  {
    title: '현존 (Presence)',
    engTitle: 'High-fidelity Video',
    description: '끊김 없는 고화질 화상회의로 마치 같은 공간에 있는 것처럼.\n미세한 표정과 제스처까지 생생하게 전달합니다.',
  },
  {
    title: '구축 (Construction)',
    engTitle: 'Collaborative Workspace',
    description: '화이트보드, 파일 공유, 채팅이 하나로 통합된 공간.\n팀원들과 함께 아이디어를 시각화하고 발전시키세요.',
  },
];

export function Features() {
  return (
    <section className="py-40 bg-black text-white px-4">
      <div className="mx-auto max-w-[1080px]">
        {/* Section Header */}
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8">
          <h2 className="text-[32px] font-bold tracking-tighter">
            경계를 허무는<br />
            세 가지 핵심 기술.
          </h2>
          <p className="mt-4 md:mt-0 text-[13px] text-white/50 font-mono text-right">
            복잡함은 줄이고,<br />
            가능성은 넓혔습니다.
          </p>
        </div>

        {/* The Trigons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-20">
          {features.map((feature, i) => (
            <div key={feature.title} className="group flex flex-col border-t border-white/20 pt-6 hover:border-white transition-colors duration-500">
              <span className="text-[10px] font-mono text-white/40 mb-4">0{i + 1}</span>
              <h3 className="text-[24px] font-bold mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-[11px] font-mono text-white/30 mb-8 uppercase tracking-wider">
                {feature.engTitle}
              </p>
              <p className="text-[15px] leading-[1.7] text-white/70 whitespace-pre-line">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
