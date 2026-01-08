const features = [
  {
    title: '실시간 번역',
    description: '당신의 언어로 말하세요. 상대방은 그들의 언어로 듣습니다.',
  },
  {
    title: '화상회의',
    description: '거리는 숫자일 뿐. 함께하는 순간은 어디서든 만들어집니다.',
  },
  {
    title: '워크스페이스',
    description: '흩어진 대화를 하나로. 팀의 이야기가 모이는 곳.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 border-t border-[#e3e2e0] dark:border-[#ffffff14]">
      <div className="mx-auto max-w-[1080px] px-4">
        <p className="text-sm font-medium text-[#37352f80] mb-10 dark:text-[#ffffff40]">
          핵심 기능
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature) => (
            <div key={feature.title}>
              <h3 className="text-[18px] font-semibold text-[#37352f] dark:text-[#ffffffcf]">
                {feature.title}
              </h3>
              <p className="mt-3 text-[15px] text-[#37352fa6] leading-[1.7] dark:text-[#ffffff71]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
