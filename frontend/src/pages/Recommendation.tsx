import { useEffect, useState } from 'react';
import {
  RefreshCw, TrendingUp, Sparkles,
  ThumbsUp, ThumbsDown, ExternalLink,
  Film, Loader2, X, CheckCircle2, XCircle, Play,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  fetchRecommendationCategories,
  fetchRecommendationItems,
  fetchRecommendationDetail,
} from '@/api/recommendation';
import type {
  RecommendationCategory,
  RecommendationItem,
  RecommendationDetail,
  YoutuberReview,
} from '@/types/recommendation';

// ── API 실패 시 대체할 fallback 데이터 ──────────────────────────

const fallbackCategories: RecommendationCategory[] = [
  { categoryId: 'home_appliances', categoryName: '가전제품', description: '냉장고, 세탁기, 청소기 등', productCount: 18, lastAnalysisDate: '2026-04-14' },
  { categoryId: 'electronics', categoryName: '전자제품', description: '스마트폰, 노트북, 태블릿 등', productCount: 24, lastAnalysisDate: '2026-04-15' },
  { categoryId: 'daily_supplies', categoryName: '생활용품', description: '주방용품, 욕실용품, 수납용품 등', productCount: 31, lastAnalysisDate: '2026-04-13' },
];

const fallbackItemsByCategory: Record<string, RecommendationItem[]> = {
  home_appliances: [
    {
      productId: 1, rank: 1, productName: '로보락 S8 Pro 로봇청소기', brand: '로보락',
      pros: '강력한 흡입력과 물걸레 동시 지원. 장애물 인식 정확도가 높음',
      cons: '가격대가 높음. 유지보수 비용 발생',
      youtuber: '유병준의 IT PLUS', videoUrl: 'https://youtube.com/watch?v=abc123',
      analysisDate: '2026-04-15',
    },
    {
      productId: 2, rank: 2, productName: '다이슨 V15 디텍트', brand: '다이슨',
      pros: '레이저 먼지 감지 기능. 강력한 흡입력',
      cons: '배터리 지속 시간이 짧음. 무거운 편',
      youtuber: '테크몬', videoUrl: 'https://youtube.com/watch?v=def456',
      analysisDate: '2026-04-15',
    },
  ],
};

// ── 유틸 ────────────────────────────────────────────────────────

