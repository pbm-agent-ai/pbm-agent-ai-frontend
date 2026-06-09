import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ExternalLink,
  RefreshCw, ChevronDown, DollarSign, BarChart3,
  Activity, Clock, ArrowUp, ArrowDown, Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { fetchConditionList } from '../api/condition';
import { fetchPriceHistory } from '../api/priceHistory';
import type { ConditionListItem } from '../types/condition';
import type { PriceHistoryData } from '../types/priceHistory';
import DecorativeBackground from '../components/DecorativeBackground';

// ── Mock Data (서버 미연결 시 fallback) ─────────────────────────

const MOCK_CONDITIONS: ConditionListItem[] = [
  {
    conditionId: 1, keyword: '인천-오사카 왕복 항공권', platform: 'naver_flight',
    maxPrice: 250000, mode: 'ALERT_ONLY', isActive: true, currentPrice: 271000,
    updatedAt: '2026-04-16T10:30:00', priceDiff: 21000,
  },
  {
    conditionId: 2, keyword: 'Apple AirPods Pro 2세대', platform: 'coupang',
    maxPrice: 300000, mode: 'ALERT_ONLY', isActive: true, currentPrice: 289000,
    updatedAt: '2026-04-16T09:00:00', priceDiff: -11000,
  },
  {
    conditionId: 3, keyword: 'PS5 디지털 에디션', platform: 'naver',
    maxPrice: 590000, mode: 'AUTO_PAYMENT', isActive: true, currentPrice: 635000,
    updatedAt: '2026-04-15T18:00:00', priceDiff: 45000,
  },
];

