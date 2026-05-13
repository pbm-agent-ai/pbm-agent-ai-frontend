import { useState } from 'react';
import { ChevronDown, CreditCard, ExternalLink, Search } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

// ── 타입 ────────────────────────────────────────────────────────

type OrderItem = {
  id: number;
  emoji: string;
  product: string;
  platform: string;
  option: string;
  amount: number;
  savings: number;
  txHash: string;
};

type OrderGroup = {
  date: string;
  orderNumber: string;
  status: '결제완료' | '절약완료';
  items: OrderItem[];
};

// ── 데이터 ──────────────────────────────────────────────────────

const orderGroups: OrderGroup[] = [
  {
    date: '2026.03.28',
    orderNumber: 'ORD-20260328-001',
    status: '절약완료',
    items: [
      {
        id: 1,
        emoji: '✈️',
        product: '인천-도쿄 왕복 항공권',
        platform: 'naver-flights',
        option: '직항 · 왕복 · 일반석',
        amount: 248000,
        savings: 52000,
        txHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
      },
    ],
  },
  {
    date: '2026.03.25',
    orderNumber: 'ORD-20260325-001',
    status: '결제완료',
    items: [
      {
        id: 2,
        emoji: '🎧',
        product: 'Sony WH-1000XM5 헤드폰',
        platform: 'coupang',
        option: '블랙 · 무선',
        amount: 329000,
        savings: 41000,
        txHash: '0x3c9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91386',
      },
    ],
  },
  {
    date: '2026.03.22',
    orderNumber: 'ORD-20260322-001',
    status: '결제완료',
    items: [
      {
        id: 3,
        emoji: '👟',
        product: '나이키 에어맥스 270',
        platform: 'gmarket',
        option: '270mm · 화이트',
        amount: 149000,
        savings: 31000,
        txHash: '0x8d9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91387',
      },
    ],
  },
  {
    date: '2026.03.18',
    orderNumber: 'ORD-20260318-001',
    status: '결제완료',
    items: [
      {
        id: 4,
        emoji: '💻',
        product: 'Apple Magic Keyboard',
        platform: '11st',
        option: '한국어 · 화이트',
        amount: 168000,
        savings: 22000,
        txHash: '0x2a9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91388',
      },
    ],
  },
  {
    date: '2026.03.15',
    orderNumber: 'ORD-20260315-001',
    status: '결제완료',
    items: [
      {
        id: 5,
        emoji: '📱',
        product: 'Samsung Galaxy Buds2 Pro',
        platform: 'coupang',
        option: '그라파이트 · 무선이어폰',
        amount: 189000,
        savings: 41000,
        txHash: '0x5e9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91389',
      },
      {
        id: 6,
        emoji: '🎮',
        product: 'Nintendo Switch OLED',
        platform: 'gmarket',
        option: '화이트 · 본체+조이콘',
        amount: 398000,
        savings: 52000,
        txHash: '0x1b9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91390',
      },
    ],
  },
  {
    date: '2026.03.08',
    orderNumber: 'ORD-20260308-001',
    status: '절약완료',
    items: [
      {
        id: 7,
        emoji: '⌚',
        product: 'Apple Watch Series 9',
        platform: 'coupang',
        option: '미드나이트 · 45mm GPS',
        amount: 489000,
        savings: 61000,
        txHash: '0x9c9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91391',
      },
    ],
  },
  {
    date: '2026.03.05',
    orderNumber: 'ORD-20260305-001',
    status: '절약완료',
    items: [
      {
        id: 8,
        emoji: '📷',
        product: 'Sony Alpha 7C II',
        platform: '11st',
        option: '실버 · 바디+28-60mm 렌즈킷',
        amount: 2190000,
        savings: 310000,
        txHash: '0x4f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91392',
      },
    ],
  },
];

const totalPayment = orderGroups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.amount, 0), 0);
const totalSavings = orderGroups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.savings, 0), 0);

// ── 유틸 ────────────────────────────────────────────────────────

const formatPrice = (price: number) => `₩${price.toLocaleString()}`;

