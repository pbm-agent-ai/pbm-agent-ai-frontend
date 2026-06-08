import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, ExternalLink, Play, ChevronRight, ChevronDown, ChevronUp, X,
  ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { fetchRecommendationItems, fetchYoutubeReviews } from '@/api/recommendation';
import type { RecommendationItem, YoutubeReviewVideo } from '@/types/recommendation';
import DecorativeBackground from '../components/ui/DecorativeBackground';

// ── 정적 카테고리 정의 (프론트 전용, 백엔드 enum 값과 매핑) ─────

interface CategoryDef {
  id: string;
  label: string;
}

const MAIN_CATEGORIES: CategoryDef[] = [
  { id: 'HOME_APPLIANCE', label: '가전제품' },
  { id: 'IT_ELECTRONICS', label: 'IT/전자제품' },
  { id: 'OTHER', label: '기타' },
];

const SUB_CATEGORIES: Record<string, CategoryDef[]> = {
  HOME_APPLIANCE: [
    { id: 'FOOD_PROCESSOR', label: '음식물 처리기' },
    { id: 'WET_VACUUM', label: '습식 청소기' },
    { id: 'ROBOT_VACUUM', label: '로봇 청소기' },
    { id: 'STICK_VACUUM', label: '스틱 청소기' },
    { id: 'AIR_PURIFIER', label: '공기청정기' },
    { id: 'WASHING_MACHINE', label: '세탁기' },
    { id: 'REFRIGERATOR', label: '냉장고' },
    { id: 'MICROWAVE', label: '전자레인지' },
    { id: 'DISHWASHER', label: '식기세척기' },
    { id: 'COFFEE_MACHINE', label: '커피머신' },
    { id: 'AIR_CONDITIONER', label: '에어컨' },
    { id: 'DEHUMIDIFIER', label: '제습기' },
  ],
  IT_ELECTRONICS: [
    { id: 'LAPTOP', label: '노트북' },
    { id: 'SMARTPHONE', label: '스마트폰' },
    { id: 'TABLET', label: '태블릿' },
    { id: 'MONITOR', label: '모니터' },
    { id: 'KEYBOARD', label: '키보드' },
    { id: 'MOUSE', label: '마우스' },
    { id: 'HEADPHONE', label: '헤드폰' },
    { id: 'EARPHONE', label: '이어폰' },
    { id: 'SPEAKER', label: '스피커' },
    { id: 'CAMERA', label: '카메라' },
    { id: 'TV', label: 'TV' },
  ],
  OTHER: [
    { id: 'FITNESS', label: '피트니스' },
    { id: 'FOOD', label: '식품' },
    { id: 'BEAUTY', label: '뷰티' },
    { id: 'FASHION', label: '패션' },
    { id: 'SPORTS', label: '스포츠' },
    { id: 'BOOK', label: '도서' },
    { id: 'TOY', label: '장난감' },
    { id: 'PET', label: '반려동물' },
  ],
};

// ── 제품 비교 모달 타입 ──

interface ModalReviewEntry {
  youtuberName: string;
  videoUrl: string;
  rank: number;
  pros: string[];
  cons: string[];
  verdict: string;
}

