import { useEffect, useMemo, useState } from 'react';
import {
  Search, Sparkles, RotateCcw, X, ThumbsUp, ThumbsDown,
  ExternalLink, CheckCircle2, XCircle, Play, TrendingUp, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fetchYoutubeReviews } from '@/api/recommendation';
import type { YoutubeReviewVideo } from '@/types/recommendation';
import { Button } from '@/components/ui/button';

// ─── 유틸 ─────────────────────────────────────────────────────

// ─── 제품 리뷰 비교 모달에서 쓸 타입 ──────────────────────────

interface ProductReviewEntry {
  youtuberName: string;
  videoUrl: string;
  rank: number;
  brand: string;
  pros: string[];
  cons: string[];
  verdict: string;
  recommendedFor: string;
}



const fallbackReviews: YoutubeReviewVideo[] = [
  {
    id: 1,
    videoId: 'abc123',
    videoUrl: 'https://youtube.com/watch?v=abc123',
    youtuberName: '리뷰맨',
    language: 'ko',
    isGenerated: true,
    totalDuration: 720,
    categoryMain: '가전',
    categorySub: '청소기',
    analyzedTextStartTime: 30,
    products: [
      {
        rank: 1,
        productName: '로보락 S8 MaxV Ultra',
        brand: '로보락',
        pros: ['강력한 흡입력', '물걸레 동시 청소', '장애물 인식 우수'],
        cons: ['가격이 높음', '먼지통 용량 작음'],
        verdict: '프리미엄 가격이지만 성능은 최고. 자동 먼지비움과 물걸레 세척까지 원한다면 이 제품.',
        recommendedFor: '청소에 시간을 쓰기 싫은 바쁜 직장인',
      },
      {
        rank: 2,
        productName: '다이슨 V15 Detect',
        brand: '다이슨',
        pros: ['레이저 먼지 감지', '강력한 흡입력', '다양한 헤드'],
        cons: ['배터리 지속 시간 짧음', '무거운 편'],
        verdict: '무선 청소기 중 흡입력은 최상위. 먼지 감지 기능이 특히 유용하다.',
        recommendedFor: '청소기 성능에 민감한 사용자',
      },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 2,
    videoId: 'def456',
    videoUrl: 'https://youtube.com/watch?v=def456',
    youtuberName: '테크몬',
    language: 'ko',
    isGenerated: true,
    totalDuration: 540,
    categoryMain: '가전',
    categorySub: '청소기',
    analyzedTextStartTime: 15,
    products: [
      {
        rank: 1,
        productName: '다이슨 V15 Detect',
        brand: '다이슨',
        pros: ['레이저 먼지 감지는 혁신적이다', '흡입력이 강력해 카펫 청소에 탁월함'],
        cons: ['생각보다 무거워서 장시간 사용 시 피로감', '배터리 교체 비용이 부담됨'],
        verdict: '강력한 성능을 원한다면 좋은 선택이지만, 가격과 무게를 고려해야 한다.',
        recommendedFor: '카펫이 많은 가정이나 강력한 청소 성능이 필요한 사용자',
      },
      {
        rank: 2,
        productName: '로보락 S8 MaxV Ultra',
        brand: '로보락',
        pros: ['자동 먼지비움이 정말 편리하다', '물걸레 청소 품질이 인상적'],
        cons: ['가격이 부담스러운 수준', '고장 시 수리비가 비쌈'],
        verdict: '편리함을 최우선으로 한다면 이만한 제품이 없다. 다만 가격은 확실한 단점.',
        recommendedFor: '바쁜 현대인, 청소에 시간을 최소화하고 싶은 사람',
      },
      {
        rank: 3,
        productName: 'Apple AirPods Pro 2',
        brand: 'Apple',
        pros: ['노이즈 캔슬링이 업계 최고 수준', '착용감이 편안하고 장시간 사용 가능'],
        cons: ['가격이 비쌈', '안드로이드와의 호환성이 제한적'],
        verdict: '아이폰 사용자라면 망설일 이유가 없는 제품. 노캔 성능 하나는 끝내준다.',
        recommendedFor: 'Apple 생태계 사용자, 노이즈 캔슬링을 중요시하는 사람',
      },
    ],
    createdAt: '2026-06-01T01:00:00.000Z',
    updatedAt: '2026-06-01T01:00:00.000Z',
  },
  {
    id: 3,
    videoId: 'ghi789',
    videoUrl: 'https://youtube.com/watch?v=ghi789',
    youtuberName: '잇섭',
    language: 'ko',
    isGenerated: true,
    totalDuration: 480,
    categoryMain: '전자기기',
    categorySub: '이어폰',
    analyzedTextStartTime: 10,
    products: [
      {
        rank: 1,
        productName: '갤럭시 버즈3 Pro',
        brand: '삼성',
        pros: ['삼성 생태계와 완벽한 연동', '착용감이 매우 편안함', 'IP57 방수 지원'],
        cons: ['노이즈 캔슬링이 에어팟 대비 아쉬움', '케이스 크기가 다소 큼'],
        verdict: '갤럭시 스마트폰 사용자라면 최고의 선택지. 가격도 경쟁사 대비 합리적이다.',
        recommendedFor: '갤럭시 사용자, 가성비를 중시하는 사람',
      },
      {
        rank: 2,
        productName: 'Apple AirPods Pro 2',
        brand: 'Apple',
        pros: ['에코시스템 연동이 뛰어남', '공간 음향이 영화 감상에 최적'],
        cons: ['가격이 부담됨', '수리 비용이 비쌈'],
        verdict: '아이폰, 아이패드, 맥을 함께 쓰는 사람에게는 최고의 선택이다.',
        recommendedFor: 'Apple 기기를 여러 개 사용하는 사용자',
      },
      {
        rank: 3,
        productName: '다이슨 V15 Detect',
        brand: '다이슨',
        pros: ['레이저 먼지 감지 기능이 신박함', '다양한 청소 헤드 구성'],
        cons: ['가격이 너무 높음', '무거워서 한 손 청소가 어려움'],
        verdict: '혁신적인 기능이 많지만, 가격 대비 효용은 개인의 청소 환경에 따라 다르다.',
        recommendedFor: '최신 기술을 선호하는 얼리어답터',
      },
    ],
    createdAt: '2026-06-01T02:00:00.000Z',
    updatedAt: '2026-06-01T02:00:00.000Z',
  },
];

const SUGGESTED_SEARCHES = [
  { main: '가전제품', sub: '청소기', youtuber: '리뷰맨', label: '가전제품 > 청소기' },
  { main: '전자기기', sub: '스마트폰', youtuber: '잇섭', label: '전자기기 > 스마트폰' },
  { main: '전자기기', sub: '키보드', youtuber: '테크몬', label: '전자기기 > 키보드' },
  { main: '가전제품', sub: '냉장고', youtuber: '리뷰맨', label: '가전제품 > 냉장고' },
  { main: '생활용품', sub: '공기청정기', youtuber: '잇섭', label: '생활용품 > 공기청정기' },
];

export default function Recommendations() {
  const [reviews, setReviews] = useState<YoutubeReviewVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [searched, setSearched] = useState(false);

  const [categoryMain, setCategoryMain] = useState('');
  const [categorySub, setCategorySub] = useState('');
  const [youtuber, setYoutuber] = useState('');

  // 제품 리뷰 비교 모달 상태
  const [reviewModalProduct, setReviewModalProduct] = useState<{
    productName: string;
    brand: string;
    reviews: ProductReviewEntry[];
  } | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<number[]>([0]);

  const hasActiveFilters = categoryMain || categorySub || youtuber;

  // reviews → productName 기준 그루핑
  const productMap = useMemo(() => {
    const map = new Map<string, ProductReviewEntry[]>();
    reviews.forEach((review) => {
      review.products?.forEach((product) => {
        if (!map.has(product.productName)) {
          map.set(product.productName, []);
        }
        map.get(product.productName)!.push({
          youtuberName: review.youtuberName,
          videoUrl: review.videoUrl,
          rank: product.rank,
          brand: product.brand ?? '',
          pros: product.pros ?? [],
          cons: product.cons ?? [],
          verdict: product.verdict ?? '',
          recommendedFor: product.recommendedFor ?? '',
        });
      });
    });
    return map;
  }, [reviews]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setServerError('');
      setSearched(true);
      const response = await fetchYoutubeReviews({
        categoryMain: categoryMain.trim(),
        categorySub: categorySub.trim(),
        youtuber: youtuber.trim(),
      });
      if (Array.isArray(response.data)) {
        setReviews(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch {
      setServerError('실시간 리뷰를 불러오지 못했습니다. 예시 데이터를 표시합니다.');
      setReviews(fallbackReviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 마운트 시 아무것도 표시하지 않음 (empty state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuggestionClick = (main: string, sub: string, yt: string) => {
    setCategoryMain(main);
    setCategorySub(sub);
    setYoutuber(yt);
    setLoading(true);
    setSearched(true);
    setServerError('');
    fetchYoutubeReviews({ categoryMain: main, categorySub: sub, youtuber: yt })
      .then((response) => {
        if (Array.isArray(response.data)) {
          setReviews(response.data);
        } else {
          throw new Error('Invalid response format');
        }
      })
      .catch(() => {
        setServerError('실시간 리뷰를 불러오지 못했습니다. 예시 데이터를 표시합니다.');
        setReviews(fallbackReviews);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSearch = () => {
    if (!categoryMain.trim() || !categorySub.trim() || !youtuber.trim()) {
      alert('주 카테고리, 서브 카테고리, 유튜버 이름을 모두 입력해주세요.');
      return;
    }
    void loadReviews();
  };

  const handleReset = () => {
    setCategoryMain('');
    setCategorySub('');
    setYoutuber('');
    setSearched(false);
    setReviews([]);
    setServerError('');
  };



  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50">
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* ── Page Header ── */}
          <div className="mb-6 md:mb-8 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">추천</h1>
              <p className="text-slate-500 dark:text-slate-300 mt-1 font-medium">유튜버 리뷰 기반 상품 추천</p>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                {/* 주 카테고리 */}
                <div className="relative flex-1">
                  <input
                    value={categoryMain}
                    onChange={(e) => { setCategoryMain(e.target.value); setCategorySub(''); }}
                    placeholder="주 카테고리 (예: 전자기기)"
                    className="w-full px-4 py-2.5 text-sm bg-[#F0F5FF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-50 h-10"
                  />
                </div>

                {/* 서브 카테고리 */}
                <div className="relative flex-1">
                  <input
                    value={categorySub}
                    onChange={(e) => setCategorySub(e.target.value)}
                    placeholder="서브 카테고리 (예: 키보드)"
                    className="w-full px-4 py-2.5 text-sm bg-[#F0F5FF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-50 h-10"
                  />
                </div>

                {/* 유튜버 검색 */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400" />
                  <input
                    value={youtuber}
                    onChange={(e) => setYoutuber(e.target.value)}
                    placeholder="유튜버 이름 검색"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#F0F5FF] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-50 h-10"
                  />
                </div>

                {/* 검색 버튼 */}
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full md:w-auto h-10 rounded-xl bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] dark:from-[#1E4D8C] dark:to-[#0F3460] text-white font-bold hover:from-[#0F3460] hover:to-[#0F3460] shadow-[0_4px_10px_rgba(30,77,140,0.25)] border-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      검색 중
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      리뷰 찾기
                    </span>
                  )}
                </Button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    초기화
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* ── Server Error Banner ── */}
          {serverError && (
            <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {serverError}
            </div>
          )}

          {/* ── Loading Skeleton ── */}
          {loading && (
            <div className="space-y-5">
              {[1, 2, 3].map((s) => (
                <div key={s} className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                  <div className="h-5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 mb-4" />
                  <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-6 w-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
                      <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="rounded-xl bg-slate-200/50 dark:bg-slate-700/50 p-3 space-y-2">
                        <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="rounded-xl bg-slate-200/50 dark:bg-slate-700/50 p-3 space-y-2">
                        <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                    <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 검색 전 초기 상태 ── */}
          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center w-full min-h-[400px] text-center px-4">
              <h2 className="mb-2 text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50">
                유튜버들의 진짜 리뷰로<br className="sm:hidden" />
                <span className="text-[#1E4D8C] dark:text-[#7BAEDA]"> 똑똑한 소비</span>를 시작하세요
              </h2>
              <p className="mb-8 text-sm text-slate-500 dark:text-slate-400 max-w-[400px]">
                상단에 카테고리를 입력하시면, 광고 없는 진짜 후기와 추천 상품을 모아 보여드립니다.
              </p>

              {/* 추천 검색어 칩 */}
              <div className="w-full max-w-md p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <p className="mb-3 text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  이런 조합은 어때요?
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_SEARCHES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(item.main, item.sub, item.youtuber)}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 hover:from-[#1E4D8C]/10 hover:to-[#0F3460]/10 dark:hover:from-[#7BAEDA]/10 dark:hover:to-[#1E4D8C]/10 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA] transition-all duration-200 border border-slate-200 dark:border-slate-600 hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/30 shadow-sm hover:shadow-md"
                    >
                      {item.label}
                      <Search className="w-3 h-3 ml-0.5 opacity-40" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Products List (검색 후 - 제품 중심) ── */}
          {searched && !loading && productMap.size > 0 && (
            <div className="space-y-5">
              {Array.from(productMap.entries()).map(([productName, entries], productIdx) => {
                // 유튜버 필터 시: 검색 유튜버 우선, 없으면 1순위 유튜버 → "외 N명"
                const filteredYoutuberName = youtuber.trim().toLowerCase();
                const matchedEntry = filteredYoutuberName
                  ? entries.find((e) => e.youtuberName.toLowerCase().includes(filteredYoutuberName))
                  : null;
                const primaryEntry = matchedEntry ?? entries.reduce((best, e) => (e.rank < best.rank ? e : best), entries[0]);
                const brand = primaryEntry.brand ?? '';
                const firstEntry = entries[0];

                return (
                  <div
                    key={productName}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-xl hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/30 hover:-translate-y-0.5 transition-all duration-300"
                    style={{ animation: `fadeIn 0.3s ease-out ${productIdx * 0.05}s both` }}
                  >
                    {/* 제품 헤더 */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-[#1E4D8C] dark:bg-[#1E4D8C] text-white shadow-sm">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {primaryEntry.rank}위
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-50">{productName}</span>
                      {brand && <span className="text-sm font-medium text-[#1E4D8C] dark:text-[#7BAEDA]">{brand}</span>}
                    </div>

                    {/* 리뷰한 유튜버 목록 */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/10 text-[#1E4D8C] dark:text-[#7BAEDA] border border-[#1E4D8C]/30 dark:border-[#7BAEDA]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                        {firstEntry.youtuberName}
                      </span>
                      {entries.length > 1 && (
                        <span className="text-xs text-slate-400">
                          외 {entries.length - 1}명
                        </span>
                      )}
                    </div>

                    {/* 장점 / 단점 요약 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3">
                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          장점
                        </h4>
                        <div className="space-y-1.5">
                          {(primaryEntry.pros?.length ?? 0) > 0 ? primaryEntry.pros.slice(0, 2).map((pro, pi) => (
                            <div key={pi} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <span className="text-xs text-emerald-900 dark:text-emerald-300">{pro}</span>
                            </div>
                          )) : <span className="text-xs text-slate-400">-</span>}
                          {primaryEntry.pros.length > 2 && <span className="text-xs text-slate-400">외 {primaryEntry.pros.length - 2}개</span>}
                        </div>
                      </div>
                      <div className="rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-3">
                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          단점
                        </h4>
                        <div className="space-y-1.5">
                          {(primaryEntry.cons?.length ?? 0) > 0 ? primaryEntry.cons.slice(0, 2).map((con, ci) => (
                            <div key={ci} className="flex items-start gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                              <span className="text-xs text-rose-900 dark:text-rose-300">{con}</span>
                            </div>
                          )) : <span className="text-xs text-slate-400">-</span>}
                          {primaryEntry.cons.length > 2 && <span className="text-xs text-slate-400">외 {primaryEntry.cons.length - 2}개</span>}
                        </div>
                      </div>
                    </div>

                    {/* 총평 + 리뷰 보기 */}
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="min-w-0 flex-1 mr-3">
                        {primaryEntry.verdict && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed truncate">
                            <span className="text-2xl leading-none text-slate-300 dark:text-slate-600 italic font-serif mr-1">"</span>
                            {primaryEntry.verdict}
                            <span className="text-2xl leading-none text-slate-300 dark:text-slate-600 italic font-serif ml-1">"</span>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalProduct({
                            productName,
                            brand,
                            reviews: entries,
                          });
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#1E4D8C]/5 dark:bg-[#7BAEDA]/10 hover:bg-[#1E4D8C]/10 dark:hover:bg-[#7BAEDA]/20 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        유튜버 리뷰 {entries.length}개 모아보기
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── style keyframes ── */}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* ── 검색 결과 없음 ── */}
          {searched && !loading && !serverError && (reviews?.length ?? 0) === 0 && (
            <div className="py-16 text-center text-slate-400">조회된 리뷰가 없습니다.</div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          Modal: 제품 리뷰 비교 (여러 유튜버)
      ══════════════════════════════════════════════════════════ */}
      {reviewModalProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setReviewModalProduct(null)}
        >
          <div
            className="relative w-full md:max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                  {reviewModalProduct.productName}
                </h2>
                {reviewModalProduct.brand && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{reviewModalProduct.brand}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{reviewModalProduct.reviews.length}명의 유튜버 리뷰</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalProduct(null)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>



            {/* 리뷰 비교 목록 (아코디언) */}
            <div className="p-5 sm:p-6 flex flex-col gap-3">
              {reviewModalProduct.reviews.map((entry, idx) => {
                const isOpen = expandedReviews.includes(idx);
                return (
                  <div
                    key={idx}
                    id={`review-${idx}`}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 scroll-mt-20 shadow-sm overflow-hidden"
                  >
                    {/* 헤더 (클릭 가능) */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedReviews((prev) =>
                          isOpen ? prev.filter((i) => i !== idx) : [...prev, idx]
                        );
                      }}
                      className="flex items-center justify-between w-full p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-sm">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{entry.youtuberName}</span>
                            <span className="text-xs text-slate-400">{entry.rank}위</span>
                          </div>
                          {entry.verdict && !isOpen && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-md">
                              "{entry.verdict}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={entry.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E4D8C] dark:text-[#7BAEDA] hover:underline px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          영상
                        </a>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* 내용 (펼쳐졌을 때만) */}
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                        {/* 장점 */}
                        <div className="mb-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">장점</p>
                          <ul className="space-y-1">
                            {entry.pros.map((pro, pi) => (
                              <li key={pi} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="text-emerald-500 mr-2 font-bold">·</span>
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* 단점 */}
                        <div className="mb-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 p-3.5">
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">단점</p>
                          <ul className="space-y-1">
                            {entry.cons.map((con, ci) => (
                              <li key={ci} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="text-rose-400 mr-2 font-bold">·</span>
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* 총평 */}
                        {entry.verdict && (
                          <p className="text-sm text-[#1E4D8C] dark:text-[#7BAEDA] leading-relaxed italic font-medium mt-2">
                            "{entry.verdict}"
                          </p>
                        )}
                        {entry.recommendedFor && (
                          <p className="text-xs text-slate-400 mt-1">추천 대상: {entry.recommendedFor}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
