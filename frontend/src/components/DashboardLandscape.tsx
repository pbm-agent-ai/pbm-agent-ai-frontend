import { VaultIcon as LogoIcon } from './VaultIcon';

/**
 * 대시보드 히어로 섹션의 2D 풍경 배경 (Landscape Diorama)
 *
 * - 하늘 영역: 라이트 모드(해 + 흰 구름) / 다크 모드(달 + 별 + 밤구름)
 * - 땅 영역: 흙바닥 그라데이션 + 돌멩이 12개
 * - 캐릭터: 금고 요정(VaultIcon)이 땅 위에 서서 조건 분석 시 통통 튐
 *
 * @param isAnalyzing - 조건 분석 중이면 구름/돌 애니메이션 재생, 캐릭터 바운스
 * @param showDizzy  - 분석 직후 어지러운 눈 효과
 * @param showNeutral - 어지러움 후 멍한 표정
 * @param showSurprised - 빈 입력 시 놀란 표정
 */
export interface DashboardLandscapeProps {
  isAnalyzing: boolean;
  showDizzy: boolean;
  showNeutral: boolean;
  showSurprised?: boolean;
}

export default function DashboardLandscape({ isAnalyzing, showDizzy, showNeutral, showSurprised }: DashboardLandscapeProps) {
  return (
    <>
      <style>{`
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes cloudSpawn {
          0% { transform: translateX(1200px); }
          100% { transform: translateX(-1200px); }
        }
        @keyframes rockSpawn {
          0% { transform: translateX(1200px); }
          100% { transform: translateX(-1200px); }
        }
        @keyframes cloudDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-20px); }
        }
      `}</style>
      {/* ── 풍경 컨테이너: 둥근 모서리의 글라스모픽 박스, overflow-hidden으로 내부 클리핑 ── */}
      <div className="relative w-full h-36 md:h-48 overflow-hidden bg-white dark:bg-slate-900 group">
      {/* ── 불투명 베이스 레이어: 뒤쪽 DecorativeBackground가 비치지 않도록 막음 ── */}
      <div className="absolute inset-0 bg-white dark:bg-slate-900" />

      {/* ── 상단 광원 효과: 연한 파란 방사형 그라데이션, 분석 중 펄스 ── */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#7BAEDA]/10 via-transparent to-transparent opacity-50 transition-all duration-700 ${isAnalyzing ? 'animate-pulse opacity-100' : ''}`} />

      {/* ── 고정 레이어: 해(light) / 달+별(dark) — 스크롤되지 않고 항상 같은 위치 ── */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        {/* ☀️ 라이트 모드: 해 — 3겹의 amber 원형(glow + 코어) */}
        <div className="block dark:hidden">
          <div className="absolute top-6 right-[15%] flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-amber-400/20 blur-md" />
            <div className="absolute w-16 h-16 rounded-full bg-amber-300/40 blur-sm" />
            <div className="relative w-12 h-12 rounded-full bg-amber-400 shadow-[0_0_20px_5px_rgba(251,191,36,0.6)]" />
          </div>
        </div>
        {/* 🌙 다크 모드: 초승달(inset shadow 트릭) + 별 5개(glow + 반짝임) */}
        <div className="hidden dark:block">
          <div className="absolute top-8 right-[15%] flex items-center justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-[#DBE2EF]/10 blur-md" />
            <div className="relative w-12 h-12 rounded-full bg-transparent shadow-[inset_-8px_4px_0_0_rgba(219,226,239,1)] rotate-[15deg]" />
          </div>
          <div className="absolute top-8 left-[15%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]" />
          <div className="absolute top-16 left-[30%] w-2 h-2 rounded-full bg-[#DBE2EF] shadow-[0_0_10px_3px_rgba(219,226,239,0.9)] animate-pulse" />
          <div className="absolute top-12 right-[45%] w-1.5 h-1.5 rounded-full bg-[#7BAEDA] shadow-[0_0_6px_2px_rgba(123,174,218,0.7)]" />
          <div className="absolute top-28 right-[25%] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.6)]" />
          <div className="absolute top-6 right-[35%] w-1 h-1 rounded-full bg-white shadow-[0_0_4px_1px_rgba(255,255,255,0.5)]" />
        </div>
      </div>

      {/* ── 하늘 그라데이션: 상단 65% 영역, 연한 파랑→투명 (light) / 진한 남색→투명 (dark) ── */}
      <div className="absolute inset-0 bottom-[35%] bg-gradient-to-b from-[#7BAEDA]/35 to-[#DBE2EF]/5 dark:from-[#0F3460]/40 dark:to-transparent" />

      {/* ── 스크롤 구름: cloudSpawn 애니메이션으로 오른쪽→왼쪽 이동, 10s 주기 (상단 65%만) ── */}
      <div 
        className="absolute inset-0 bottom-[35%] overflow-hidden pointer-events-none z-[3]"
        style={!isAnalyzing ? { animation: 'cloudDrift 8s ease-in-out infinite alternate' } : {}}
      >
        {/* ☁️ 라이트 모드 - 흰색 구름 12개, 0.5s 간격으로 delay 분산 */}
        <div className="block dark:hidden">
          {/* 각 구름은 여러 개의 둥근 원을 겹쳐서 퐁실한 실루엣을 만듦 */}
          {/* delay -0s: 오른쪽에서 막 진입 */}
          <div className="absolute top-8 left-[10%] w-48 h-20 opacity-90" style={{ animation: `cloudSpawn 10s linear 0s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-4 w-12 h-12 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-12 w-16 h-16 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-3 left-24 w-12 h-12 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-8 left-0 w-40 h-10 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -0.5s */}
          <div className="absolute top-20 left-[35%] w-40 h-16 opacity-80 scale-90" style={{ animation: `cloudSpawn 10s linear -0.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-4 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-12 w-14 h-14 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-3 left-22 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-8 left-0 w-36 h-8 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -1s */}
          <div className="absolute top-12 left-[55%] w-36 h-14 opacity-70" style={{ animation: `cloudSpawn 10s linear -1s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-10 w-12 h-12 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-3 left-18 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-7 left-0 w-32 h-8 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -1.5s */}
          <div className="absolute top-16 left-[70%] w-24 h-10 opacity-60 scale-75" style={{ animation: `cloudSpawn 10s linear -1.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-6 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-12 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-5 left-0 w-20 h-6 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -2s */}
          <div className="absolute top-6 left-[20%] w-32 h-12 opacity-75" style={{ animation: `cloudSpawn 10s linear -2s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-3 w-9 h-9 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-9 w-11 h-11 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-16 w-9 h-9 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-5 left-0 w-28 h-7 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -2.5s */}
          <div className="absolute top-14 left-[45%] w-28 h-11 opacity-65" style={{ animation: `cloudSpawn 10s linear -2.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-8 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-14 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-5 left-0 w-24 h-6 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -3s */}
          <div className="absolute top-10 left-[80%] w-20 h-9 opacity-55" style={{ animation: `cloudSpawn 10s linear -3s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-7 h-7 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-6 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-11 w-7 h-7 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-4 left-0 w-18 h-5 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -3.5s */}
          <div className="absolute top-4 left-[5%] w-40 h-16 opacity-60 scale-95" style={{ animation: `cloudSpawn 10s linear -3.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-11 h-11 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-10 w-13 h-13 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-3 left-20 w-11 h-11 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-7 left-0 w-34 h-9 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -4s */}
          <div className="absolute top-18 left-[15%] w-30 h-12 opacity-70" style={{ animation: `cloudSpawn 10s linear -4s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-3 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-8 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-14 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-5 left-0 w-26 h-6 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -4.5s */}
          <div className="absolute top-7 left-[60%] w-26 h-11 opacity-60" style={{ animation: `cloudSpawn 10s linear -4.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-7 w-10 h-10 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-13 w-8 h-8 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-4 left-0 w-22 h-6 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -5s */}
          <div className="absolute top-15 left-[85%] w-22 h-10 opacity-50" style={{ animation: `cloudSpawn 10s linear -5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-7 h-7 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-6 w-9 h-9 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-2 left-11 w-7 h-7 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-4 left-0 w-18 h-5 rounded-full bg-white blur-[1px]" />
          </div>
          {/* delay -5.5s */}
          <div className="absolute top-22 left-[3%] w-36 h-14 opacity-55 scale-90" style={{ animation: `cloudSpawn 10s linear -5.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-9 h-9 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-0 left-9 w-11 h-11 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-3 left-17 w-9 h-9 rounded-full bg-white blur-[1px]" />
            <div className="absolute top-6 left-0 w-30 h-7 rounded-full bg-white blur-[1px]" />
          </div>
        </div>

        {/* 🌙 다크 모드 - 어두운 구름 12개, 라이트와 동일한 delay 구조, opacity 절반 */}
        <div className="hidden dark:block">
          <div className="absolute top-8 left-[10%] w-48 h-20 opacity-40" style={{ animation: `cloudSpawn 10s linear 0s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-4 w-12 h-12 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-0 left-12 w-16 h-16 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-3 left-24 w-12 h-12 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-8 left-0 w-40 h-10 rounded-full bg-[#DBE2EF] blur-[2px]" />
          </div>
          <div className="absolute top-20 left-[35%] w-40 h-16 opacity-30 scale-90" style={{ animation: `cloudSpawn 10s linear -0.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-4 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-12 w-14 h-14 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-3 left-22 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-8 left-0 w-36 h-8 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-12 left-[55%] w-36 h-14 opacity-30" style={{ animation: `cloudSpawn 10s linear -1s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-10 h-10 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-0 left-10 w-12 h-12 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-3 left-18 w-10 h-10 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-7 left-0 w-32 h-8 rounded-full bg-[#DBE2EF] blur-[2px]" />
          </div>
          <div className="absolute top-16 left-[70%] w-24 h-10 opacity-20 scale-75" style={{ animation: `cloudSpawn 10s linear -1.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-6 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-12 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-5 left-0 w-20 h-6 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-6 left-[20%] w-32 h-12 opacity-35" style={{ animation: `cloudSpawn 10s linear -2s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-3 w-9 h-9 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-0 left-9 w-11 h-11 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-2 left-16 w-9 h-9 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-5 left-0 w-28 h-7 rounded-full bg-[#DBE2EF] blur-[2px]" />
          </div>
          <div className="absolute top-14 left-[45%] w-28 h-11 opacity-30" style={{ animation: `cloudSpawn 10s linear -2.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-8 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-14 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-5 left-0 w-24 h-6 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-10 left-[80%] w-20 h-9 opacity-25" style={{ animation: `cloudSpawn 10s linear -3s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-7 h-7 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-6 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-11 w-7 h-7 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-4 left-0 w-18 h-5 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-4 left-[5%] w-40 h-16 opacity-25 scale-95" style={{ animation: `cloudSpawn 10s linear -3.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-11 h-11 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-0 left-10 w-13 h-13 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-3 left-20 w-11 h-11 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-7 left-0 w-34 h-9 rounded-full bg-[#DBE2EF] blur-[2px]" />
          </div>
          <div className="absolute top-18 left-[15%] w-30 h-12 opacity-30" style={{ animation: `cloudSpawn 10s linear -4s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-3 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-8 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-14 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-5 left-0 w-26 h-6 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-7 left-[60%] w-26 h-11 opacity-25" style={{ animation: `cloudSpawn 10s linear -4.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-7 w-10 h-10 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-13 w-8 h-8 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-4 left-0 w-22 h-6 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-15 left-[85%] w-22 h-10 opacity-20" style={{ animation: `cloudSpawn 10s linear -5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-1 left-2 w-7 h-7 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-0 left-6 w-9 h-9 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-2 left-11 w-7 h-7 rounded-full bg-white blur-[2px]" />
            <div className="absolute top-4 left-0 w-18 h-5 rounded-full bg-white blur-[2px]" />
          </div>
          <div className="absolute top-22 left-[3%] w-36 h-14 opacity-25 scale-90" style={{ animation: `cloudSpawn 10s linear -5.5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
            <div className="absolute top-2 left-3 w-9 h-9 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-0 left-9 w-11 h-11 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-3 left-17 w-9 h-9 rounded-full bg-[#DBE2EF] blur-[2px]" />
            <div className="absolute top-6 left-0 w-30 h-7 rounded-full bg-[#DBE2EF] blur-[2px]" />
          </div>
        </div>
      </div>

      {/* ── 땅 그라데이션: 하단 35% 영역, 진한 파랑→어두운색 (흙바닥 느낌) ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-b from-[#1E4D8C]/10 to-[#1E4D8C]/5 dark:from-[#0F3460]/40 dark:to-slate-950 border-t border-[#1E4D8C]/20 dark:border-slate-800/60" />

      {/* ── 돌멩이: idle 정적 / 분석 중 오른쪽→왼쪽 이동 (rockSpawn 6s) ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none">
        <div className="absolute bottom-[15%] left-[10%] w-5 h-3" style={{ animation: `rockSpawn 6s linear -6s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-5 h-3 rounded-[40%] bg-slate-500/30 dark:bg-slate-400/20 rotate-12" />
        </div>
        <div className="absolute bottom-[25%] left-[70%] w-8 h-4" style={{ animation: `rockSpawn 6s linear -8s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-8 h-4 rounded-[30%] bg-amber-800/25 dark:bg-amber-700/20 -rotate-6" />
        </div>
        <div className="absolute bottom-[8%] left-[28%] w-2 h-1" style={{ animation: `rockSpawn 6s linear -10s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-2 h-1 rounded-full bg-stone-600/40 dark:bg-stone-500/30 rotate-45" />
        </div>
        <div className="absolute bottom-[40%] left-[45%] w-6 h-2" style={{ animation: `rockSpawn 6s linear -4s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-6 h-2 rounded-[20%] bg-zinc-700/20 dark:bg-zinc-600/20 -rotate-12" />
        </div>
        <div className="absolute bottom-[10%] left-[55%] w-4 h-2.5" style={{ animation: `rockSpawn 6s linear -2s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-4 h-2.5 rounded-[45%] bg-stone-700/30 dark:bg-stone-500/20 rotate-[20deg]" />
        </div>
        <div className="absolute bottom-[45%] left-[82%] w-2.5 h-1.5" style={{ animation: `rockSpawn 6s linear -1s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-2.5 h-1.5 rounded-full bg-slate-600/30 dark:bg-slate-400/20 -rotate-45" />
        </div>
        <div className="absolute bottom-[20%] left-[40%] w-7 h-3.5" style={{ animation: `rockSpawn 6s linear -7s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-7 h-3.5 rounded-[35%] bg-amber-900/20 dark:bg-amber-800/15 -rotate-[8deg]" />
        </div>
        <div className="absolute bottom-[35%] left-[22%] w-3 h-2" style={{ animation: `rockSpawn 6s linear -9s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-3 h-2 rounded-[40%] bg-zinc-600/25 dark:bg-zinc-500/20 rotate-[15deg]" />
        </div>
        <div className="absolute bottom-[30%] left-[15%] w-4 h-2" style={{ animation: `rockSpawn 6s linear -3s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-4 h-2 rounded-[35%] bg-stone-600/25 dark:bg-stone-500/20 rotate-[10deg]" />
        </div>
        <div className="absolute bottom-[5%] left-[85%] w-6 h-3" style={{ animation: `rockSpawn 6s linear -5s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-6 h-3 rounded-[40%] bg-amber-700/20 dark:bg-amber-600/20 -rotate-[15deg]" />
        </div>
        <div className="absolute bottom-[12%] left-[35%] w-3 h-1.5" style={{ animation: `rockSpawn 6s linear -11s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-3 h-1.5 rounded-full bg-slate-500/25 dark:bg-slate-400/20 rotate-[5deg]" />
        </div>
        <div className="absolute bottom-[28%] left-[60%] w-5 h-2.5" style={{ animation: `rockSpawn 6s linear -0s infinite ${isAnalyzing ? 'running' : 'paused'}` }}>
          <div className="w-5 h-2.5 rounded-[25%] bg-zinc-600/20 dark:bg-zinc-500/15 -rotate-[20deg]" />
        </div>
      </div>

      {/* ── 수평선 glow: 하늘과 땅의 경계선, 분석 중에만 펄스 ── */}
      <div className={`absolute inset-x-0 top-[65%] h-1 bg-gradient-to-r from-transparent via-[#7BAEDA]/50 to-transparent transition-opacity duration-500 z-10 ${isAnalyzing ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />

      {/* ── 캐릭터 그림자: 땅 위에 드리우는 타원형 blur, hover 시 축소 ── */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 dark:bg-black/40 rounded-[100%] blur-sm z-10 transition-all duration-500 group-hover:scale-75 group-hover:opacity-50" />

      {/* ── 캐릭터 컨테이너: 금고 요정(VaultIcon)이 땅 위에 위치 ── */}
      {/* 상태에 따라: 분석 중(spin+open입) / 어지러움(@눈) / 멍(무표정) / 기본(미소+안테나 회전) */}
      <div 
        className="absolute bottom-[22%] left-1/2 -translate-x-1/2 z-20 filter drop-shadow-[0_10px_20px_rgba(15,52,96,0.3)] transform transition-transform duration-500 hover:scale-110 hover:-translate-y-4"
        style={isAnalyzing ? { animation: 'subtleBounce 0.4s ease-in-out infinite' } : {}}
      >
        {isAnalyzing ? (
          <LogoIcon className="w-20 h-20 animate-spin" animated={false} mouth="open" />
        ) : showDizzy ? (
          <LogoIcon className="w-20 h-20" animated={false} dizzy />
        ) : showNeutral ? (
          <LogoIcon className="w-20 h-20" animated={false} mouth="auto" />
        ) : showSurprised ? (
          <LogoIcon className="w-20 h-20" animated={false} mouth="open" />
        ) : (
          <LogoIcon className="w-20 h-20" animated={true} mouth="smile" analyzing />
        )}
      </div>
      </div>
    </>
  );
}
