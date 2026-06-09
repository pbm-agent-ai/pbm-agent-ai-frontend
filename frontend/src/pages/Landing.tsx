import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, ArrowRight, Play, Star, Activity, Link as LinkIcon,
  CheckCircle, Search, TrendingUp,
  ThumbsUp, ThumbsDown, ExternalLink, ChevronRight,
} from "lucide-react";
import { LogoIcon } from "../components/ui/LogoIcon";
import { Button } from "../components/ui/button";
import { FadeIn } from "../components/ui/FadeIn";

const TYPED_TEXT = '네이버에서 갤럭시 버즈 FE 8만원 이하';

function useInView(options = { threshold: 0.3 }) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options]);
  return [setRef, inView] as const;
}

export default function Landing() {
  const [typedChars, setTypedChars] = useState(0);
  const [typingStarted, setTypingStarted] = useState(false);
  const [logoMouth, setLogoMouth] = useState<'auto' | 'smile' | 'open'>('auto');

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.colorScheme;
    html.style.colorScheme = "light";
    return () => { html.style.colorScheme = prev; };
  }, []);

  // ── 페이지 진입 후 잠시 대기했다가 타이핑 반복 ──
  useEffect(() => {
    const timer = setTimeout(() => setTypingStarted(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // ── 타이핑 애니메이션 (반복) ──
  useEffect(() => {
    if (!typingStarted) return;
    if (typedChars >= TYPED_TEXT.length) {
      const timeout = setTimeout(() => setTypedChars(0), 4000);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setTypedChars(typedChars + 1), 180);
    return () => clearTimeout(timeout);
  }, [typedChars, typingStarted]);

  const typingDone = typedChars >= TYPED_TEXT.length;
  const [buttonReady, setButtonReady] = useState(false);

  useEffect(() => {
    if (typingDone) {
      const t = setTimeout(() => setButtonReady(true), 800);
      return () => clearTimeout(t);
    }
    setButtonReady(false);
  }, [typingDone]);

  // ── 스크롤 애니메이션 상태 (Hook) ──
  const [step2Ref, step2InView] = useInView();
  const [cardSelected, setCardSelected] = useState(false);

  const [step3Ref, step3InView] = useInView({ threshold: 0.5 });
  const [showTooltip, setShowTooltip] = useState(false);

  const [youtubeRef, youtubeInView] = useInView({ threshold: 0.5 });
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);

  // 애니메이션 스케줄링
  useEffect(() => {
    if (step2InView) {
      setTimeout(() => setCardSelected(true), 1200);
    }
  }, [step2InView]);

  useEffect(() => {
    if (step3InView) {
      setTimeout(() => setShowTooltip(true), 2200); // 선이 그려진 후
    }
  }, [step3InView]);

  useEffect(() => {
    if (youtubeInView) {
      setTimeout(() => setYoutubeLoaded(true), 1200);
    }
  }, [youtubeInView]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900" style={{ colorScheme: "light" }}>
      {/* ═══════ Top Navigation ═══════ */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto h-[72px] px-4 md:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group"
            onMouseEnter={() => setLogoMouth('open')}
            onMouseLeave={() => setLogoMouth('auto')}>
            <div className="w-10 h-10 bg-[#1E4D8C] rounded-[14px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
              <LogoIcon mouth={logoMouth} />
            </div>
            <span className="text-slate-900 font-extrabold text-[17px] tracking-tight font-brand">CustosPay</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 px-4 py-2 transition-all">로그인</Link>
        </div>
      </header>

      {/* ═══════ Hero ═══════ */}
      <section className="relative flex flex-col items-center px-6 pt-20 pb-28 overflow-hidden bg-slate-50">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1E4D8C] via-[#0F3460] to-[#DBE2EF] animate-gradient-shift z-10" />
        
        {/* --- Landing Hero Background (Lite version of Dashboard abstract geometrics) --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 [-webkit-mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,transparent_10%,black_70%)] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,transparent_10%,black_70%)]">
          {/* 우측 상단: 거대한 기울어진 둥근 사각형 (Diagonal Pill) - Lighter opacity */}
          <div className="absolute -top-[10%] -right-[5%] w-[30rem] h-[15rem] md:w-[50rem] md:h-[25rem] rounded-[10rem] -rotate-12 bg-gradient-to-r from-[#1E4D8C]/10 to-[#DBE2EF]/20 shadow-sm blur-lg transition-all duration-700" />
          
          {/* 좌측 중앙: 거대한 외곽선 원형 (Oversized Outline Circle) - Lighter border */}
          <div className="absolute top-[10%] -left-[15%] w-[25rem] h-[25rem] md:w-[40rem] md:h-[40rem] rounded-full border-[1.5rem] md:border-[2.5rem] border-[#0F3460]/[0.06] blur-md transition-all duration-700" />
          
          {/* 하단 우측: 부드러운 호 (Soft Arc) */}
          <div className="absolute bottom-[0%] right-[10%] w-[20rem] h-[20rem] md:w-[35rem] md:h-[35rem] rounded-full bg-gradient-to-t from-[#1E4D8C]/10 to-transparent blur-md transition-all duration-700" />

          {/* 상단 좌측: 엑센트 사선 (Diagonal Accent Line) */}
          <div className="absolute top-[15%] left-[10%] w-[10rem] md:w-[15rem] h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-[#1E4D8C]/20 to-transparent blur-[1px] transition-all duration-700" />
          
          {/* 3D Floating Glass 캡슐 - Signature element linking to Dashboard */}
          <div className="absolute top-[60%] right-[5%] w-48 h-20 md:w-80 md:h-24 lg:w-96 lg:h-32 rounded-[3rem] md:rounded-[4rem] border border-white/50 bg-gradient-to-tr from-white/20 to-white/5 backdrop-blur-md -rotate-12 shadow-[0_8px_32px_rgba(30,77,140,0.05)] transition-all duration-700 animate-float" style={{ animationDuration: '6s' }} />
        </div>

        <div className="flex flex-col items-center text-center max-w-2xl mx-auto relative z-10">
          <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3.2rem] font-bold tracking-tight leading-[1.3] mb-5 text-[#112D4E] break-keep">
            원하는 가격에 <span className="text-[#1E4D8C]">AI가</span> 찾아드려요
          </h1>
          <p className="text-base text-slate-500 leading-relaxed mb-10 max-w-md">
            자연어로 쇼핑 조건을 말하면<span className="md:hidden"><br /></span> AI가 분석하고, 조건에 맞는 상품을<span className="md:hidden"><br /></span> 실시간으로 모니터링해 알려드립니다.
          </p>
          <div className="mb-10">
            <Link to="/login?mode=signup">
              <Button className="bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] rounded-xl h-12 px-8 text-base font-bold border-none cursor-pointer transition-all shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)]">
                시작하기 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          {/* ── Hero Preview (simple) ── */}
          <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-[0_8px_32px_rgb(15,23,42,0.06)] border border-slate-200 relative overflow-hidden text-left animate-card-glow">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] rounded-t-[2rem]" />
            <div className="p-4 pt-5 flex flex-col gap-3">
              <div className="bg-white rounded-2xl p-2 ring-1 ring-[#E2E8F0]">
                <div className="w-full bg-transparent px-4 py-3 text-slate-900 text-lg min-h-[60px]">
                  <span className="text-slate-400">예: </span>
                  <span className="font-medium">네이버에서 갤럭시 버즈 FE 8만원 이하면 알림</span>
                  <span className="animate-cursor" />
                </div>
              </div>
              <div className="flex justify-end px-2" style={{ animation: 'fade-slide-up 0.5s ease-out 1s forwards', opacity: 0 }}>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white rounded-xl h-12 px-8 text-base font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] cursor-default opacity-90">
                  <LogoIcon className="w-4 h-4" animated={false} mouth="auto" /> 조건 분석하기
                </div>
              </div>
              <div className="mx-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left shadow-sm" style={{ animation: 'fade-slide-up 0.5s ease-out 2s forwards', opacity: 0 }}>
                <p className="text-sm font-semibold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-[#1E4D8C] inline mr-1.5 animate-icon-pulse" /> 분석 완료
                </p>
                <p className="mt-1 text-xs text-slate-500">플랫폼: 네이버 · 상품: 갤럭시 버즈 FE · 목표가: 80,000원 이하</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 조건 등록 ═══════ */}
      <FadeIn delay={100}>
      <section className="py-20 px-6 bg-white relative overflow-hidden">
        {/* 미세한 테크 그리드 패턴 — AI 분석 섹션의 정밀함을 암시 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <div className="flex-1 max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#F9F7F7] border border-[#DBE2EF] px-3.5 py-1.5 text-xs font-bold text-[#1E4D8C] tracking-wide mb-5">
                <Search className="w-3 h-3" /> STEP 1
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#112D4E] mb-3">
                자연어 또는 URL로<br />조건을 입력하고 등록하세요
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                원하는 상품과 가격을 말하듯이 입력하거나<span className="md:hidden"><br /></span> 상품 URL을 직접 붙여넣으면<span className="md:hidden"><br /></span> AI가 플랫폼, 상품명, 목표 가격을<span className="md:hidden"><br /></span> 자동으로 분석합니다.
              </p>
              <div className="flex flex-col gap-2">
                {["자연어로 쇼핑 조건 입력 또는 상품 URL 붙여넣기", "AI가 플랫폼/상품/가격 자동 분석", "분석 결과 확인 후 조건 등록"].map((t) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#1E4D8C] shrink-0" />
                    <span className="text-sm text-slate-600">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative">
                <div className="bg-[#F9F7F7] rounded-xl p-3 ring-1 ring-[#E2E8F0] mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <Search className="w-3.5 h-3.5 text-[#1E4D8C]" />
                    </div>
                    <div className="flex-1 text-sm text-slate-800 font-medium min-w-0">
                      <span>{TYPED_TEXT.slice(0, typedChars)}</span>
                      {typedChars < TYPED_TEXT.length && <span className="inline-block w-[2px] h-[1.1em] bg-[#1E4D8C] ml-0.5 align-text-bottom animate-cursor-blink" />}
                    </div>
                  </div>
                </div>
                {/* 설명: URL 입력도 자연어와 동일하게 처리됨을 안내 */}
                <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-400">
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span>상품 URL을 그대로 붙여넣어도 분석해 드려요</span>
                </div>
                <div className="flex justify-end">
                  <div className={`relative inline-flex items-center gap-1 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white rounded-lg h-8 px-4 text-[11px] font-bold shadow-sm cursor-default opacity-90${buttonReady ? ' animate-button-press' : ''}`}>
                    <LogoIcon className="w-3 h-3" animated={false} mouth="auto" /> 조건 분석하기
                    {buttonReady && <span className="animate-demo-cursor absolute -top-1 -left-1">👆</span>}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
      </section>
      </FadeIn>

      {/* ═══════ 상품 후보 선택 ═══════ */}
      <FadeIn delay={200}>
      <section className="py-20 px-6 bg-[#F9F7F7] relative overflow-hidden">
        {/* 브랜드 앰비언트 글로우 — 공간감을 위한 은은한 빛 번짐 */}
        <div className="absolute -top-40 -right-20 w-[500px] h-[500px] bg-[#1E4D8C]/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[600px] h-[600px] bg-[#DBE2EF]/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row-reverse items-start gap-12 lg:gap-20">
            <div className="flex-1 max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#DBE2EF] px-3.5 py-1.5 text-xs font-bold text-[#1E4D8C] tracking-wide mb-5">
                <Star className="w-3 h-3" /> STEP 2
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#112D4E] mb-3">
                분석된 조건에 맞는<br />상품을 선택하세요
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                AI가 입력한 조건에 맞는<span className="md:hidden"><br /></span> 상품 후보를 보여줍니다. 모니터링할 상품을 선택하고<span className="md:hidden"><br /></span> 조건 충족 여부를 한눈에 확인하세요.
              </p>
              <div className="flex flex-col gap-2">
                {["조건에 맞는 상품 후보 목록 제공", "각 상품별 조건 충족 상태 표시", "원하는 상품 선택 후 모니터링 시작"].map((t) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#1E4D8C] shrink-0" />
                    <span className="text-sm text-slate-600">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full" ref={step2Ref}>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-xs font-bold text-slate-800">상품 목록</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { badge: "모니터링 중", cls: "bg-blue-100 text-blue-700" },
                    { badge: "조건 충족", cls: "bg-emerald-100 text-emerald-700" },
                    { badge: null, cls: "" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
                      i === 1 && cardSelected
                        ? 'border-[#1E4D8C] bg-[#F9F7F7] shadow-[0_4px_12px_rgba(30,77,140,0.08)]'
                        : 'border-slate-100 bg-slate-50'
                    }`}>
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0" />
                        {i === 1 && cardSelected && (
                          <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center transition-opacity duration-300">
                            <div className="w-4 h-4 rounded-full bg-[#1E4D8C] flex items-center justify-center shadow-md animate-icon-pulse">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-36 rounded bg-slate-200" />
                          {item.badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.cls}`}>{item.badge}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-3 w-14 rounded bg-slate-200" />
                          <div className="h-3 w-12 rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className={`shrink-0 w-4 h-4 rounded border-2 transition-colors duration-300 flex items-center justify-center ${
                        i === 1 && cardSelected ? 'border-[#1E4D8C] bg-[#1E4D8C]' : 'border-slate-300'
                      }`}>
                        {i === 1 && cardSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400">{cardSelected ? '1개 선택됨' : '3개 목록'}</span>
                  <div className={`inline-flex items-center bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white rounded-lg h-7 px-4 text-[10px] font-bold shadow-sm cursor-default transition-all duration-300 ${cardSelected ? 'opacity-100' : 'opacity-50'}`}>선택 완료</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════ Step 2: 가격 히스토리 & 모니터링 ═══════ */}
      <FadeIn delay={400}>
      <section className="py-20 px-6 bg-gradient-to-br from-[#F9F7F7] via-white to-[#DBE2EF]/30 overflow-hidden">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <div className="flex-1 max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#DBE2EF] px-3.5 py-1.5 text-xs font-bold text-[#1E4D8C] tracking-wide mb-5">
                <Activity className="w-3 h-3" /> STEP 3
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#112D4E] mb-3">
                가격 변동을 실시간으로<br />추적하고 최저가를 포착하세요
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                조건이 등록되면 AI가 24시간 가격을 추적합니다.<span className="md:hidden"><br /></span> 가격 히스토리 차트로 변동 추이를 확인하고,<span className="md:hidden"><br /></span> 최저가를 포착하여 목표가를 수정할 수 있어요.
              </p>
              <div className="flex flex-col gap-2 mb-8">
                {[
                  "실시간 가격 모니터링 (24시간)",
                  "가격 변동 히스토리 차트 제공",
                  "최저가 도달 시점 확인",
                  "목표가 수정으로 구매 타이밍 최적화",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#1E4D8C] shrink-0" />
                    <span className="text-sm text-slate-600">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full" ref={step3Ref}>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* ── Condition selector mockup ── */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-[#F9F7F7] rounded-lg px-3 py-2 border border-slate-200 cursor-default">
                    <span className="text-[9px] font-bold text-[#1E4D8C] bg-white rounded px-1.5 py-0.5 border border-slate-200">쿠○</span>
                    <span className="text-[11px] font-semibold text-slate-300 tracking-wide">다○슨 V15 디텍트</span>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    {["7D", "30D"].map((p) => (
                      <span key={p} className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors duration-300 ${p === '1M' || (p === '30D' && step3InView) ? 'bg-[#1E4D8C] text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{p}</span>
                    ))}
                  </div>
                </div>

                {/* ── 4 Stats (matches Price History page) ── */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "현재가", bg: "bg-[#F9F7F7]" },
                    { label: "최저가", bg: "bg-[#FEF2F2]" },
                    { label: "최고가", bg: "bg-[#FFF7ED]" },
                    { label: "평균가", bg: "bg-slate-50" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg ${s.bg} px-2 py-2 text-center`}>
                      <p className="text-[8px] text-slate-400 font-medium">{s.label}</p>
                      <div className="h-3 w-12 mx-auto mt-1 rounded bg-slate-200 animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* ── Chart ── */}
                <div className="rounded-xl bg-[#F9F7F7] border border-slate-100 p-3 mb-3 relative">
                  <svg viewBox="0 0 200 50" className="w-full h-12 overflow-visible">
                    <line x1="0" y1="0" x2="200" y2="0" stroke="#E2E8F0" strokeWidth="0.5" />
                    <line x1="0" y1="25" x2="200" y2="25" stroke="#E2E8F0" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="200" y2="50" stroke="#E2E8F0" strokeWidth="0.5" />
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E4D8C" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#1E4D8C" stopOpacity="0.01" />
                      </linearGradient>
                      <clipPath id="chartReveal">
                        <rect x="0" y="0" width={step3InView ? "200" : "0"} height="100" style={{ transition: 'width 2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#chartReveal)">
                      <path d="M0,35 L15,30 L30,38 L45,28 L60,32 L75,22 L90,25 L105,18 L120,20 L135,12 L150,16 L165,8 L180,10 L200,6 L200,50 L0,50 Z" fill="url(#sparkGrad)" />
                    </g>
                    <path 
                      d="M0,35 L15,30 L30,38 L45,28 L60,32 L75,22 L90,25 L105,18 L120,20 L135,12 L150,16 L165,8 L180,10 L200,6" 
                      fill="none" stroke="#1E4D8C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        strokeDasharray: 300,
                        strokeDashoffset: step3InView ? 0 : 300,
                        transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                    
                    <circle cx="200" cy="6" r="3" fill="#1E4D8C" 
                      className={`transition-opacity duration-300 delay-[2000ms] ${step3InView ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    
                    <line x1="0" y1="18" x2="200" y2="18" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="4 2" opacity="0.5" />
                  </svg>
                  
                  {/* Tooltip Popup */}
                  <div className={`absolute top-0 right-3 -translate-y-4 bg-[#112D4E] text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg transition-all duration-500 ease-out origin-bottom ${showTooltip ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    ₩71,000
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#112D4E] rotate-45" />
                  </div>

                  <div className="flex justify-between mt-1">
                    <span className="text-[7px] text-slate-300">4/10</span>
                    <span className="text-[7px] text-slate-400 font-medium">최저가 ₩71,000 도달</span>
                    <span className="text-[7px] text-slate-300">4/16</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════ YouTuber (부가) ═══════ */}
      <FadeIn delay={500}>
      <section className="py-16 px-6 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        {/* 부드러운 웜/쿨 교차 글로우 — 미디어/리뷰 섹션 분위기 */}
        <div className="absolute top-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-rose-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#1E4D8C]/[0.02] rounded-full blur-[80px] pointer-events-none" />
        {/* 은은한 사선 — 시각적 구조감 */}
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200/50 to-transparent -rotate-6 pointer-events-none" />
        <div className="max-w-[900px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#DBE2EF] px-3.5 py-1.5 text-xs font-bold text-[#1E4D8C] tracking-wide mb-4">
                <Play className="w-3 h-3" /> 유튜버 추천
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#112D4E] mb-3">유튜버 리뷰를 한눈에 확인하세요</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                유튜버가 직접 리뷰한 상품의<span className="md:hidden"><br /></span> 장점과 단점을 요약해서 보여줍니다.<span className="md:hidden"><br /></span> 영상을 보지 않아도 상품 정보를<span className="md:hidden"><br /></span> 한눈에 파악할 수 있고,<span className="md:hidden"><br /></span> 영상 링크를 통해<span className="md:hidden"><br /></span> 직접 리뷰를 확인할 수 있어요.
              </p>
            </div>
              <div className="w-full md:w-80 shrink-0" ref={youtubeRef}>
                {/* ── Product card (Recommendation 페이지 실제 카드 디자인과 동일) ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
                  {/* 제품 헤더: 랭크 + 상품명 + 브랜드 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#1E4D8C] text-white shadow-sm">
                      <TrendingUp className="w-3 h-3" /> 1위
                    </span>
                    <span className="text-sm font-bold text-slate-800">로○락 S8 Pro 로봇청소기</span>
                    <span className="text-xs font-medium text-[#1E4D8C]">로○락</span>
                  </div>

                  {/* 유튜버 정보 */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1E4D8C]/10 text-[#1E4D8C] border border-[#1E4D8C]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      잇○
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1E4D8C]">
                      <ExternalLink className="w-3 h-3" />
                      리뷰 영상
                    </span>
                  </div>

                  {/* 로딩 스켈레톤 상태 */}
                  <div className={`space-y-2 mb-4 absolute inset-x-4 transition-opacity duration-500 ${youtubeLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-3 animate-pulse">
                      <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1.5 mt-0.5">
                        <div className="h-2.5 bg-slate-200 rounded w-full" />
                        <div className="h-2.5 bg-slate-200 rounded w-4/5" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-3 animate-pulse">
                      <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1.5 mt-0.5">
                        <div className="h-2.5 bg-slate-200 rounded w-5/6" />
                      </div>
                    </div>
                  </div>

                  {/* 실제 콘텐츠 상태: 장점 / 단점 (Recommendation 페이지와 동일한 스타일) */}
                  <div className={`space-y-2 mb-4 transition-opacity duration-500 delay-300 ${youtubeLoaded ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-3">
                        <h4 className="text-[11px] font-bold text-emerald-700 mb-2 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          장점
                        </h4>
                        <p className="text-[11px] text-emerald-900 leading-relaxed">
                          강력한 흡입력과 물걸레 동시 지원. 장애물 인식 정확도가 높음
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-50/80 border border-rose-100 p-3">
                        <h4 className="text-[11px] font-bold text-rose-700 mb-2 flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" />
                          단점
                        </h4>
                        <p className="text-[11px] text-rose-900 leading-relaxed">
                          가격대가 높음. 유지보수 비용 발생
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 하단: 분석일 + 리뷰 모아보기 */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400">
                      분석일: 2026.06.01
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#1E4D8C] bg-[#1E4D8C]/5">
                      <Play className="w-3 h-3" />
                      리뷰 모아보기
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </section>
      </FadeIn>

      {/* ═══════ CTA ═══════ */}
      <FadeIn delay={600}>
      <section className="py-24 px-6 bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-xl mx-auto text-center relative z-10">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
            <LogoIcon className="w-6 h-6" animated={false} mouth="smile" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">지금 시작해보세요</h2>
          <p className="text-base text-[#DBE2EF] mb-8 leading-relaxed">3분만에 가입하고 AI 쇼핑 비서의 편리함을 경험해보세요.</p>
          <Link to="/login?mode=signup">
            <Button className="bg-white text-[#1E4D8C] hover:bg-[#DBE2EF] rounded-xl h-14 px-10 text-lg font-bold border-none cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
              무료로 시작하기 <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-[#DBE2EF]/60">별도 카드 등록 없이 시작할 수 있어요</p>
        </div>
      </section>
      </FadeIn>
    </div>
  );
}