const splitBullets = (text: string): string[] =>
  text
    .split(/\.\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

const formatRelativeDate = (dateStr: string): string => {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return '분석 전';
  if (diffDays === 0) return '오늘 분석';
  if (diffDays === 1) return '어제 분석';
  if (diffDays <= 7) return `${diffDays}일 전 분석`;
  if (diffDays <= 30) return `${Math.floor(diffDays / 7)}주 전 분석`;
  return target.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
};

// ── 모달 프리뷰용 하드코딩 데이터 (TODO: 개발 후 제거) ─────────

const sampleDetail: RecommendationDetail = {
  productId: 1,
  category: 'home_appliances',
  categoryName: '가전제품',
  rank: 1,
  productName: '로보락 S8 Pro 로봇청소기',
  brand: '로보락',
  pros: '강력한 흡입력과 물걸레 동시 지원. 장애물 인식 정확도가 높음. 앱 연동이 편리함',
  cons: '가격대가 높음. 유지보수 비용 발생. 먼지통 용량이 작음',
  youtuberReviews: [
    {
      youtuber: '유병준의 IT PLUS',
      videoUrl: 'https://youtube.com/watch?v=abc123',
      pros: '흡입력이 매우 강력하고 물걸레 기능까지 겸비해 청소 효율이 높음. 특히 카펫 위 성능이 인상적임',
      cons: '초기 설치 및 앱 설정이 다소 복잡함. 생각보다 설명서가 불친절함',
      analysisDate: '2026-04-15',
    },
    {
      youtuber: '테크몬',
      videoUrl: 'https://youtube.com/watch?v=xyz789',
      pros: '장애물 인식률이 경쟁 제품보다 월등히 뛰어남. 야간에도 잘 작동함',
      cons: '먼지통 용량이 작아 자주 비워야 함. 물걸레 물통도 자주 리필 필요',
      analysisDate: '2026-04-14',
    },
    {
      youtuber: 'ITSub잇섭',
      videoUrl: 'https://youtube.com/watch?v=sub111',
      pros: '로봇청소기 중에서 디자인이 가장 깔끔하고 인테리어를 해치지 않음',
      cons: '비싼 가격 대비 성능 차이가 미미할 수 있음. 이전 모델 대비 큰 변화 없음',
      analysisDate: '2026-04-13',
    },
  ],
  analysisDate: '2026-04-15',
  createdAt: '2026-04-01T00:00:00',
  updatedAt: '2026-04-15T06:00:00',
};

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function Recommendations() {
  const [categories, setCategories] = useState<RecommendationCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [recommendationItems, setRecommendationItems] = useState<RecommendationItem[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [lastAnalysisDate, setLastAnalysisDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Modal state ──
  const [sheetOpen, setSheetOpen] = useState(false);  // TODO: preview용
  const [detailData, setDetailData] = useState<RecommendationDetail | null>(sampleDetail); // TODO: preview용
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [modalIn, setModalIn] = useState(false); // entrance animation

  // 모달 진입/퇴장 애니메이션
  useEffect(() => {
    if (sheetOpen) {
      const raf = requestAnimationFrame(() => setModalIn(true));
      return () => cancelAnimationFrame(raf);
    }
    setModalIn(false);
  }, [sheetOpen]);

  const openReviewSheet = async (item: RecommendationItem) => {
    setSheetOpen(true);
    setSheetOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);

    try {
      const res = await fetchRecommendationDetail(activeCategoryId, item.productId);
      setDetailData(res.data);
    } catch {
      // 서버 응답 실패 시 하드코딩된 샘플 데이터로 대체
      setDetailData(sampleDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReviewSheet = () => {
    setModalIn(false); // close animation 시작
    setTimeout(() => {
      setSheetOpen(false);
      setDetailData(null);
      setDetailError('');
    }, 200);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeReviewSheet(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sheetOpen]);

  const activeCategory = categories.find((c) => c.categoryId === activeCategoryId);

  // ── 최초 마운트: 카테고리 목록 로드 ──────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchRecommendationCategories();
        const fetched = response.data.categories;
        setCategories(fetched);
        if (fetched.length > 0) {
          setActiveCategoryId(fetched[0].categoryId);
        }
      } catch {
        setError('추천 카테고리를 불러오지 못했습니다. 로컬 데이터를 표시합니다.');
        setCategories(fallbackCategories);
        setActiveCategoryId(fallbackCategories[0].categoryId);
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, []);

  // ── 활성 카테고리가 바뀌면 추천 상품 목록 로드 ──────────────
  useEffect(() => {
    if (!activeCategoryId) return;

    const loadItems = async () => {
      try {
        setItemsLoading(true);
        const response = await fetchRecommendationItems(activeCategoryId);
        const d = response.data;
        setCategoryName(d.categoryName);
        setLastAnalysisDate(d.lastAnalysisDate);
        setRecommendationItems(d.recommendations);
      } catch {
        setCategoryName(activeCategory?.categoryName ?? '');
        setLastAnalysisDate(activeCategory?.lastAnalysisDate ?? '');
        setRecommendationItems(fallbackItemsByCategory[activeCategoryId] ?? []);
      } finally {
        setItemsLoading(false);
      }
    };

    void loadItems();
  }, [activeCategoryId, activeCategory]);

  // ── 새로고침 ──────────────────────────────────────────────────
  const handleRefresh = async () => {
    try {
      setError('');
      const response = await fetchRecommendationCategories();
      setCategories(response.data.categories);
    } catch {
      setError('카테고리 새로고침에 실패했습니다.');
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-screen font-sans text-[#0F172A] dark:text-slate-50">
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* ── Page Header ── */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] text-white shrink-0">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] dark:text-slate-50">
                추천
              </h1>
              <p className="text-[#475569] dark:text-slate-400 mt-1 font-medium">
                유튜버 리뷰 기반 상품 추천
              </p>
            </div>
          </div>

          {/* ── Loading Indicator (initial) ── */}
          {loading && (
            <div className="mb-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 text-sm text-[#475569] dark:text-slate-400 shadow-sm font-medium">
              추천 데이터를 불러오는 중입니다...
            </div>
          )}

          {/* ── Error Banner ── */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-6 py-4 text-sm text-red-800 dark:text-red-300 shadow-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Main Section ── */}
          {!loading && (
            <div className="w-full rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
              {/* ── Section Header: Category Tabs + Refresh ── */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-700 px-5 py-4">
                <div className="flex flex-wrap gap-1 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg p-1">
                  {categories.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => setActiveCategoryId(category.categoryId)}
                      className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all duration-200 cursor-pointer ${
                        activeCategoryId === category.categoryId
                          ? 'bg-[#6366F1] dark:bg-indigo-600 text-white shadow-sm'
                          : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      {category.categoryName}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-900 hover:text-[#6366F1] dark:hover:text-indigo-400"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>

              {/* ── Inner Content ── */}
              <div className="bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-5">
                {/* Category Info */}
                {categoryName && (
                  <div className="flex items-center justify-between mb-5 px-1">
                    <p className="text-sm text-[#475569] dark:text-slate-400">
                      {activeCategory?.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-slate-500">
                      {lastAnalysisDate && (
                        <span className="hidden sm:inline">
                          마지막 분석일: {lastAnalysisDate}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Loading */}
                {itemsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="w-8 h-8 text-[#6366F1] dark:text-indigo-400 animate-spin mb-4" />
                    <p className="text-[#475569] dark:text-slate-400 text-sm font-medium">
                      추천 상품을 불러오는 중입니다...
                    </p>
                  </div>
                ) : recommendationItems.length > 0 ? (
                  /* ── 상품 목록 ── */
                  <div className="grid grid-cols-1 gap-5">
                    {recommendationItems.map((item) => (
                      <div
                        key={item.productId}
                        className="w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 hover:border-[#6366F1]/30 dark:hover:border-indigo-400/30 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col group"
                      >
                        {/* ── Rank + Brand + Product Name ── */}
                        <div className="flex flex-col gap-1.5 mb-5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-[#6366F1] dark:bg-indigo-500 text-white shadow-sm">
                              <TrendingUp className="w-4 h-4" />
                              {item.rank}위
                            </span>
                            {item.brand && (
                              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {item.brand}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-50 group-hover:text-[#6366F1] dark:group-hover:text-indigo-400 transition-colors leading-tight">
                            {item.productName}
                          </h3>
                        </div>

                        {/* ── 장점 / 단점 (분할 리스트) ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                          <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 p-4">
                            <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-3 flex items-center gap-1.5">
                              <ThumbsUp className="w-4 h-4 text-[#6366F1] dark:text-indigo-400" />
                              장점
                            </h4>
                            <div className="space-y-2">
                              {splitBullets(item.pros).map((pro, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-[#6366F1] dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-[#475569] dark:text-slate-400 text-sm">{pro}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl bg-rose-50/50 dark:bg-rose-500/10 p-4">
                            <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-3 flex items-center gap-1.5">
                              <ThumbsDown className="w-4 h-4 text-[#EF4444]" />
                              단점
                            </h4>
                            <div className="space-y-2">
                              {splitBullets(item.cons).map((con, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <XCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                                  <span className="text-[#475569] dark:text-slate-400 text-sm">{con}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── 푸터 ── */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0] dark:border-slate-700 mt-auto">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* 유튜버 */}
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                            </div>
                            <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 truncate">
                              {item.youtuber}
                            </span>

                            {/* 영상 링크 */}
                            {item.videoUrl && (
                              <>
                                <span className="text-gray-300 dark:text-slate-600 shrink-0">·</span>
                                <a
                                  href={item.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366F1] dark:text-indigo-400 hover:text-red-500 dark:hover:text-red-400 hover:underline transition-colors shrink-0 whitespace-nowrap"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  영상
                                </a>
                              </>
                            )}

                            {/* 분석일 */}
                            <span className="text-gray-300 dark:text-slate-600 shrink-0">·</span>
                            <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                              {formatRelativeDate(item.analysisDate)}
                            </span>
                          </div>

                          {/* 리뷰 보기 */}
                          <button
                            type="button"
                            onClick={() => openReviewSheet(item)}
                            disabled={detailLoading}
                            className="group/btn inline-flex items-center justify-center gap-2 w-full md:w-auto px-5 py-3 md:px-6 md:py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] dark:from-indigo-500 dark:to-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer whitespace-nowrap"
                          >
                            <Film className="w-4 h-4" />
                            리뷰
                            <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── Empty State ── */
                  <div className="py-16 flex flex-col items-center justify-center text-center bg-[#F8FAFC] dark:bg-slate-950 rounded-[1.5rem] border-2 border-dashed border-[#E2E8F0] dark:border-slate-700">
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F9] dark:bg-slate-900 flex items-center justify-center mb-4 text-[#475569] dark:text-slate-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-50 mb-1">
                      해당 카테고리에 추천 상품이 없습니다
                    </h4>
                    <p className="text-[#475569] dark:text-slate-400 text-sm">
                      다른 카테고리를 선택해주세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          Modal: 상품 상세 + 유튜버 리뷰
      ══════════════════════════════════════════════════════════ */}
      {sheetOpen && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${
            modalIn ? 'bg-black/50' : 'bg-transparent pointer-events-none'
          }`}
          onClick={closeReviewSheet}
        >
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl transition-all duration-300 ${
              modalIn ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-[#6366F1] dark:text-indigo-400 animate-spin" />
                <p className="text-sm text-[#475569] dark:text-slate-400 font-medium">
                  상세 정보를 불러오는 중입니다...
                </p>
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{detailError}</p>
                <p className="text-xs text-[#64748B] dark:text-slate-500">잠시 후 다시 시도해주세요.</p>
              </div>
            ) : detailData ? (
              <SheetContent detail={detailData} onClose={closeReviewSheet} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Modal 내부 컨텐츠
   ─────────────────────────────────────────────────────────────── */
function SheetContent({ detail, onClose }: { detail: RecommendationDetail; onClose: () => void }) {
  return (
    <>
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#6366F1] dark:bg-indigo-500 text-white shadow-sm shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              {detail.rank}위
            </span>
            {detail.brand && (
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {detail.brand}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-50 leading-tight truncate">
            {detail.productName}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="p-5 sm:p-6 flex flex-col gap-6">
        {/* ── Aggregated Pros / Cons ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-4">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" />
              종합 장점
            </h4>
            <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
              {detail.pros}
            </p>
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-4">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-2 flex items-center gap-1.5">
              <ThumbsDown className="w-4 h-4" />
              종합 단점
            </h4>
            <p className="text-sm text-rose-900 dark:text-rose-200 leading-relaxed">
              {detail.cons}
            </p>
          </div>
        </div>

        {/* ── 유튜버 리뷰 (슬라이드) ── */}
        <ReviewCarousel reviews={detail.youtuberReviews} />

        {/* ── 분석일 ── */}
        <p className="text-xs text-[#94A3B8] dark:text-slate-500 text-center">
          분석일: {detail.analysisDate}
        </p>
      </div>
    </>
  );
}

/* ── 유튜버 리뷰 캐러셀 (한 번에 하나씩) ──────────────────── */
function ReviewCarousel({ reviews }: { reviews: YoutuberReview[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = reviews.length;

  if (total === 0) {
    return (
      <p className="text-sm text-[#94A3B8] dark:text-slate-500 text-center py-4">
        아직 등록된 유튜버 리뷰가 없습니다.
      </p>
    );
  }

  const goPrev = () => setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  const goNext = () => setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));

  const review = reviews[currentIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 + 카운트 */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-slate-700" />
        <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 tracking-wider shrink-0">
          유튜버 리뷰 {currentIndex + 1}/{total}
        </span>
        <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-slate-700" />
      </div>

      {/* 슬라이드 영역 */}
      <div className="relative">
        {/* 이전 버튼 */}
        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
          </button>
        )}

        <YoutuberReviewCard review={review} />

        {/* 다음 버튼 */}
        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
          </button>
        )}
      </div>

      {/* 닷 인디케이터 */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                idx === currentIndex
                  ? 'bg-[#6366F1] dark:bg-indigo-400 w-4'
                  : 'bg-[#CBD5E1] dark:bg-slate-600 hover:bg-[#94A3B8] dark:hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 개별 유튜버 리뷰 카드 ──────────────────────────────────── */
function YoutuberReviewCard({ review }: { review: YoutuberReview }) {
  return (
    <div className="mx-auto w-full max-w-[360px] lg:max-w-none snap-center bg-indigo-50/40 dark:bg-slate-800 border border-indigo-100/60 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
      {/* Header: Youtuber + Video Link */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50 truncate">
              {review.youtuber}
            </p>
            <p className="text-[11px] text-[#94A3B8] dark:text-slate-500">
              {review.analysisDate}
            </p>
          </div>
        </div>

        <a
          href={review.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group/btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 shrink-0"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 group-hover/btn:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 group-hover/btn:text-red-600 dark:group-hover/btn:text-red-400 transition-colors">
            영상 보기
          </span>
          <ExternalLink className="w-3 h-3 text-[#94A3B8] dark:text-slate-500 group-hover/btn:text-red-500 transition-colors" />
        </a>
      </div>

      {/* Pros / Cons */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
            Good
          </span>
          <p className="text-sm text-[#475569] dark:text-slate-400 leading-relaxed">
            {review.pros}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
            Bad
          </span>
          <p className="text-sm text-[#475569] dark:text-slate-400 leading-relaxed">
            {review.cons}
          </p>
        </div>
      </div>
    </div>
  );
}