const getPlatformName = (platform: string): string => {
  const map: Record<string, string> = {
    naver: '네이버쇼핑',
    coupang: '쿠팡',
    'naver-flights': '네이버항공',
    naver_flight: '네이버항공',
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
  return map[platform] || '#6366F1';
};

const statusStyleMap: Record<OrderGroup['status'], { label: string; dot: string; bg: string }> = {
  결제완료: { label: '결제완료', dot: 'bg-[#6366F1]', bg: 'bg-[#EEF2FF] dark:bg-indigo-500/10' },

  절약완료: { label: '절약완료', dot: 'bg-[#D97706]', bg: 'bg-[#FEF3C7] dark:bg-amber-500/10' },
};

const dateOptions = ['전체 기간', '7일', '30일', '90일'];
const platformOptions = ['전체 플랫폼', '네이버항공', '쿠팡', 'G마켓', '11번가'];
const amountOptions = ['전체 금액', '~5만원', '5만~10만원', '10만~30만원', '30만원~'];

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function Payments() {
  const [selectedDate, setSelectedDate] = useState('전체 기간');
  const [selectedPlatform, setSelectedPlatform] = useState('전체 플랫폼');
  const [selectedAmount, setSelectedAmount] = useState('전체 금액');

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-screen font-sans text-[#0F172A] dark:text-slate-50">
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[820px] mx-auto">
          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] text-white shrink-0">
              <CreditCard className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] dark:text-slate-50">결제 내역</h1>
              <p className="text-[#475569] dark:text-slate-400 mt-1 font-medium">자동 결제 및 조건 매칭 완료 내역</p>
            </div>
          </div>

          {/* ═══════════ My Page Summary Stats (Musinsa-style) ═══════════ */}
          <div className="mb-5 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] dark:divide-slate-700">
              <div className="py-5 text-center">
                <p className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-500 tracking-wide">결제 건수</p>
                <p className="text-xl font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5">{orderGroups.length}건</p>
              </div>
              <div className="py-5 text-center">
                <p className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-500 tracking-wide">결제 금액</p>
                <p className="text-xl font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5">{formatPrice(totalPayment)}</p>
              </div>
              <div className="py-5 text-center">
                <p className="text-[11px] font-medium text-[#D97706] dark:text-amber-400 tracking-wide">절약 금액</p>
                <p className="text-xl font-extrabold text-[#D97706] dark:text-amber-400 mt-1.5">{formatPrice(totalSavings)}</p>
              </div>
            </div>
          </div>

          {/* ═══════════ Search Bar ═══════════ */}
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="상품명 검색"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 dark:text-slate-300 rounded-xl outline-none focus:border-[#6366F1] dark:focus:border-indigo-400 transition-colors placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          {/* ═══════════ Filters ═══════════ */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[120px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3.5">
                <SelectValue placeholder="전체 기간" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[140px]">
                {dateOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[130px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3.5">
                <SelectValue placeholder="전체 플랫폼" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[150px]">
                {platformOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAmount} onValueChange={setSelectedAmount}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3.5">
                <SelectValue placeholder="전체 금액" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[160px]">
                {amountOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ═══════════ Order Cards ═══════════ */}
          <div className="space-y-4">
            {orderGroups.map((group) => {
              const statusStyle = statusStyleMap[group.status];
              const groupTotal = group.items.reduce((s, i) => s + i.amount, 0);
              const groupSavings = group.items.reduce((s, i) => s + i.savings, 0);

              return (
                <div
                  key={group.orderNumber}
                  className="rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden"
                >
                  {/* ── Order Header ── */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E2E8F0] dark:border-slate-700 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-sm font-bold text-[#0F172A] dark:text-slate-50 shrink-0">{group.date}</span>
                      <span className="text-[10px] sm:text-[11px] text-[#94A3B8] dark:text-slate-500 font-mono truncate">{group.orderNumber}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 ${statusStyle.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span className="text-[#0F172A] dark:text-slate-100">{statusStyle.label}</span>
                    </div>
                  </div>

                  {/* ── Order Items ── */}
                  <div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-b border-[#F1F5F9] dark:border-slate-700/50 last:border-b-0 hover:bg-[#F8FAFC] dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Thumbnail */}
                          <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                            {item.emoji}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md border mb-1"
                              style={{
                                color: getPlatformColor(item.platform),
                                borderColor: `${getPlatformColor(item.platform)}33`,
                                backgroundColor: `${getPlatformColor(item.platform)}12`,
                              }}
                            >
                              {getPlatformName(item.platform)}
                            </Badge>
                            <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50 truncate leading-snug">
                              {item.product}
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-slate-500 mt-0.5 truncate">
                              {item.option}
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-left sm:text-right shrink-0 pl-[72px] sm:pl-0">
                          <p className="text-sm font-extrabold text-[#0F172A] dark:text-slate-50">
                            {formatPrice(item.amount)}
                          </p>
                          <p className="text-[11px] font-semibold text-[#D97706] dark:text-amber-400">
                            -{formatPrice(item.savings)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Order Footer ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-[#F8FAFC] dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-700">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-xs text-[#64748B] dark:text-slate-500 whitespace-nowrap">
                        총 결제금액
                      </span>
                      <span className="text-sm font-extrabold text-[#0F172A] dark:text-slate-50 whitespace-nowrap">
                        {formatPrice(groupTotal)}
                      </span>
                      {groupSavings > 0 && (
                        <>
                          <span className="text-[#CBD5E1] dark:text-slate-700 text-xs shrink-0">|</span>
                          <span className="text-xs font-semibold text-[#D97706] dark:text-amber-400 whitespace-nowrap">
                            -{formatPrice(groupSavings)} 절약
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {group.items[0] && (
                        <a
                          href={`https://etherscan.io/tx/${group.items[0].txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#6366F1] dark:text-indigo-400 border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-indigo-500/10 hover:border-[#6366F1]/30 dark:hover:border-indigo-400/30 transition-all"
                        >
                          TX 상세
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-600 transition-all"
                      >
                        상세보기
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Empty State ── */}
          {orderGroups.length === 0 && (
            <div className="rounded-[1.5rem] border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-16 text-center shadow-[0_2px_12px_rgb(15,23,42,0.04)]">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#EEF2FF] dark:bg-indigo-500/10 flex items-center justify-center border border-[#6366F1]/10">
                <CreditCard className="w-7 h-7 text-[#6366F1] dark:text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-1">결제 내역이 없습니다</p>
              <p className="text-xs text-[#475569] dark:text-slate-400">조건 매칭이 완료되면 내역이 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
