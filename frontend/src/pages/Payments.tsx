import { useState, useEffect, useCallback } from 'react';
import { CreditCard, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { fetchMyPayments, fetchPaymentDetail, type PaymentSummary, type PaymentDetail } from '../api/payments';
import { fetchAuthMe } from '../api/auth';
import { fetchMyWallet, fetchMyWalletBalance } from '../api/wallet';
import DecorativeBackground from '../components/ui/DecorativeBackground';

// ── 상태 표시 스타일 맵 ─────────────────────────────────────────
const statusStyleMap: Record<string, { label: string; dot: string; bg: string }> = {
  SUCCESS:  { label: '결제완료', dot: 'bg-[#1E4D8C]',  bg: 'bg-[#F9F7F7] dark:bg-[#1E4D8C]/10' },
  PENDING:  { label: '처리중',   dot: 'bg-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  FAILED:   { label: '결제실패', dot: 'bg-red-500',   bg: 'bg-red-50 dark:bg-red-500/10' },
};

// ── 유틸 ────────────────────────────────────────────────────────

const formatPrice = (price: number) => `₩${price.toLocaleString()}`;
const formatCurrencyAmount = (value?: number | null) => `₩${Math.floor(value ?? 0).toLocaleString()}`;

/** ISO 날짜 문자열 → "YYYY.MM.DD" */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/** paymentId → 짧은 주문번호 형태로 변환 */
const toOrderNumber = (paymentId: string): string =>
  paymentId.length > 20 ? `ORD-${paymentId.slice(0, 12).toUpperCase()}` : `ORD-${paymentId.toUpperCase()}`;

const getPlatformName = (platform: string): string => {
  const map: Record<string, string> = {
    NAVER: '네이버쇼핑',
    naver: '네이버쇼핑',
    COUPANG: '쿠팡',
    coupang: '쿠팡',
    'naver-flights': '네이버항공',
    naver_flight: '네이버항공',
    ALIEXPRESS: '알리익스프레스',
    aliexpress: '알리익스프레스',
  };
  return map[platform] || platform;
};

const getPlatformColor = (platform: string): string => {
  const key = platform.toLowerCase();
  if (key.includes('naver')) return '#03c75a';
  if (key.includes('coupang')) return '#ff6b6b';
  if (key.includes('ali')) return '#ff6a00';
  return '#1E4D8C';
};

/** 금액 필터 기준 */
const matchesAmount = (amount: number, filter: string): boolean => {
  switch (filter) {
    case '~5만원':        return amount <= 50_000;
    case '5만~10만원':   return amount > 50_000 && amount <= 100_000;
    case '10만~30만원':  return amount > 100_000 && amount <= 300_000;
    case '30만원~':       return amount > 300_000;
    default:              return true; // 전체 금액
  }
};

/** 기간 필터 기준 */
const matchesDate = (createdAt: string, filter: string): boolean => {
  if (filter === '전체 기간') return true;
  const days = filter === '7일' ? 7 : filter === '30일' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(createdAt) >= cutoff;
};

const dateOptions     = ['전체 기간', '7일', '30일', '90일'];
const amountOptions   = ['전체 금액', '~5만원', '5만~10만원', '10만~30만원', '30만원~'];

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function Payments() {
  // ── 데이터 상태 ──
  const [payments, setPayments]             = useState<PaymentSummary[]>([]);
  const [loading, setLoading]               = useState(true);
  const [walletBalance, setWalletBalance]   = useState<number | null>(null);
  const [walletLimit, setWalletLimit]       = useState<number | null>(null);
  // 클릭 시 상세(txHash) 캐시
  const [details, setDetails]               = useState<Record<string, PaymentDetail>>({});
  const [loadingTx, setLoadingTx]           = useState<Record<string, boolean>>({});

  // ── 필터 상태 ──
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedDate, setSelectedDate]     = useState('전체 기간');
  const [selectedAmount, setSelectedAmount] = useState('전체 금액');

  // ── 데이터 로드 ──
  useEffect(() => {
    const load = async () => {
      // fetchAuthMe를 호출해 userId를 store에 보장한다.
      await fetchAuthMe();
      let data: PaymentSummary[] = [];
      try {
        const [fetchedData, wallet, balance] = await Promise.all([
          fetchMyPayments(),
          fetchMyWallet(),
          fetchMyWalletBalance(),
        ]);
        data = fetchedData;
        setWalletLimit(wallet?.walletLimit ?? null);
        setWalletBalance(balance?.pbmBalance ?? null);
      } catch {
        // API 실패 시 아래 mock 데이터 사용
      }
      // 설명: API 미연결 시 mock 데이터로 UI 미리보기
      if (!data || data.length === 0) {
        data = [
          { paymentId: 'pay-001', userId: 1, productName: '쿠팡에서 갤럭시 버즈 FE', amount: 89000, currency: 'KRW', status: 'SUCCESS', createdAt: new Date(Date.now() - 86400000).toISOString() },
          { paymentId: 'pay-002', userId: 1, productName: '네이버쇼핑에서 에어팟 프로 2세대', amount: 289000, currency: 'KRW', status: 'SUCCESS', createdAt: new Date(Date.now() - 172800000).toISOString() },
          { paymentId: 'pay-003', userId: 1, productName: '알리에서 QCY T13 PRO', amount: 19800, currency: 'KRW', status: 'PENDING', createdAt: new Date(Date.now() - 259200000).toISOString() },
          { paymentId: 'pay-004', userId: 1, productName: '네이버항공 인천-오사카 왕복', amount: 248000, currency: 'KRW', status: 'SUCCESS', createdAt: new Date(Date.now() - 345600000).toISOString() },
          { paymentId: 'pay-005', userId: 1, productName: '쿠팡에서 다이슨 에어랩', amount: 599000, currency: 'KRW', status: 'FAILED', createdAt: new Date(Date.now() - 432000000).toISOString() },
          { paymentId: 'pay-006', userId: 1, productName: '네이버쇼핑에서 닌텐도 스위치 OLED', amount: 389000, currency: 'KRW', status: 'SUCCESS', createdAt: new Date(Date.now() - 518400000).toISOString() },
        ];
        setWalletLimit(5000000);
        setWalletBalance(1250000);
      }
      setPayments(data);
      setLoading(false);
    };
    void load();
  }, []);

  /** TX 상세 버튼 클릭 → 상세 조회 후 Sepolia Etherscan 새 탭 열기 */
  const handleTxDetail = useCallback(async (paymentId: string) => {
    // 캐시 히트
    if (details[paymentId]?.transactionHash) {
      window.open(`https://sepolia.etherscan.io/tx/${details[paymentId].transactionHash}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setLoadingTx((prev) => ({ ...prev, [paymentId]: true }));
    const detail = await fetchPaymentDetail(paymentId);
    setLoadingTx((prev) => ({ ...prev, [paymentId]: false }));
    if (detail) {
      setDetails((prev) => ({ ...prev, [paymentId]: detail }));
      if (detail.transactionHash) {
        window.open(`https://sepolia.etherscan.io/tx/${detail.transactionHash}`, '_blank', 'noopener,noreferrer');
      }
    }
  }, [details]);

  // ── 필터 적용 ──
  const filtered = payments.filter((p) => {
    if (searchQuery && !p.productName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (!matchesDate(p.createdAt, selectedDate)) return false;
    if (!matchesAmount(p.amount, selectedAmount)) return false;
    return true;
  });

  // ── 요약 통계 (SUCCESS 기준) ──
  const successPayments  = payments.filter((p) => p.status === 'SUCCESS');
  const totalPayment     = successPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden">
      <DecorativeBackground variant="minimal" />
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[820px] mx-auto">

          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
              <CreditCard className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">결제 내역</h1>
              <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium">자동 결제 및 조건 매칭 완료 내역</p>
            </div>
          </div>

          {/* ═══════════ Summary Stats ═══════════ */}
          <div className="mb-5 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460]"></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 dark:divide-slate-700">
                <div className="py-5 text-center">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">결제 건수</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                    {loading ? '—' : `${successPayments.length}건`}
                  </p>
                </div>
                <div className="py-5 text-center">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">결제 금액</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                    {loading ? '—' : formatPrice(totalPayment)}
                  </p>
                </div>
                <div className="py-5 text-center">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">전체 내역</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                    {loading ? '—' : `${payments.length}건`}
                  </p>
                </div>
                <div className="py-5 text-center">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">지갑</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                    {loading ? '—' : formatCurrencyAmount(walletBalance)}
                    <span className="block text-xs font-medium text-slate-400 dark:text-slate-400 mt-0.5">
                      한도 {loading ? '—' : formatCurrencyAmount(walletLimit)}
                    </span>
                  </p>
                </div>
              </div>
          </div>

          {/* ═══════════ Search Bar ═══════════ */}
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품명 검색"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-xl outline-none focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* ═══════════ Filters ═══════════ */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[120px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-xl h-9 px-3.5">
                <SelectValue placeholder="전체 기간" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[140px]">
                {dateOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAmount} onValueChange={setSelectedAmount}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-xl h-9 px-3.5">
                <SelectValue placeholder="전체 금액" />
              </SelectTrigger>
              <SelectContent className="rounded-xl min-w-[160px]">
                {amountOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ═══════════ Loading ═══════════ */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E4D8C] dark:text-[#7BAEDA]" />
            </div>
          )}

          {/* ═══════════ Payment Cards ═══════════ */}
          {!loading && (
            <div className="space-y-4">
              {filtered.map((payment) => {
                const statusStyle = statusStyleMap[payment.status] ?? statusStyleMap['PENDING'];
                const detail      = details[payment.paymentId];
                const isTxLoading = loadingTx[payment.paymentId];

                return (
                  <div
                    key={payment.paymentId}
                    className="relative rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-lg hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/40 transition-all duration-200 overflow-hidden"
                  >
                    {/* ── 상태별 악센트 컬러 바 (상단) ── */}
                    <div className={`absolute inset-x-0 top-0 h-1 rounded-t-[1.5rem] ${
                      payment.status === 'SUCCESS' ? 'bg-[#1E4D8C] dark:bg-[#7BAEDA]' :
                      payment.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-500'
                    }`} />
                    {/* ── Card Header ── */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50 shrink-0">
                          {formatDate(payment.createdAt)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-mono truncate">
                          {toOrderNumber(payment.paymentId)}
                        </span>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 ${statusStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        <span className={`${payment.status === 'PENDING' ? 'text-amber-800 dark:text-amber-200' : payment.status === 'FAILED' ? 'text-red-800 dark:text-red-200' : 'text-slate-900 dark:text-slate-100'}`}>{statusStyle.label}</span>
                      </div>
                    </div>

                    {/* ── Product Row ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                          🛒
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* 플랫폼 배지 (productUrl에서 플랫폼 추론, 없으면 PBM) */}
                          {detail?.productUrl && (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-bold px-2 py-0.5 rounded-md border mb-1"
                              style={{
                                color: getPlatformColor(detail.productUrl),
                                borderColor: `${getPlatformColor(detail.productUrl)}33`,
                                backgroundColor: `${getPlatformColor(detail.productUrl)}12`,
                              }}
                            >
                              {getPlatformName(
                                detail.productUrl.includes('naver') ? 'naver'
                                : detail.productUrl.includes('coupang') ? 'coupang'
                                : detail.productUrl.includes('aliexpress') ? 'aliexpress'
                                : 'PBM'
                              )}
                            </Badge>
                          )}
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate leading-snug">
                            {payment.productName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {payment.currency}
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-left sm:text-right shrink-0 pl-[72px] sm:pl-0">
                        <p className={`text-base font-extrabold ${
                          payment.status === 'SUCCESS' ? 'text-[#1E4D8C] dark:text-[#7BAEDA]' :
                          payment.status === 'PENDING' ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {formatPrice(payment.amount)}
                        </p>
                      </div>
                    </div>

                    {/* ── Card Footer ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">결제 금액</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                          {formatPrice(payment.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* TX 상세 — txHash가 없으면 클릭 시 조회 */}
                        {payment.status === 'SUCCESS' && (
                          <button
                            type="button"
                            onClick={() => void handleTxDetail(payment.paymentId)}
                            disabled={isTxLoading}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#1E4D8C] dark:text-[#7BAEDA] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-[#F9F7F7] dark:hover:bg-[#1E4D8C]/10 hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/30 transition-all disabled:opacity-60"
                          >
                            {isTxLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                TX 상세
                                <ExternalLink className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && filtered.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                <CreditCard className="w-7 h-7 text-[#1E4D8C] dark:text-[#7BAEDA]" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">결제 내역이 없습니다</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {payments.length > 0 ? '검색 조건과 일치하는 내역이 없습니다.' : '조건 매칭이 완료되면 내역이 여기에 표시됩니다.'}
              </p>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
