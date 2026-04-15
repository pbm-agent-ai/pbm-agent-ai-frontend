import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';

type Condition = {
  id: number;
  platform: string;
  product: string;
  currentPrice: number;
  targetPrice: number;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  details: string;
  active: boolean;
};

type NewConditionForm = {
  platform: string;
  product: string;
  currentPrice: string;
  targetPrice: string;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  details: string;
};

type EditConditionForm = {
  id: number;
  product: string;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  currentPrice: number;
  targetPrice: string;
};

export default function Conditions() {
  const [conditions, setConditions] = useState<Condition[]>([
    {
      id: 1,
      platform: 'naver-flights',
      product: '인천-오사카 왕복 항공권',
      currentPrice: 289000,
      targetPrice: 250000,
      mode: 'AUTO_PAYMENT',
      details: '2026년 5월 출발 • 성인 1명',
      active: true,
    },
    {
      id: 2,
      platform: 'coupang',
      product: 'Apple AirPods Pro 2세대',
      currentPrice: 298000,
      targetPrice: 300000,
      mode: 'AUTO_PAYMENT',
      details: '정품 보장 • 로켓배송',
      active: true,
    },
    {
      id: 3,
      platform: '11st',
      product: 'LG 그램 17인치 노트북',
      currentPrice: 1890000,
      targetPrice: 1750000,
      mode: 'ALERT_ONLY',
      details: 'i7-13세대 • 16GB RAM • 512GB SSD',
      active: true,
    },
    {
      id: 4,
      platform: 'gmarket',
      product: '나이키 에어맥스 270',
      currentPrice: 149000,
      targetPrice: 150000,
      mode: 'AUTO_PAYMENT',
      details: '블랙 컬러 • 사이즈 270mm',
      active: false,
    },
    {
      id: 5,
      platform: 'naver-flights',
      product: '서울-제주 왕복 항공권',
      currentPrice: 87000,
      targetPrice: 80000,
      mode: 'ALERT_ONLY',
      details: '2026년 6월 출발 • 성인 2명',
      active: true,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [editingCondition, setEditingCondition] = useState<EditConditionForm | null>(null);
  const [newCondition, setNewCondition] = useState<NewConditionForm>({
    platform: '',
    product: '',
    currentPrice: '',
    targetPrice: '',
    mode: 'ALERT_ONLY',
    details: '',
  });

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
  };

  const platformOptions = useMemo(() => {
    const platforms = Array.from(new Set(conditions.map((condition) => condition.platform)));
    return ['ALL', ...platforms];
  }, [conditions]);

  // [수정] 검색어 + 플랫폼 필터가 적용된 카드 목록
  const filteredConditions = useMemo(() => {
    return conditions.filter((condition) => {
      const productMatched = condition.product
        .toLowerCase()
        .includes(searchKeyword.trim().toLowerCase());
      const platformMatched = platformFilter === 'ALL' || condition.platform === platformFilter;
      return productMatched && platformMatched;
    });
  }, [conditions, platformFilter, searchKeyword]);

  // [추가] 스위치 ON/OFF 시 모니터링 상태를 바꾸고, 변경 결과를 alert로 사용자에게 안내
  const handleToggleCondition = (id: number, checked: boolean) => {
    const target = conditions.find((condition) => condition.id === id);
    if (!target) return;

    const statusMessage = checked
      ? `${target.product} 모니터링이 시작되었습니다.`
      : `${target.product} 모니터링이 중지되었습니다.`;

    alert(statusMessage);

    setConditions((prev) =>
      prev.map((condition) =>
        condition.id === id ? { ...condition, active: checked } : condition
      )
    );
  };

  // [추가] 제품 카드 클릭 시 "수정 모달"에 필요한 최소 정보(제품명/모드/목표가)만 세팅
  const openEditModal = (condition: Condition) => {
    setEditingCondition({
      id: condition.id,
      product: condition.product,
      mode: condition.mode,
      currentPrice: condition.currentPrice,
      targetPrice: String(condition.targetPrice),
    });
  };

  const closeEditModal = () => {
    setEditingCondition(null);
  };

  // [추가] 수정 모달 저장: 알람/자동결제(mode)와 목표 최대가(targetPrice)만 업데이트
  const handleSaveEditCondition = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCondition || !editingCondition.targetPrice) {
      alert('목표 최대가를 입력하세요.');
      return;
    }

    if (Number(editingCondition.targetPrice) <= 0) {
      alert('목표 최대가는 0보다 큰 값을 입력하세요.');
      return;
    }

    setConditions((prev) =>
      prev.map((condition) =>
        condition.id === editingCondition.id
          ? {
            ...condition,
            mode: editingCondition.mode,
            targetPrice: Number(editingCondition.targetPrice),
          }
          : condition,
      ),
    );
    closeEditModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewCondition({
      platform: '',
      product: '',
      currentPrice: '',
      targetPrice: '',
      mode: 'ALERT_ONLY',
      details: '',
    });
  };

  const handleAddCondition = (e: FormEvent) => {
    e.preventDefault();

    if (
      !newCondition.platform.trim() ||
      !newCondition.product.trim() ||
      !newCondition.currentPrice ||
      !newCondition.targetPrice
    ) {
      alert('플랫폼, 제품명, 현재 가격, 목표 최대가를 입력하세요.');
      return;
    }

    const createdCondition: Condition = {
      id: Date.now(),
      platform: newCondition.platform.trim(),
      product: newCondition.product.trim(),
      currentPrice: Number(newCondition.currentPrice),
      targetPrice: Number(newCondition.targetPrice),
      mode: newCondition.mode,
      details: newCondition.details.trim() || '옵션 정보 없음',
      active: true,
    };

    setConditions((prev) => [createdCondition, ...prev]);
    closeModal();
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-foreground">조건 관리</h1>
        <input
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="제품명을 검색하세요"
          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0f172a] md:w-[320px]"
        />
      </div>
      <p className="text-muted-foreground">모니터링 조건을 설정하고 관리합니다</p>
      <div className="mt-3 mb-5 flex flex-wrap items-center gap-2">
        {platformOptions.map((platform) => (
          <Button
            key={platform}
            type="button"
            variant="outline"
            onClick={() => setPlatformFilter(platform)}
            className={
              platformFilter === platform
                ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20'
                : 'text-[#64748b]'
            }
          >
            {platform === 'ALL' ? '전체 플랫폼' : platform}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* [수정] 필터 결과가 없을 때 안내 문구 표시 */}
        {filteredConditions.length === 0 && (
          <Card className="lg:col-span-2 border-[#e2e8f0] bg-white">
            <CardContent className="p-6 text-center text-sm text-[#64748b]">
              검색/필터 조건에 맞는 제품이 없습니다.
            </CardContent>
          </Card>
        )}
        {/* [수정] 원본 conditions 대신 filteredConditions로 카드 렌더링 */}
        {filteredConditions.map((condition) => (
          <Card
            key={condition.id}
            className="bg-white border-[#e2e8f0] shadow-sm cursor-pointer transition hover:shadow-lg hover:-translate-y-1 hover:bg-emerald-50"
            // [추가] 카드 클릭으로 수정 모달 오픈
            onClick={() => openEditModal(condition)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge variant="outline" className="text-[#64748b] border-[#e2e8f0] font-mono text-xs">
                  {condition.platform}
                </Badge>
                <div onClick={(e) => e.stopPropagation()}>
                  {/* [추가] 스위치 클릭은 카드 클릭과 분리(모달이 열리지 않도록 이벤트 전파 차단) */}
                  <Switch
                    checked={condition.active}
                    onCheckedChange={(checked) => handleToggleCondition(condition.id, Boolean(checked))}
                  />
                </div>
              </div>

              <h3 className="text-[#0f172a] font-semibold mb-4 text-lg">{condition.product}</h3>

              <div className="mb-4">
                <p className="text-[#64748b] text-xs mb-1">현재 수집 가격</p>
                <p className="text-[#10b981] text-3xl font-bold">{formatPrice(condition.currentPrice)}</p>
              </div>

              <div className="mb-4">
                <p className="text-[#94a3b8] text-xs mb-1">목표 최대가</p>
                <p className="text-[#64748b] font-semibold">{formatPrice(condition.targetPrice)}</p>
              </div>

              <div className="mb-4">
                <Badge
                  variant="outline"
                  className={`font-mono ${condition.mode === 'AUTO_PAYMENT'
                      ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                      : 'bg-[#f0a040]/15 text-[#f0a040] border-[#f0a040]/40'
                    }`}
                >
                  {condition.mode.toLowerCase()}
                </Badge>
              </div>

              <p className="text-[#64748b] text-sm">{condition.details}</p>
            </CardContent>
          </Card>
        ))}

        <Card
          className="bg-transparent border-2 border-dashed border-[#cbd5e1] hover:border-[#10b981] hover:bg-[#10b981]/5 transition-all cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[320px]">
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-full bg-[#f8fafc] mb-3 group-hover:bg-[#10b981] transition-colors"
            >
              <Plus className="w-6 h-6 text-[#64748b] group-hover:text-white" />
            </Button>
            <p className="text-[#64748b] font-semibold group-hover:text-[#10b981] transition-colors">
              새 조건 추가
            </p>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#e2e8f0] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#0f172a]">새 조건 추가</h2>
              <button type="button" onClick={closeModal} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCondition} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">플랫폼</label>
                <input
                  value={newCondition.platform}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, platform: e.target.value }))}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                  placeholder="예: 11st, coupang, naver-flights"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">제품명</label>
                <input
                  value={newCondition.product}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, product: e.target.value }))}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                  placeholder="예: Apple Watch Series 10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#334155]">현재 가격</label>
                  <input
                    type="number"
                    value={newCondition.currentPrice}
                    onChange={(e) => setNewCondition((prev) => ({ ...prev, currentPrice: e.target.value }))}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                    placeholder="예: 289000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#334155]">목표 최대가</label>
                  <input
                    type="number"
                    value={newCondition.targetPrice}
                    onChange={(e) => setNewCondition((prev) => ({ ...prev, targetPrice: e.target.value }))}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                    placeholder="예: 250000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">알람 or 자동 결제</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setNewCondition((prev) => ({
                        ...prev,
                        mode: 'ALERT_ONLY',
                      }))
                    }
                    className={
                      newCondition.mode === 'ALERT_ONLY'
                        ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20'
                        : ''
                    }
                  >
                    알람
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setNewCondition((prev) => ({
                        ...prev,
                        mode: 'AUTO_PAYMENT',
                      }))
                    }
                    className={
                      newCondition.mode === 'AUTO_PAYMENT'
                        ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20'
                        : ''
                    }
                  >
                    자동 결제
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">제품 옵션</label>
                <input
                  value={newCondition.details}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, details: e.target.value }))}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                  placeholder="예: 블랙 컬러 • 사이즈 270mm"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  취소
                </Button>
                <Button type="submit" className="bg-[#10b981] text-white hover:bg-[#059669]">
                  추가
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [추가] 제품 카드 클릭 시 열리는 "조건 수정" 모달
          - 수정 가능: 알람/자동결제, 목표 최대가
          - 수정 불가: 제품명(읽기 전용) 및 그 외 항목 */}
      {editingCondition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
              <h2 className="text-lg font-bold text-[#0f172a]">조건 수정</h2>
              <button type="button" onClick={closeEditModal} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCondition} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">제품명</label>
                <input
                  value={editingCondition.product}
                  disabled
                  className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#64748b]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">알람 or 자동 결제</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditingCondition((prev) =>
                        prev
                          ? {
                            ...prev,
                            mode: 'ALERT_ONLY',
                          }
                          : prev,
                      )
                    }
                    className={
                      editingCondition.mode === 'ALERT_ONLY'
                        ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20'
                        : ''
                    }
                  >
                    알람
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditingCondition((prev) =>
                        prev
                          ? {
                            ...prev,
                            mode: 'AUTO_PAYMENT',
                          }
                          : prev,
                      )
                    }
                    className={
                      editingCondition.mode === 'AUTO_PAYMENT'
                        ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20'
                        : ''
                    }
                  >
                    자동 결제
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#334155]">목표 최대가(설정 가격)</label>
                {/* [추가] 목표 최대가 옆에 현재 가격 표시 */}
                <p className="mb-1 text-xs text-[#64748b]">현재 가격: {formatPrice(editingCondition.currentPrice)}</p>
                <input
                  type="number"
                  step="1000"
                  value={editingCondition.targetPrice}
                  onChange={(e) =>
                    setEditingCondition((prev) =>
                      prev
                        ? {
                          ...prev,
                          targetPrice: e.target.value,
                        }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-4">
                <Button type="button" variant="outline" onClick={closeEditModal}>
                  취소
                </Button>
                <Button type="submit" className="bg-[#10b981] text-white hover:bg-[#059669]">
                  저장
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