const MOCK_PRICE_HISTORY: PriceHistoryData[] = [
  // ── conditionId 1: ICN-TYO 항공권 (하락 추세, 목표가 미달) ──
  {
    conditionId: 1, keyword: '인천-오사카 왕복 항공권', platform: 'naver_flight',
    maxPrice: 250000, currentPrice: 271000, lowestPrice: 239000, highestPrice: 298000, averagePrice: 268000,
    totalElements: 48, totalPages: 1, currentPage: 0,
    priceHistory: [
      { price: 271000, originalPrice: 290000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-16T10:30:00' },
      { price: 268000, originalPrice: 285000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-16T08:00:00' },
      { price: 265000, originalPrice: 280000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-15T18:00:00' },
      { price: 259000, originalPrice: 278000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-15T08:00:00' },
      { price: 252000, originalPrice: 270000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-14T18:00:00' },
      { price: 248000, originalPrice: 265000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-14T08:00:00' },
      { price: 243000, originalPrice: 260000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-13T18:00:00' },
      { price: 239000, originalPrice: 239000, currency: 'KRW', isLowestPrice: true, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-13T08:00:00' },
      { price: 241000, originalPrice: 255000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-12T18:00:00' },
      { price: 245000, originalPrice: 258000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-12T08:00:00' },
      { price: 256000, originalPrice: 272000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-11T18:00:00' },
      { price: 268000, originalPrice: 289000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-11T08:00:00' },
      { price: 278000, originalPrice: 295000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-10T18:00:00' },
      { price: 289000, originalPrice: 298000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://flight.naver.com/...', collectedAt: '2026-04-10T08:00:00' },
    ],
  },
  // ── conditionId 2: AirPods Pro (목표가 도달, 안정 추세) ──
  {
    conditionId: 2, keyword: 'Apple AirPods Pro 2세대', platform: 'coupang',
    maxPrice: 300000, currentPrice: 289000, lowestPrice: 285000, highestPrice: 335000, averagePrice: 310000,
    totalElements: 36, totalPages: 1, currentPage: 0,
    priceHistory: [
      { price: 289000, originalPrice: 289000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-16T09:00:00' },
      { price: 290000, originalPrice: 310000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-15T09:00:00' },
      { price: 292000, originalPrice: 315000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-14T09:00:00' },
      { price: 295000, originalPrice: 320000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-13T09:00:00' },
      { price: 298000, originalPrice: 325000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-12T09:00:00' },
      { price: 285000, originalPrice: 285000, currency: 'KRW', isLowestPrice: true, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-11T09:00:00' },
      { price: 302000, originalPrice: 330000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-10T09:00:00' },
      { price: 315000, originalPrice: 335000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-09T09:00:00' },
      { price: 325000, originalPrice: 335000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-08T09:00:00' },
      { price: 330000, originalPrice: 330000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-07T09:00:00' },
      { price: 332000, originalPrice: 335000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-06T09:00:00' },
      { price: 335000, originalPrice: 335000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://www.coupang.com/...', collectedAt: '2026-04-05T09:00:00' },
    ],
  },
  // ── conditionId 3: PS5 (상승 추세, 목표가와 격차 큼) ──
  {
    conditionId: 3, keyword: 'PS5 디지털 에디션', platform: 'naver',
    maxPrice: 590000, currentPrice: 635000, lowestPrice: 578000, highestPrice: 648000, averagePrice: 615000,
    totalElements: 52, totalPages: 1, currentPage: 0,
    priceHistory: [
      { price: 635000, originalPrice: 648000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-16T12:00:00' },
      { price: 628000, originalPrice: 645000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-15T12:00:00' },
      { price: 620000, originalPrice: 640000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-14T12:00:00' },
      { price: 612000, originalPrice: 635000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-13T12:00:00' },
      { price: 605000, originalPrice: 630000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-12T12:00:00' },
      { price: 598000, originalPrice: 625000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-11T12:00:00' },
      { price: 590000, originalPrice: 618000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-10T12:00:00' },
      { price: 585000, originalPrice: 610000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-09T12:00:00' },
      { price: 578000, originalPrice: 578000, currency: 'KRW', isLowestPrice: true, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-08T12:00:00' },
      { price: 580000, originalPrice: 585000, currency: 'KRW', isLowestPrice: false, source: 'API', productUrl: '', collectedAt: '2026-04-07T12:00:00' },
      { price: 582000, originalPrice: 590000, currency: 'KRW', isLowestPrice: false, source: 'MANUAL', productUrl: '', collectedAt: '2026-04-06T12:00:00' },
      { price: 588000, originalPrice: 595000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-05T12:00:00' },
      { price: 592000, originalPrice: 600000, currency: 'KRW', isLowestPrice: false, source: 'EXTENSION', productUrl: 'https://shopping.naver.com/...', collectedAt: '2026-04-04T12:00:00' },
    ],
  },
];

// ── 유틸 ────────────────────────────────────────────────────────

const getPlatformName = (platform: string): string => {
  const map: Record<string, string> = {
    naver: '네이버 쇼핑',
    coupang: '쿠팡',
    '11st': '11번가',
    gmarket: 'G마켓',
    auction: '옥션',
    'naver-flights': '네이버 항공',
    naver_flight: '네이버 항공',
  };
  return map[platform] || platform;
};

const getPlatformColor = (platform: string): string => {
  const map: Record<string, string> = {
    naver: '#03c75a',
    coupang: '#ff6b6b',
    'naver-flights': '#03c75a',
    naver_flight: '#03c75a',
  };
  return map[platform] || '#1E4D8C';
};

const formatPrice = (price: number, currency = 'KRW'): string => {
  if (currency === 'KRW') return `₩${Math.round(price).toLocaleString()}`;
  return `${currency} ${price.toFixed(2)}`;
};

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

const calcDiscountRate = (price: number, original: number): number | null => {
  if (!original || original <= 0 || price >= original) return null;
  return Math.round((1 - price / original) * 100);
};

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function PriceHistory() {
  const [conditions, setConditions] = useState<ConditionListItem[]>(MOCK_CONDITIONS);
  const [selectedConditionId, setSelectedConditionId] = useState<number | null>(MOCK_CONDITIONS[0].conditionId);
  const [priceData, setPriceData] = useState<PriceHistoryData | null>(
    MOCK_PRICE_HISTORY.find((h) => h.conditionId === MOCK_CONDITIONS[0].conditionId) ?? null,
  );
  // 초기 mock으로 채워뒀으므로 로딩 없이 바로 렌더링
  const [conditionsLoading] = useState(false);
  const [historyLoading] = useState(false);
  const [error] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const periodOptions = [
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
  ];

  // ── 조건 목록 로드 (백그라운드, 실패 시 mock 유지) ─────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchConditionList();
        setConditions(res.data.conditions);
        if (res.data.conditions.length > 0) {
          setSelectedConditionId(res.data.conditions[0].conditionId);
        }
      } catch {
        // mock 그대로 유지
      }
    };
    void load();
  }, []);

  // ── 선택한 조건의 가격 히스토리 로드 (백그라운드) ───────────
  useEffect(() => {
    if (selectedConditionId == null) return;
    // 서버 데이터로 갱신 시도 (mock은 이미 초기값에 있음)
    const load = async () => {
      try {
        const data = await fetchPriceHistory(selectedConditionId, selectedPeriod);
        // 서버가 200에 data:null을 내려도 기존 데이터(초기 mock)를 유지하기 위해 유효성 검사 후 업데이트
        if (data && Array.isArray(data.priceHistory)) {
          setPriceData(data);
        }
      } catch {
        // mock fallback
        const mock = MOCK_PRICE_HISTORY.find((h) => h.conditionId === selectedConditionId) ?? null;
        if (mock) setPriceData(mock);
      }
    };
    void load();
  }, [selectedConditionId, selectedPeriod]);

  const selectedCondition = conditions.find(
    (c) => c.conditionId === selectedConditionId,
  )!;

  const chartData = priceData?.priceHistory
    .slice()
    .reverse()
    .map((entry) => ({
      date: formatShortDate(entry.collectedAt),
      price: entry.price,
      originalPrice: entry.originalPrice,
      isLowest: entry.isLowestPrice,
    })) ?? [];

  const sortedHistory = priceData?.priceHistory
    ? [...priceData.priceHistory].sort((a, b) => {
        const diff = new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      })
    : [];

  // ── 렌더링 ──────────────────────────────────────────────────
  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden">
      <DecorativeBackground variant="minimal" />
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
              <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">가격 히스토리</h1>
              <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium">조건별 가격 변동 추이를 확인합니다</p>
            </div>
          </div>

          {/* ═══════════ Condition Selector ═══════════ */}
          <div className="mb-6">
            {conditionsLoading ? (
              <div className="h-12 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : conditions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F9F7F7] border border-[#1E4D8C]/10 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-[#1E4D8C]" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">등록된 조건이 없습니다</p>
                <p className="text-xs text-slate-500">대시보드에서 첫 조건을 등록해보세요.</p>
              </div>
            ) : (
              <div className="flex flex-row flex-wrap items-center gap-3">
                {/* Condition Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 transition-all min-w-0 sm:min-w-[260px] w-full sm:w-auto cursor-pointer"
                  >
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                          style={{
                            color: getPlatformColor(selectedCondition.platform),
                            borderColor: `${getPlatformColor(selectedCondition.platform)}33`,
                            backgroundColor: `${getPlatformColor(selectedCondition.platform)}12`,
                          }}
                        >
                          {getPlatformName(selectedCondition.platform)}
                        </Badge>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                          {selectedCondition.keyword}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[320px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto p-1.5">
                          {conditions.map((cond) => (
                            <button
                              key={cond.conditionId}
                              type="button"
                              onClick={() => {
                                setSelectedConditionId(cond.conditionId);
                                setDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                                selectedConditionId === cond.conditionId
                                  ? 'bg-[#F9F7F7] dark:bg-[#1E4D8C]/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                              }`}
                            >
                              <Badge
                                className="text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                                style={{
                                  color: getPlatformColor(cond.platform),
                                  borderColor: `${getPlatformColor(cond.platform)}33`,
                                  backgroundColor: `${getPlatformColor(cond.platform)}12`,
                                }}
                              >
                                {getPlatformName(cond.platform)}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{cond.keyword}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                                  목표가: {formatPrice(cond.maxPrice)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Period Selector */}
                <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedPeriod(opt.value)}
                      className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all duration-200 cursor-pointer ${
                        selectedPeriod === opt.value
                          ? 'bg-[#1E4D8C] dark:bg-[#7BAEDA] dark:text-[#112D4E] text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* ═══════════ Error Banner ═══════════ */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-6 py-4 text-sm text-red-800 dark:text-red-300 shadow-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ═══════════ Loading State ═══════════ */}
          {historyLoading && (
            <div className="space-y-6">
              {/* Skeleton: 4 stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] animate-pulse" />
                ))}
              </div>
              {/* Skeleton: chart */}
              <div className="h-[400px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] animate-pulse" />
            </div>
          )}

          {/* ═══════════ No Selection State ═══════════ */}
          {!selectedConditionId && !conditionsLoading && !error && (
            <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-16 text-center shadow-[0_2px_12px_rgb(15,23,42,0.04)]">
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                <Activity className="w-7 h-7 text-[#1E4D8C] dark:text-[#7BAEDA]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">가격 히스토리를 확인할 조건을 선택해주세요</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium max-w-md mx-auto">
                위 드롭다운에서 모니터링 중인 조건을 선택하면 상세 가격 변동 내역을 확인할 수 있습니다.
              </p>
            </div>
          )}

          {/* ═══════════ Main Data Section ═══════════ */}
          {priceData && !historyLoading && (
            <div className="space-y-6">
              {/* ── 4 Stat Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Current Price */}
                <StatCard
                  icon={DollarSign}
                  label="현재가"
                  value={formatPrice(priceData.currentPrice)}
                  sub={
                    priceData.currentPrice > priceData.maxPrice
                      ? `목표가보다 ${formatPrice(priceData.currentPrice - priceData.maxPrice)} 높음`
                      : priceData.currentPrice <= priceData.maxPrice
                        ? '🎯 목표가 도달!'
                        : undefined
                  }
                  subColor={priceData.currentPrice <= priceData.maxPrice ? 'text-[#059669]' : 'text-[#DC2626]'}
                  iconBg="bg-[#F9F7F7] dark:bg-[#1E4D8C]/10"
                  iconColor="text-[#1E4D8C] dark:text-[#7BAEDA]"
                />
                {/* Lowest Price */}
                <StatCard
                  icon={TrendingDown}
                  label="최저가"
                  value={formatPrice(priceData.lowestPrice)}
                  iconBg="bg-[#FEF2F2] dark:bg-red-950/30"
                  iconColor="text-[#DC2626]"
                />
                {/* Highest Price */}
                <StatCard
                  icon={TrendingUp}
                  label="최고가"
                  value={formatPrice(priceData.highestPrice)}
                  iconBg="bg-[#FFF7ED] dark:bg-orange-950/30"
                  iconColor="text-[#EA580C]"
                />
                {/* Average Price */}
                <StatCard
                  icon={BarChart3}
                  label="평균가"
                  value={formatPrice(priceData.averagePrice)}
                  sub={
                    priceData.averagePrice > 0
                      ? `현재가 ${((priceData.currentPrice - priceData.averagePrice) / priceData.averagePrice * 100).toFixed(1)}%`
                      : undefined
                  }
                  subColor={
                    priceData.currentPrice <= priceData.averagePrice
                      ? 'text-[#059669]'
                      : 'text-[#DC2626]'
                  }
                  iconBg="bg-[#F0FDF4] dark:bg-green-950/30"
                  iconColor="text-[#059669]"
                />
              </div>

              {/* ── Price Chart ── */}
              <Card className="rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 px-5 py-4 bg-white dark:bg-slate-900">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50 font-bold">가격 추이</CardTitle>
                    <CardDescription className="text-slate-700 dark:text-slate-300 mt-1">
                      시간에 따른 가격 변동을 확인하세요
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="bg-slate-50 dark:bg-slate-900 p-4 sm:p-5">
                  {chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-sm font-bold text-slate-500 mb-1">아직 수집된 가격 데이터가 없습니다</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" strokeOpacity={0.4} vertical={false} />
                          <XAxis
                            dataKey="date"
                            stroke="#71717A"
                            style={{ fontSize: '12px' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis
                            stroke="#71717A"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181B',
                              border: '1px solid #27272A',
                              borderRadius: '0.75rem',
                              color: '#FAFAFA',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                            }}
                            formatter={(value: any) => [`₩${Number(value).toLocaleString()}`, '가격']}
                          />

                          {/* Target Price Line */}
                          <ReferenceLine
                            y={priceData.maxPrice}
                            stroke="#f0a040"
                            strokeDasharray="5 5"
                            label={{
                              value: `목표가 ${formatPrice(priceData.maxPrice)}`,
                              fill: '#f0a040',
                              fontSize: 12,
                              position: 'insideTopRight',
                              dy: -10,
                            }}
                          />

                          {/* Average Price Line */}
                          <ReferenceLine
                            y={priceData.averagePrice}
                            stroke="#9b59b6"
                            strokeDasharray="5 5"
                            label={{
                              value: `평균가 ${formatPrice(priceData.averagePrice)}`,
                              fill: '#9b59b6',
                              fontSize: 12,
                              position: 'insideTopRight',
                              dy: 10,
                            }}
                          />

                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#1E4D8C"
                            strokeWidth={3}
                            dot={(props: any) => {
                              const { cx, cy, payload } = props;
                              if (payload?.isLowest) {
                                return (
                                  <circle cx={cx} cy={cy} r={7} fill="#DC2626" stroke="#18181B" strokeWidth={3} />
                                );
                              }
                              return (
                                <circle cx={cx} cy={cy} r={4} fill="#1E4D8C" stroke="#18181B" strokeWidth={2} />
                              );
                            }}
                            activeDot={{ r: 7, stroke: '#18181B', strokeWidth: 2 }}
                            animationDuration={1200}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 text-xs gap-3 px-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#1E4D8C] shadow-sm" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">가격</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#DC2626] shadow-sm" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">최저가</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-[#f0a040]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">목표가</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-0.5 bg-[#9b59b6]" />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">평균가</span>
                          </div>
                        </div>
                        {priceData?.priceHistory.some((e) => e.productUrl) && (
                          <a
                            href={priceData.priceHistory.find((e) => e.productUrl)?.productUrl ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#1E4D8C] dark:text-[#7BAEDA] hover:bg-[#F9F7F7] dark:hover:bg-[#1E4D8C]/10 transition-colors self-start sm:self-auto"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            상품 보기
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Price History Table ── */}
              <Card className="rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 px-5 py-4 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900 dark:text-slate-50 font-bold">수집 히스토리</CardTitle>
                      <CardDescription className="text-slate-700 dark:text-slate-300 mt-1">
                        기간별 가격 수집 내역입니다
                      </CardDescription>
                    </div>
                    <Badge className="hidden sm:inline-flex bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-900 border-none font-semibold rounded-md px-2 py-0.5 text-xs">
                      총 {priceData.totalElements}건
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="bg-slate-50 dark:bg-slate-900 p-0">
                  {sortedHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-700 dark:text-slate-300 font-medium">
                      수집된 가격 이력이 없습니다.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left px-5 py-3.5 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                              <button
                                type="button"
                                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                날짜
                                {sortOrder === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </th>
                            <th className="text-right px-5 py-3.5 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">가격</th>
                            <th className="text-right px-5 py-3.5 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">원가</th>
                            <th className="text-right px-5 py-3.5 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">할인율</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                          {sortedHistory.map((entry, idx) => {
                            const discountRate = calcDiscountRate(entry.price, entry.originalPrice);
                            return (
                              <tr
                                key={`${entry.collectedAt}-${idx}`}
                                className={`group transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 ${
                                  entry.isLowestPrice ? 'bg-[#FEF2F2]/50 dark:bg-red-950/10' : ''
                                }`}
                              >
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="text-slate-900 dark:text-slate-50 font-medium text-xs sm:text-sm">
                                      {formatDateTime(entry.collectedAt)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  <span className={`font-extrabold text-sm sm:text-base ${
                                    entry.isLowestPrice
                                      ? 'text-[#DC2626] dark:text-red-400'
                                      : 'text-slate-900 dark:text-slate-50'
                                  }`}>
                                    {formatPrice(entry.price, entry.currency)}
                                  </span>
                                  {entry.isLowestPrice && (
                                    <span className="ml-1.5 text-[10px] font-bold text-[#DC2626] dark:text-red-400">🏆</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  {entry.originalPrice !== entry.price ? (
                                    <span className="text-slate-500 dark:text-slate-300 text-xs sm:text-sm font-medium line-through">
                                      {formatPrice(entry.originalPrice, entry.currency)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  {discountRate != null ? (
                                    <span className="inline-flex items-center gap-0.5 text-[#059669] font-bold text-xs sm:text-sm">
                                      <TrendingDown className="w-3 h-3" />
                                      {discountRate}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── StatCard Sub-component ────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
  badge,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  badge?: { text: string; color: string };
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 flex flex-col justify-center shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-lg hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <div className="flex flex-col items-center gap-1 self-center">
        <div className="flex items-center gap-2">
          <span className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50 text-center">
            {value}
          </span>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        {sub && (
          <p className={`text-xs font-medium ${subColor ?? 'text-slate-500 dark:text-slate-300'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
