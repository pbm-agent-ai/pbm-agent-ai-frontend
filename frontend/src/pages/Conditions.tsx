import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { Search, ListChecks, ExternalLink, CalendarDays, ChevronDown } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import type { SubscriptionItem, SubscriptionUpdateRequest } from '../types/condition';
import { deleteSubscription, fetchSubscriptions, updateSubscription } from '../api/condition';
import DecorativeBackground from '../components/DecorativeBackground';
import Popover from '../components/ui/popover';

type EditConditionForm = {
  id: number;
  platform: string;
  snapshotTitle: string;
  snapshotImageUrl?: string;
  searchKeyword: string;
  productUrl: string;
  currency: string;
  intent: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  snapshotPrice?: number;
  targetPrice: string;
  lastCheckedAt?: string;
  scheduledEndAt?: string;
  editExpiryDate?: string;
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

export default function Conditions() {
  const [conditions, setConditions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [editingCondition, setEditingCondition] = useState<EditConditionForm | null>(null);
  const [editingConditionSnapshot, setEditingConditionSnapshot] = useState<EditConditionForm | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadErrorMessage('');
      try {
        const res = await fetchSubscriptions();
        setConditions(res.success ? res.data : []);
        if (!res.success) {
          setLoadErrorMessage(res.message || '구독 목록을 불러오지 못했습니다.');
        }
      } catch {
        // 설명: API 연결 실패 시 mock 데이터로 UI 미리보기
        setConditions([
          { id: 1, commandId: 'cmd-1', platform: 'coupang', productId: 'prod-1', productUrl: '#', snapshotTitle: '삼성 갤럭시 버즈 FE 블루투스 이어폰', snapshotPrice: 89000, snapshotImageUrl: 'https://via.placeholder.com/128/1E4D8C/FFFFFF?text=버즈', searchKeyword: '갤럭시 버즈 FE', targetPrice: 100000, currency: 'KRW', intent: 'ALERT_ONLY', status: 'ACTIVE', checkIntervalMinutes: 60, lastCheckedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 3600000).toISOString(), scheduledEndAt: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
          { id: 2, commandId: 'cmd-2', platform: 'naver', productId: 'prod-2', productUrl: '#', snapshotTitle: 'Apple AirPods Pro 2세대', snapshotPrice: 289000, snapshotImageUrl: 'https://via.placeholder.com/128/0F3460/FFFFFF?text=에어팟', searchKeyword: '에어팟 프로', targetPrice: 300000, currency: 'KRW', intent: 'ALERT_ONLY', status: 'ACTIVE', checkIntervalMinutes: 60, lastCheckedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 3600000).toISOString(), scheduledEndAt: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
          { id: 3, commandId: 'cmd-3', platform: 'aliexpress', productId: 'prod-3', productUrl: '#', snapshotTitle: 'QCY T13 PRO 무선 이어폰', snapshotPrice: 19800, snapshotImageUrl: 'https://via.placeholder.com/128/FF6B6B/FFFFFF?text=QCY', searchKeyword: 'QCY T13', targetPrice: 25000, currency: 'KRW', intent: 'AUTO_PAYMENT', status: 'ACTIVE', checkIntervalMinutes: 30, lastCheckedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 1800000).toISOString(), scheduledEndAt: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
          { id: 4, commandId: 'cmd-4', platform: 'coupang', productId: 'prod-4', productUrl: '#', snapshotTitle: '다이슨 에어랩 멀티스타일러 컴플리트', snapshotPrice: 599000, snapshotImageUrl: 'https://via.placeholder.com/128/1E4D8C/FFFFFF?text=다이슨', searchKeyword: '다이슨 에어랩', targetPrice: 550000, currency: 'KRW', intent: 'ALERT_ONLY', status: 'ACTIVE', checkIntervalMinutes: 60, lastCheckedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 3600000).toISOString(), scheduledEndAt: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
          { id: 5, commandId: 'cmd-5', platform: 'naver', productId: 'prod-5', productUrl: '#', snapshotTitle: '인천-오사카 왕복 항공권', snapshotPrice: 248000, snapshotImageUrl: 'https://via.placeholder.com/128/03c75a/FFFFFF?text=항공', searchKeyword: '인천 오사카', targetPrice: 250000, currency: 'KRW', intent: 'AUTO_PAYMENT', status: 'ACTIVE', checkIntervalMinutes: 120, lastCheckedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 7200000).toISOString(), scheduledEndAt: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
        ]);
        setLoadErrorMessage('');
      } finally {
        setIsLoading(false);
      }
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
      aliexpress: '알리익스프레스',
    };
    return map[platform] || platform;
  };

  const getPlatformColor = (platform: string): string => {
    const map: Record<string, string> = {
      naver: '#03c75a',
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
      } else {
        alert(res.message || '구독 삭제에 실패했습니다. 다시 시도해주세요.');
        return;
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

  const dateInputToUtcIso = (dateValue: string): string | undefined => {
    if (!dateValue) return undefined;
    return new Date(`${dateValue}T23:59:59+09:00`).toISOString();
  };

  const openEditModal = (item: SubscriptionItem) => {
    const editForm: EditConditionForm = {
      id: item.id,
      platform: item.platform,
      snapshotTitle: item.snapshotTitle,
      snapshotImageUrl: item.snapshotImageUrl,
      searchKeyword: item.searchKeyword,
      productUrl: item.productUrl,
      currency: item.currency,
      intent: item.intent,
      snapshotPrice: item.snapshotPrice,
      targetPrice: String(item.targetPrice),
      lastCheckedAt: item.lastCheckedAt,
      scheduledEndAt: item.scheduledEndAt,
      editExpiryDate: item.scheduledEndAt?.split('T')[0] ?? '',
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



    // 변경된 필드만 PATCH payload 구성
    const payload: SubscriptionUpdateRequest = {};

    if (editingCondition.intent !== editingConditionSnapshot.intent) {
      payload.intent = editingCondition.intent;
    }

    if (Number(editingCondition.targetPrice) !== Number(editingConditionSnapshot.targetPrice)) {
      payload.targetPrice = Number(editingCondition.targetPrice);
    }

    if (editingCondition.editExpiryDate) {
      const iso = dateInputToUtcIso(editingCondition.editExpiryDate);
      if (iso) payload.scheduledEndAt = iso;
    }

    if (Object.keys(payload).length === 0) {
      closeEditModal();
      return;
    }

    try {
      const res = await updateSubscription(editingCondition.id, payload);
      if (res.success && res.data) {
        setConditions((prev) =>
          prev.map((item) => (item.id === editingCondition.id ? res.data : item)),
        );
        closeEditModal();
        return;
      }
      alert(res.message || '구독 수정에 실패했습니다. 다시 시도해주세요.');
    } catch {
      alert('구독 수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans overflow-x-hidden">
      <DecorativeBackground variant="minimal" />
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto flex flex-col h-full">

        {/* 헤더 */}
        <div className="mb-6 flex items-start gap-4 md:gap-5 px-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
            <ListChecks className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">조건 관리</h1>
            <p className="text-slate-500 dark:text-slate-300 mt-1 font-medium">등록된 조건의 가격을 모니터링합니다.</p>
          </div>
        </div>

        {loadErrorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {loadErrorMessage}
          </div>
        )}

        {/* 메인 리스트 */}
        <div className="grid auto-rows-min grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading && (
            <div className="col-span-full flex justify-center py-20">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1E4D8C]" />
                <span className="text-sm font-medium">구독 목록을 불러오는 중...</span>
              </div>
            </div>
          )}

          {!isLoading && conditions.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 border border-[#1E4D8C]/10 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1">구독 중인 상품이 없습니다</h4>
              <p className="text-slate-500 dark:text-slate-300">새로운 모니터링 구독을 추가해보세요.</p>
            </div>
          )}

          {conditions.map((item) => {
            const priceDiff = calculatePriceDiff(item.snapshotPrice, item.targetPrice);
            const isSatisfied = isConditionSatisfied(priceDiff);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-6 shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(15,23,42,0.08)] transition-all duration-200 flex flex-col group relative"
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

                {/* 상품 이미지 — 조건 카드 크기에 맞춰 대시보드와 동일한 방식 */}
                {item.snapshotImageUrl && (
                  <div className="mb-3 -mx-6 overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <img
                      src={item.snapshotImageUrl}
                      alt={item.snapshotTitle}
                      className="w-full h-[250px] object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="250"><rect width="500" height="250" fill="%23F1F5F9"/><text x="250" y="130" font-family="sans-serif" font-size="18" fill="%2394A3B8" text-anchor="middle">이미지 없음</text></svg>';
                        e.currentTarget.classList.add('object-contain', 'p-10');
                      }}
                    />
                  </div>
                )}

                {/* 상품명 */}
                <div className="mb-1 flex items-start gap-1.5">
                  <p className="flex-1 min-w-0 line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#1E4D8C] dark:text-slate-50">
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
                <p className="mb-4 text-xs text-slate-400 dark:text-slate-500 truncate">
                  {item.searchKeyword}
                </p>

                {/* 가격 박스 */}
                <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[#1E4D8C] dark:text-[#7BAEDA] text-[10px] uppercase font-bold tracking-wider mb-1">현재가</p>
                      <p className="text-slate-900 dark:text-slate-50 font-black text-2xl">
                        {formatPrice(item.snapshotPrice, item.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">목표가</p>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold text-base">
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
                <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                  {item.scheduledEndAt ? (
                    <span>만료일: <span className="font-semibold text-slate-500 dark:text-slate-400">{formatDateTime(item.scheduledEndAt)}</span></span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">만료일 없음</span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="group/btn -ml-2 flex items-center gap-1 rounded-lg bg-transparent px-2 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:bg-[#F9F7F7] hover:text-[#1E4D8C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D8C]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-[#1E4D8C]/10 dark:hover:text-[#7BAEDA] dark:focus-visible:ring-offset-slate-800"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    aria-label="구독 삭제"
                    onClick={() => handleDeleteItem(item.id)}
                    className="-mr-2 inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10"
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
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-slate-200 dark:border-slate-700">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-slate-900 dark:text-slate-50 text-xl font-bold">구독 삭제</DialogTitle>
            <DialogDescription className="text-slate-700 dark:text-slate-300">
              {deleteTarget ? `'${deleteTarget.title}' 구독을 삭제할까요?` : '선택한 구독을 삭제할까요?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-slate-100 dark:bg-slate-900 px-6 py-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
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
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-slate-200 dark:border-slate-700">
          {editingCondition && (
            <form onSubmit={handleSaveEditCondition}>
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-slate-900 dark:text-slate-50 text-xl font-bold">조건 수정</DialogTitle>
                <DialogDescription className="text-slate-700 dark:text-slate-300">
                  모니터링 조건을 수정합니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 px-6 pb-2 mt-2 max-h-[60vh] overflow-y-auto">
                {/* 상품 정보 (읽기 전용) */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                  {editingCondition.snapshotImageUrl && (
                    <div className="-mx-4 -mt-4 mb-2 overflow-hidden rounded-t-xl">
                      <img
                        src={editingCondition.snapshotImageUrl}
                        alt={editingCondition.snapshotTitle}
                        className="w-full h-[250px] object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="250"><rect width="500" height="250" fill="%23F1F5F9"/><text x="250" y="115" font-family="sans-serif" font-size="16" fill="%2394A3B8" text-anchor="middle">이미지 없음</text></svg>';
                        e.currentTarget.classList.add('object-contain', 'p-8');
                      }}
                      />
                    </div>
                  )}
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{editingCondition.snapshotTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">알람 모드</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCondition((prev) => (prev ? { ...prev, intent: 'ALERT_ONLY' } : prev))}
                      className={editingCondition.intent === 'ALERT_ONLY' ? 'border-[#f0a040] bg-[#fef3c7] text-[#b45309] shadow-inner rounded-xl h-11 font-bold' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl h-11'}
                    >
                      알람 전용
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCondition((prev) => (prev ? { ...prev, intent: 'AUTO_PAYMENT' } : prev))}
                      className={editingCondition.intent === 'AUTO_PAYMENT' ? 'border-[#1E4D8C] bg-[#1E4D8C]/10 text-[#1E4D8C] dark:bg-[#7BAEDA]/20 dark:text-[#7BAEDA] shadow-inner rounded-xl h-11 font-bold' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl h-11'}
                    >
                      자동 결제
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">목표 최대가</Label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      value={editingCondition.targetPrice}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, targetPrice: e.target.value } : prev))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-[#1E4D8C]/40 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-[#0F3460] dark:text-[#7BAEDA] focus:border-[#1E4D8C] dark:focus:border-[#7BAEDA] focus:ring-1 focus:ring-[#1E4D8C]/30 dark:focus:ring-[#7BAEDA]/30 transition-all outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-300 font-medium">
                      {editingCondition.currency === 'USD' ? '$' : editingCondition.currency === 'JPY' ? '¥' : '원'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">현재가: {editingCondition.snapshotPrice != null ? formatPrice(editingCondition.snapshotPrice, editingCondition.currency) : '수집 전'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">만료일</Label>
                  <Popover
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        className="group w-full flex items-center justify-between font-normal bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 h-auto text-sm text-[#0f172a] dark:text-slate-50 transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800 focus-visible:ring-1 focus-visible:ring-[#1E4D8C]/30 dark:focus-visible:ring-[#7BAEDA]/30 focus-visible:border-[#1E4D8C] dark:focus-visible:border-[#7BAEDA] outline-none"
                      >
                        <div className="flex items-center">
                          <CalendarDays className="w-4 h-4 mr-2 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className={editingCondition.editExpiryDate ? 'text-[#0f172a] dark:text-slate-50' : 'text-slate-400 dark:text-slate-500'}>
                            {editingCondition.editExpiryDate
                              ? format(new Date(editingCondition.editExpiryDate), 'yyyy년 M월 d일', { locale: ko })
                              : '날짜를 선택해주세요'}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </Button>
                    }
                  >
                    <div className="p-2 bg-white dark:bg-slate-800">
                      <DayPicker
                        mode="single"
                        selected={editingCondition.editExpiryDate ? new Date(editingCondition.editExpiryDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setEditingCondition((prev) => (prev ? { ...prev, editExpiryDate: date.toISOString().split('T')[0] } : prev));
                          }
                        }}
                        locale={ko}
                        disabled={{ before: addDays(new Date(), 1) }}
                      />
                    </div>
                  </Popover>
                </div>

                {/* 메타 정보 (읽기 전용) */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">기록</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>마지막 확인: {formatDateTime(editingCondition.lastCheckedAt)}</span>
                    <span>등록일: {formatDateTime(editingCondition.createdAt)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-slate-100 dark:bg-slate-900 px-6 py-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
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