type ViewState = 'initial' | 'loading' | 'loaded' | 'error';

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function Recommendations() {
  const [mainCategory, setMainCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);

  const [viewState, setViewState] = useState<ViewState>('initial');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // 모달 상태
  const [modalProduct, setModalProduct] = useState<{
    productName: string;
    brand: string;
    reviews: ModalReviewEntry[];
  } | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<number[]>([]);

  const subs = mainCategory ? (SUB_CATEGORIES[mainCategory] ?? []) : [];

  // ── 데이터 로드 ──

  const loadRecommendations = useCallback(async (subId: string) => {
    setViewState('loading');
    setErrorMessage('');

    try {
      const resp = await fetchRecommendationItems(subId);
      if (resp.success && resp.data.recommendations.length > 0) {
        setRecommendations(resp.data.recommendations);
        setViewState('loaded');
      } else {
        setRecommendations([]);
        setViewState('loaded');
      }
    } catch {
      setErrorMessage('리뷰 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setViewState('error');
    }
  }, []);

  useEffect(() => {
    if (subCategory) {
      void loadRecommendations(subCategory);
    }
  }, [subCategory, loadRecommendations]);

  // ── 메인 카테고리 선택 ──

  const handleMainSelect = (id: string) => {
    setMainCategory(id);
    setSubCategory(null);
    setRecommendations([]);
    setViewState('initial');
    setErrorMessage('');
  };

  // ── 서브 카테고리 선택 ──

  const handleSubSelect = (id: string) => {
    setSubCategory(id);
  };

  // ── 모달: 유튜버 리뷰 모아보기 (raw API) ──

  const openReviewModal = async (productName: string, brand: string) => {
    if (!subCategory) return;

    try {
      const resp = await fetchYoutubeReviews({
        categoryMain: '',
        categorySub: subCategory,
        youtuber: '',
      });
      const rawReviews: YoutubeReviewVideo[] = resp.data ?? [];
      // 같은 productName을 리뷰한 모든 유튜버 수집
      const entries: ModalReviewEntry[] = [];
      rawReviews.forEach((rv) => {
        rv.products?.forEach((p) => {
          if (p.productName === productName) {
            entries.push({
              youtuberName: rv.youtuberName,
              videoUrl: rv.videoUrl,
              rank: p.rank,
              pros: p.pros ?? [],
              cons: p.cons ?? [],
              verdict: p.verdict ?? '',
            });
          }
        });
      });
      if (entries.length === 0) return;
      setModalProduct({ productName, brand, reviews: entries });
      setExpandedReviews([0]);
    } catch {
      // 모달 열기 실패는 무시
    }
  };

  const subLabel = subCategory
    ? (SUB_CATEGORIES[mainCategory ?? ''] ?? []).find((s) => s.id === subCategory)?.label ?? subCategory
    : '';

  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden">
      <DecorativeBackground variant="minimal" />
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1000px] mx-auto">

          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-10 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">추천</h1>
              <p className="text-slate-500 dark:text-slate-300 mt-1 font-medium">유튜버 리뷰 기반 상품 추천</p>
            </div>
          </div>

          {/* ═══════════ Main Category Tabs ═══════════ */}
          <div className="mb-5">
            <div className="flex flex-wrap gap-2">
              {MAIN_CATEGORIES.map((cat) => {
                const active = mainCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleMainSelect(cat.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      active
                        ? 'bg-[#1E4D8C] dark:bg-[#1E4D8C] text-white shadow-[0_4px_10px_rgba(30,77,140,0.25)]'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/40 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════════ Sub Category Tabs (메인 선택 시) ═══════════ */}
          {mainCategory && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-1.5">
                {subs.map((sub) => {
                  const active = subCategory === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubSelect(sub.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/15 text-[#1E4D8C] dark:text-[#7BAEDA] border border-[#1E4D8C]/30 dark:border-[#7BAEDA]/30'
                          : 'bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/30 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════ Error Banner ═══════════ */}
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {errorMessage}
            </div>
          )}

          {/* ═══════════ Loading Skeleton ═══════════ */}
          {viewState === 'loading' && (
            <div className="space-y-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="animate-pulse rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_rgb(15,23,42,0.04)]">
                  <div className="h-5 w-40 rounded-full bg-slate-200 dark:bg-slate-700 mb-4" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-3 space-y-2">
                      <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-3 space-y-2">
                      <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════ Initial State ═══════════ */}
          {viewState === 'initial' && !mainCategory && (
            <div className="flex flex-col items-center justify-center w-full min-h-[360px] text-center px-4">
              <h2 className="mb-2 text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50">
                유튜버들의 진짜 리뷰로<br className="sm:hidden" />
                <span className="text-[#1E4D8C] dark:text-[#7BAEDA]"> 똑똑한 소비</span>를 시작하세요
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[400px]">
                위에서 카테고리를 선택하면, 광고 없는 진짜 후기와 추천 상품을 모아 보여드립니다.
              </p>
            </div>
          )}

          {/* ═══════════ Empty State (데이터 없음) ═══════════ */}
          {viewState === 'loaded' && recommendations.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">이 카테고리의 리뷰 데이터가 아직 없습니다.</p>
            </div>
          )}

          {/* ═══════════ Results ═══════════ */}
          {viewState === 'loaded' && recommendations.length > 0 && (
            <div>
              {/* 활성 서브 카테고리 레이블 */}
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4">
                {subLabel} · 총 {recommendations.length}개 제품
              </p>

              <div className="space-y-4">
                {recommendations.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgb(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200"
                    style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both` }}
                  >
                    {/* 제품 헤더 */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-[#1E4D8C] dark:bg-[#1E4D8C] text-white shadow-sm">
                        {item.rank}위
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-50">{item.productName}</span>
                      {item.brand && (
                        <span className="text-sm font-medium text-[#1E4D8C] dark:text-[#7BAEDA]">{item.brand}</span>
                      )}
                    </div>

                    {/* 유튜버 + 영상 링크 */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/10 text-[#1E4D8C] dark:text-[#7BAEDA] border border-[#1E4D8C]/30 dark:border-[#7BAEDA]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                        {item.youtuber}
                      </span>
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E4D8C] dark:text-[#7BAEDA] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        리뷰 영상
                      </a>
                    </div>

                    {/* 장점 / 단점 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3">
                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          장점
                        </h4>
                        <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                          {item.pros || '-'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-3">
                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          단점
                        </h4>
                        <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
                          {item.cons || '-'}
                        </p>
                      </div>
                    </div>

                    {/* 하단: 분석일 + 리뷰 모아보기 */}
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className="text-[11px] text-slate-400">
                        분석일: {new Date(item.analysisDate).toLocaleDateString('ko-KR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void openReviewModal(item.productName, item.brand)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#1E4D8C]/5 dark:bg-[#7BAEDA]/10 hover:bg-[#1E4D8C]/10 dark:hover:bg-[#7BAEDA]/20 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        리뷰 모아보기
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ fadeIn keyframes ═══════════ */}
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          Modal: 제품 리뷰 비교 (여러 유튜버)
      ══════════════════════════════════════════════════════════ */}
      {modalProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => setModalProduct(null)}
        >
          <div
            className="relative w-full md:max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white dark:bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                  {modalProduct.productName}
                </h2>
                {modalProduct.brand && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{modalProduct.brand}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{modalProduct.reviews.length}명의 유튜버 리뷰</p>
              </div>
              <button
                type="button"
                onClick={() => setModalProduct(null)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 리뷰 비교 목록 (아코디언) */}
            <div className="p-5 sm:p-6 flex flex-col gap-3">
              {modalProduct.reviews.map((entry, idx) => {
                const isOpen = expandedReviews.includes(idx);
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
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
                        {entry.verdict && (
                          <p className="text-sm text-[#1E4D8C] dark:text-[#7BAEDA] leading-relaxed italic font-medium mt-2">
                            "{entry.verdict}"
                          </p>
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
