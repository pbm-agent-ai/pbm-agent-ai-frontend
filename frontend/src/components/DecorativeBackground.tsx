/**
 * 장식용 기하학 배경 요소 (Abstract Geometric + Glassmorphism)
 *
 * @param variant 'full' — 대시보드용 (3D glass, particles, diagonals 포함)
 *                'minimal' — 내부 페이지용 (부드러운 글로우만, opacity 절반)
 */
export default function DecorativeBackground({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  const isFull = variant === 'full';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 [-webkit-mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,transparent_15%,black_60%)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,transparent_15%,black_60%)]">
      {/* 우측 상단: 거대한 기울어진 둥근 사각형 (Diagonal Pill) */}
      <div className={`absolute -top-[5%] -right-[10%] md:-top-[10%] md:-right-[5%] w-[30rem] h-[15rem] md:w-[40rem] md:h-[20rem] lg:w-[50rem] lg:h-[25rem] rounded-[10rem] -rotate-12 bg-gradient-to-r ${isFull ? 'from-[#1E4D8C]/15 to-[#DBE2EF]/25 dark:from-[#1E4D8C]/20 dark:to-[#7BAEDA]/15' : 'from-[#1E4D8C]/8 to-[#DBE2EF]/12 dark:from-[#1E4D8C]/10 dark:to-[#7BAEDA]/8'} shadow-sm blur-md transition-all duration-700`} />

      {/* 좌측 중앙: 거대한 외곽선 원형 (Oversized Outline Circle) */}
      <div className={`absolute top-[20%] -left-[20%] md:top-[15%] md:-left-[15%] w-[25rem] h-[25rem] md:w-[35rem] md:h-[35rem] lg:w-[40rem] lg:h-[40rem] rounded-full border-[1.5rem] md:border-[2.5rem] lg:border-[3rem] ${isFull ? 'border-[#0F3460]/10 dark:border-[#7BAEDA]/10' : 'border-[#0F3460]/5 dark:border-[#7BAEDA]/5'} blur-md transition-all duration-700`} />

      {/* 하단 우측: 부드러운 호 (Soft Arc/Gradient Glow) */}
      <div className={`absolute -bottom-[5%] right-[5%] md:-bottom-[10%] md:right-[10%] w-[20rem] h-[20rem] md:w-[30rem] md:h-[30rem] lg:w-[35rem] lg:h-[35rem] rounded-full bg-gradient-to-t ${isFull ? 'from-[#1E4D8C]/15 dark:from-[#7BAEDA]/15' : 'from-[#1E4D8C]/8 dark:from-[#7BAEDA]/8'} to-transparent blur-md transition-all duration-700`} />

      {/* 상단 좌측: 엑센트 사선 (Diagonal Accent Line) — full 전용 */}
      {isFull && (
        <div className="absolute top-[15%] left-[5%] md:top-[20%] md:left-[10%] w-[8rem] md:w-[15rem] h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-[#1E4D8C]/30 to-transparent dark:via-[#7BAEDA]/30 blur-[1px] transition-all duration-700" />
      )}

      {/* 우측 하단: 3D Floating Glass 캡슐 — full 전용 */}
      {isFull && (
        <div className="absolute bottom-[5%] right-[2%] md:bottom-[10%] md:right-[5%] w-64 h-24 md:w-80 md:h-32 lg:w-96 lg:h-40 rounded-[3rem] md:rounded-[5rem] border border-white/50 dark:border-slate-700/50 bg-gradient-to-tr from-white/20 to-white/5 dark:from-slate-800/30 dark:to-transparent backdrop-blur-xl -rotate-12 shadow-[0_8px_32px_rgba(30,77,140,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-700" />
      )}

      {/* 상단 좌측: 3D Floating Glass 원형 — full 전용 */}
      {isFull && (
        <div className="hidden sm:block absolute top-[10%] left-[8%] md:top-[12%] md:left-[12%] w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border border-white/50 dark:border-slate-700/50 bg-gradient-to-tr from-white/20 to-white/5 dark:from-slate-800/30 dark:to-transparent backdrop-blur-xl shadow-[0_8px_32px_rgba(30,77,140,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-700" />
      )}

      {/* Accent Particles — full 전용 */}
      {isFull && (
        <>
          <div className="absolute top-[35%] left-[20%] w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#1E4D8C]/40 dark:bg-[#7BAEDA]/60 shadow-[0_0_12px_rgba(30,77,140,0.6)] animate-pulse transition-all duration-700" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[60%] right-[25%] w-2 h-2 md:w-3 md:h-3 rounded-full border border-[#0F3460]/30 dark:border-[#7BAEDA]/40 transition-all duration-700" />
        </>
      )}
    </div>
  );
}
