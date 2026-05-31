import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Search, ListChecks, ExternalLink } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import type { SubscriptionItem, SubscriptionUpdateRequest } from '../types/condition';
import { deleteSubscription, fetchSubscriptions, updateSubscription } from '../api/condition';

type EditConditionForm = {
  id: number;
  platform: string;
  snapshotTitle: string;
  searchKeyword: string;
  productUrl: string;
  currency: string;
  intent: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  snapshotPrice?: number;
  targetPrice: string;
  lastCheckedAt?: string;
  scheduledEndAt?: string;
  editExpiryYearText?: string;
  editExpiryMonthText?: string;
  editExpiryDayText?: string;
  createdAt?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
};

// 서버 미연결 시 UI 미리보기용 Mock 데이터
const mockSubscription: SubscriptionItem = {
  id: 999,
  commandId: 'mock-cmd-001',
  platform: 'naver',
  productId: 'mock-prod-001',
  productUrl: 'https://search.shopping.naver.com/catalog/123456',
  snapshotTitle: 'Apple AirPods Pro 2세대 (USB-C)',
  snapshotPrice: 289000,
  searchKeyword: '에어팟 프로2',
  targetPrice: 250000,
  currency: 'KRW',
  intent: 'AUTO_PAYMENT',
  status: 'ACTIVE',
  checkIntervalMinutes: 30,
  lastCheckedAt: '2026-05-31T14:30:00.000Z',
  nextCheckAt: '2026-05-31T15:00:00.000Z',
  scheduledEndAt: '2026-07-31T23:59:59.000Z',
  createdAt: '2026-05-01T09:00:00.000Z',
};

export default function Conditions() {
  const [conditions, setConditions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [editingCondition, setEditingCondition] = useState<EditConditionForm | null>(null);
  const [editingConditionSnapshot, setEditingConditionSnapshot] = useState<EditConditionForm | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchSubscriptions();
        if (res.success && res.data.length > 0) {
          setConditions(res.data);
          setIsLoading(false);
          return;
        }
      } catch {
        // API 오류 → fall through
      }
      setConditions([mockSubscription]);
      setIsLoading(false);
    };
    void load();
  }, []);

  const formatPrice = (price: number, currency?: string) => {
    const symbol = currency === 'USD' ? '$' : currency === 'JPY' ? '¥' : '₩';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getPlatformName = (platform: string): string => {
    const map: Record<string, string> = {
      naver: '네이버쇼핑',
      naver_flight: '네이버항공권',
      aliexpress: '알리익스프레스',
    };
    return map[platform] || platform;
  };

  const getPlatformColor = (platform: string): string => {
    const map: Record<string, string> = {
      naver: '#03c75a',
      naver_flight: '#03c75a',
      aliexpress: '#ff6b6b',
    };
    return map[platform] || '#1E4D8C';
  };

  const handleDeleteItem = (id: number) => {
    const target = conditions.find((item) => item.id === id);
    if (!target) return;
    setDeleteTarget({ id, title: target.snapshotTitle });
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      const res = await deleteSubscription(id);
      if (res.success) {
        setConditions((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      alert('구독 삭제에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setDeleteTarget(null);
    if (editingCondition?.id === id) {
      closeEditModal();
    }
  };

  const calculatePriceDiff = (currentPrice?: number, targetPrice?: number) => {
    if (currentPrice == null || targetPrice == null) return undefined;
    return currentPrice - targetPrice;
  };

  const isConditionSatisfied = (priceDiff?: number) => {
    return priceDiff != null && priceDiff < 0;
  };

  const getConditionStatusLabel = (priceDiff?: number) => {
    if (priceDiff == null) return '상태 미확인';
    return isConditionSatisfied(priceDiff) ? '조건 충족' : '조건 미충족';
  };

  const getPriceDiffSummaryText = (priceDiff: number, currency?: string) => {
    const priceGapText = formatPrice(Math.abs(priceDiff), currency);
    return priceDiff < 0 ? `${priceGapText} 낮음` : `${priceGapText} 높음`;
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 2100 - currentYear + 1 }, (_, index) => String(currentYear + index));
  };
  const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => String(index + 1));

  const getDayOptions = (yearText: string, monthText: string) => {
    if (!yearText || !monthText) return [];
    const year = Number(yearText);
    const month = Number(monthText);
    const maxDay = getDaysInMonth(year, month);
    return Array.from({ length: maxDay }, (_, index) => String(index + 1));
  };

  const getEditExpiryDateText = (yearText?: string, monthText?: string, dayText?: string) =>
    `${yearText ?? ''}-${(monthText ?? '').padStart(2, '0')}-${(dayText ?? '').padStart(2, '0')}T23:59:59`;

  const openEditModal = (item: SubscriptionItem) => {
    const editForm: EditConditionForm = {
      id: item.id,
      platform: item.platform,
      snapshotTitle: item.snapshotTitle,
      searchKeyword: item.searchKeyword,
      productUrl: item.productUrl,
      currency: item.currency,
      intent: item.intent,
      snapshotPrice: item.snapshotPrice,
      targetPrice: String(item.targetPrice),
      lastCheckedAt: item.lastCheckedAt,
      scheduledEndAt: item.scheduledEndAt,
      editExpiryYearText: '',
      editExpiryMonthText: '',
      editExpiryDayText: '',
      createdAt: item.createdAt,
    };

    setEditingCondition(editForm);
    setEditingConditionSnapshot(editForm);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingCondition(null);
    setEditingConditionSnapshot(null);
    setIsEditModalOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingCondition(editingConditionSnapshot);
    setIsEditModalOpen(false);
  };

  const handleSaveEditCondition = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCondition || !editingConditionSnapshot) return;

    if (!editingCondition.targetPrice.trim()) {
      alert('목표 최대가를 입력하세요.');
      return;
    }

    if (
      Boolean(editingCondition.editExpiryYearText || editingCondition.editExpiryMonthText || editingCondition.editExpiryDayText) &&
      !(editingCondition.editExpiryYearText && editingCondition.editExpiryMonthText && editingCondition.editExpiryDayText)
    ) {
      alert('만료일은 연/월/일을 모두 선택하세요.');
      return;
    }

    // 변경된 필드만 PATCH payload 구성
    const payload: SubscriptionUpdateRequest = {};

    if (editingCondition.intent !== editingConditionSnapshot.intent) {
      payload.intent = editingCondition.intent;
    }

    if (Number(editingCondition.targetPrice) !== editingConditionSnapshot.targetPrice) {
      payload.targetPrice = Number(editingCondition.targetPrice);
    }

    if (editingCondition.editExpiryYearText) {
      payload.scheduledEndAt = getEditExpiryDateText(
        editingCondition.editExpiryYearText,
        editingCondition.editExpiryMonthText,
        editingCondition.editExpiryDayText,
      );
    }

    if (Object.keys(payload).length === 0) {
      setIsEditModalOpen(false);
      return;
    }

    try {
      const res = await updateSubscription(editingCondition.id, payload);
      if (res.success) {
        setConditions((prev) =>
          prev.map((item) => (item.id === editingCondition.id ? res.data : item)),
        );
      }
      setIsEditModalOpen(false);
    } catch {
      alert('구독 수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen font-sans">
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto flex flex-col h-full">

        {/* 헤더 */}
        <div className="mb-6 flex items-start gap-4 md:gap-5 px-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
            <ListChecks className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">모니터링 구독</h1>
            <p className="text-zinc-500 dark:text-zinc-300 mt-1 font-medium">구독 중인 상품의 가격을 모니터링합니다.</p>
          </div>
        </div>

        {/* 메인 리스트 */}
        <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && (
            <div className="col-span-full flex justify-center py-20">
              <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1E4D8C]" />
                <span className="text-sm font-medium">구독 목록을 불러오는 중...</span>
              </div>
            </div>
          )}

          {!isLoading && conditions.length === 0 && (
            <div className="col-span-full">
              <div className="py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-800 rounded-[1.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)]">
                <div className="w-16 h-16 rounded-full bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 border border-[#1E4D8C]/10 flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-400">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">구독 중인 상품이 없습니다</h4>
                <p className="text-zinc-500 dark:text-zinc-300">새로운 모니터링 구독을 추가해보세요.</p>
              </div>
            </div>
          )}

          {conditions.map((item) => {
            const priceDiff = calculatePriceDiff(item.snapshotPrice, item.targetPrice);
            const isSatisfied = isConditionSatisfied(priceDiff);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[1.5rem] p-6 shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(15,23,42,0.08)] transition-all duration-200 flex h-full flex-col group relative"
              >
                {/* 상단: 플랫폼 배지 + 모드 */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${getPlatformColor(item.platform)}15`,
                        color: getPlatformColor(item.platform),
                      }}
                    >
                      {getPlatformName(item.platform)}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 border-transparent px-2 py-0.5 rounded-md text-[10px] font-bold ${item.intent === 'AUTO_PAYMENT' ? 'bg-[#F9F7F7] text-[#1E4D8C] dark:bg-[#1E4D8C]/10 dark:text-[#7BAEDA]' : 'bg-[#fef3c7] text-[#b45309] dark:bg-[#b45309]/10 dark:text-[#fef3c7]'}`}
                  >
                    {item.intent === 'AUTO_PAYMENT' ? '자동 결제' : '알람'}
                  </Badge>
                </div>

                {/* 상품명 */}
                <div className="mb-1 flex items-start gap-1.5">
                  <p className="flex-1 min-w-0 line-clamp-2 text-lg font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#1E4D8C] dark:text-zinc-50">
                    {item.snapshotTitle}
                  </p>
                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 mt-0.5 flex items-center gap-1 rounded-lg bg-[#1E4D8C]/10 px-2 py-1 text-[11px] font-semibold text-[#1E4D8C] hover:bg-[#1E4D8C]/20 hover:scale-105 active:scale-95 transition-all dark:bg-[#7BAEDA]/10 dark:text-[#7BAEDA] dark:hover:bg-[#7BAEDA]/20"
                      aria-label="상품 페이지 열기"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      보기
                    </a>
                  )}
                </div>

                {/* 검색어 서브 */}
                <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500 truncate">
                  {item.searchKeyword}
                </p>

                {/* 가격 박스 */}
                <div className="mt-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[#1E4D8C] dark:text-[#7BAEDA] text-[10px] uppercase font-bold tracking-wider mb-1">현재가</p>
                      <p className="text-zinc-900 dark:text-zinc-50 font-black text-2xl">
                        {formatPrice(item.snapshotPrice, item.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1">목표가</p>
                      <p className="text-zinc-700 dark:text-zinc-300 font-semibold text-base">
                        {formatPrice(item.targetPrice, item.currency)}
                      </p>
                      {priceDiff != null && (
                        <p className={`mt-2 text-xs font-bold ${isSatisfied ? 'text-[#059669] dark:text-emerald-500' : 'text-[#D97706] dark:text-amber-400'}`}>
                          {getPriceDiffSummaryText(priceDiff, item.currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  {priceDiff != null && (
                    <div className="mt-4 flex justify-start">
                      <Badge
                        variant="outline"
                        className={`border-none px-3 py-1 rounded-lg text-xs font-bold ${
                          isSatisfied
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-600/10 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-600/10 dark:text-amber-400'
                        }`}
                      >
                        {getConditionStatusLabel(priceDiff)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* 만료일 */}
                <div className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {item.scheduledEndAt ? (
                    <span>만료일: <span className="font-semibold text-zinc-500 dark:text-zinc-400">{formatDateTime(item.scheduledEndAt)}</span></span>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-600">만료일 없음</span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="group/btn -ml-2 flex items-center gap-1 rounded-lg bg-transparent px-2 py-1.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-[#F9F7F7] hover:text-[#1E4D8C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D8C]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-zinc-300 dark:hover:bg-[#1E4D8C]/10 dark:hover:text-[#7BAEDA] dark:focus-visible:ring-offset-zinc-800"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    aria-label="구독 삭제"
                    onClick={() => handleDeleteItem(item.id)}
                    className="-mr-2 inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 삭제 확인 Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-800 rounded-3xl p-0 overflow-hidden border-zinc-200 dark:border-zinc-700">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-zinc-900 dark:text-zinc-50 text-xl font-bold">구독 삭제</DialogTitle>
            <DialogDescription className="text-zinc-700 dark:text-zinc-300">
              {deleteTarget ? `'${deleteTarget.title}' 구독을 삭제할까요?` : '선택한 구독을 삭제할까요?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-zinc-100 dark:bg-zinc-900 px-6 py-4 mt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl px-6 py-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => confirmDeleteItem()}
              className="rounded-xl px-6 py-2 bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.2)] border-none font-bold"
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 조건 수정 모달 */}
      <Dialog open={!!editingCondition && isEditModalOpen} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
        <DialogContent className="max-w-lg bg-white dark:bg-zinc-800 rounded-3xl p-0 overflow-hidden border-zinc-200 dark:border-zinc-700">
          {editingCondition && (
            <form onSubmit={handleSaveEditCondition}>
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-zinc-900 dark:text-zinc-50 text-xl font-bold">구독 수정</DialogTitle>
                <DialogDescription className="text-zinc-700 dark:text-zinc-300">
                  모니터링 구독 조건을 수정합니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 px-6 pb-2 mt-2 max-h-[60vh] overflow-y-auto">
                {/* 상품 정보 (읽기 전용) */}
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 space-y-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{editingCondition.snapshotTitle}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    플랫폼: {getPlatformName(editingCondition.platform)}
                    {editingCondition.searchKeyword && ` · 검색어: ${editingCondition.searchKeyword}`}
                  </p>
                  {editingCondition.productUrl && (
                    <a href={editingCondition.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#1E4D8C] dark:text-[#7BAEDA] hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      상품 페이지
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${getPlatformColor(editingCondition.platform)}15`,
                      color: getPlatformColor(editingCondition.platform),
                    }}
                  >
                    {getPlatformName(editingCondition.platform)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold">알람 모드</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCondition((prev) => (prev ? { ...prev, intent: 'ALERT_ONLY' } : prev))}
                      className={editingCondition.intent === 'ALERT_ONLY' ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20 rounded-xl h-11' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl h-11'}
                    >
                      알람 전용
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCondition((prev) => (prev ? { ...prev, intent: 'AUTO_PAYMENT' } : prev))}
                      className={editingCondition.intent === 'AUTO_PAYMENT' ? 'border-[#1E4D8C] bg-[#F9F7F7] text-[#1E4D8C] dark:bg-[#1E4D8C]/10 hover:bg-[#F9F7F7]/80 dark:hover:bg-[#1E4D8C]/20 rounded-xl h-11' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-xl h-11'}
                    >
                      자동 결제
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold">목표 최대가</Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      value={editingCondition.targetPrice}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, targetPrice: e.target.value } : prev))}
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-[#1E4D8C]/40 rounded-xl px-4 py-3 pr-8 text-sm font-black text-[#0F3460] focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] focus:ring-1 focus:ring-[#1E4D8C]/30 dark:focus:ring-[#7BAEDA]/30 transition-all outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-400 font-semibold">
                      {editingCondition.currency === 'USD' ? '$' : editingCondition.currency === 'JPY' ? '¥' : '원'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">현재가: {editingCondition.snapshotPrice != null ? formatPrice(editingCondition.snapshotPrice, editingCondition.currency) : '수집 전'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-700 dark:text-zinc-300 text-sm font-semibold">만료일</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      value={editingCondition.editExpiryYearText ?? ''}
                      onValueChange={(value: string) =>
                        setEditingCondition((prev) => prev ? { ...prev, editExpiryYearText: value, editExpiryDayText: '' } : prev)
                      }
                    >
                      <SelectTrigger className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[#0f172a] dark:text-zinc-50 rounded-xl h-11">
                        <SelectValue placeholder="연도" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getYearOptions().map((year) => (
                          <SelectItem key={year} value={year}>{year}년</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={editingCondition.editExpiryMonthText ?? ''}
                      onValueChange={(value: string) =>
                        setEditingCondition((prev) => prev ? { ...prev, editExpiryMonthText: value, editExpiryDayText: '' } : prev)
                      }
                    >
                      <SelectTrigger className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[#0f172a] dark:text-zinc-50 rounded-xl h-11" disabled={!editingCondition.editExpiryYearText}>
                        <SelectValue placeholder="월" />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map((month) => (
                          <SelectItem key={month} value={month}>{month}월</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={editingCondition.editExpiryDayText ?? ''}
                      onValueChange={(value: string) =>
                        setEditingCondition((prev) => prev ? { ...prev, editExpiryDayText: value } : prev)
                      }
                    >
                      <SelectTrigger className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[#0f172a] dark:text-zinc-50 rounded-xl h-11" disabled={!editingCondition.editExpiryYearText || !editingCondition.editExpiryMonthText}>
                        <SelectValue placeholder="일" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDayOptions(editingCondition.editExpiryYearText ?? '', editingCondition.editExpiryMonthText ?? '').map((day) => (
                          <SelectItem key={day} value={day}>{day}일</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 메타 정보 (읽기 전용) */}
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wide">메타 정보</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>마지막 확인: {formatDateTime(editingCondition.lastCheckedAt)}</span>
                    <span>체크 주기: {conditions.find((c) => c.id === editingCondition.id)?.checkIntervalMinutes ?? '-'}분</span>
                    <span>등록일: {formatDateTime(editingCondition.createdAt)}</span>
                    <span>통화: {editingCondition.currency || 'KRW'}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-zinc-100 dark:bg-zinc-900 px-6 py-4 mt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-xl px-6 py-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                  취소
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] dark:hover:from-[#7BAEDA] hover:to-[#0F3460] dark:hover:to-[#1E4D8C] shadow-[0_4px_10px_rgba(30,77,140,0.25)] border-none font-bold"
                >
                  저장
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
