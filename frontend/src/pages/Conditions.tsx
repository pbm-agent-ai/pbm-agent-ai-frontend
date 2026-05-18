import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, X, Search, Circle, ChevronRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { createConditionRegistration, deleteConditionDetail, fetchConditionDetail, fetchConditionList, pauseConditionDetail, resumeConditionDetail, updateConditionDetail } from '../api/condition';
import type {
  ConditionCardItem,
  ConditionCreateRequest,
  ConditionCreateResponse,
  ConditionDetailItem,
  ConditionUpdateRequest,
} from '../types/condition.ts';

//필터 팝업에서 선택한 값을 관리하는 타입
type ConditionFilterState = { 
  platform: string;
  isActive: 'ALL' | 'true' | 'false';
  mode: 'ALL' | 'AUTO_PAYMENT' | 'ALERT_ONLY';
};


//새 조건 등록 폼의 입력값을 관리하는 타입
type NewConditionForm = { 
  platform: string;
  keyword: string;
  maxPrice: string;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  maxExecutionCount: string;
  expiryYear: string;
  expiryMonth: string;
  expiryDay: string;
  flightType: string;
  tripType: string;
};

type EditConditionForm = {
  conditionId: number;
  platform: string;
  keyword: string;
  mode: 'AUTO_PAYMENT' | 'ALERT_ONLY';
  currentPrice?: number;
  maxPrice: string;
  priceDiff?: number;
  currentExecutionCount?: number;
  maxExecutionCount: string;
  lastCheckedAt?: string;
  expiredAt?: string;
  updatedAt?: string;
  editExpiryYearText?: string;
  editExpiryMonthText?: string;
  editExpiryDayText?: string;
  options?: ConditionCreateRequest['options'];
  flightTypeText?: string;
  tripTypeText?: string;
  recentPrices?: ConditionDetailItem['recentPrices'];
  createdAt?: string;
  isActive: boolean;
};

type ConditionApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    detail?: {
      missingFields?: string[];
    } | null;
  };
};

const defaultFilterState: ConditionFilterState = {
  platform: 'ALL',
  isActive: 'ALL',
  mode: 'ALL',
};

const getConditionApiErrorResponse = (error: unknown) => {
  return axios.isAxiosError<ConditionApiErrorResponse>(error) ? error.response?.data : null;
};

const formatDateTimeText = (value?: string) => {
  if (!value) {
    return '기록 없음';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const splitDateText = (value?: string) => {
  if (!value) {
    return { year: '', month: '', day: '' };
  }

  const [dateText] = value.split('T');
  const [year = '', month = '', day = ''] = dateText.split('-');

  const normalizeDatePart = (text: string) => {
    if (!text) {
      return '';
    }

    const parsed = Number(text);
    return Number.isNaN(parsed) ? text : String(parsed);
  };

  return {
    year,
    month: normalizeDatePart(month),
    day: normalizeDatePart(day),
  };
};

// 2026-05-06: 서버 조회 실패 시에만 보여줄 개발용 조건 예시다.
const exampleConditions: ConditionCardItem[] = [
  {
    conditionId: 1,
    platform: 'naver_flight',
    keyword: 'ICN-TYO',
    currentPrice: 289000,
    maxPrice: 250000,
    mode: 'AUTO_PAYMENT',
    maxExecutionCount: 1,
    expiredAt: '2026-06-30T23:59:59',
    options: {
      flight_type: '직항',
      trip_type: '왕복',
    },
    isActive: true,
  },
  {
    conditionId: 2,
    platform: 'naver',
    keyword: 'ICN-TYO',
    currentPrice: 289000,
    maxPrice: 290000,
    mode: 'AUTO_PAYMENT',
    maxExecutionCount: 1,
    expiredAt: '2026-06-30T23:59:59',
    options: {
      flight_type: '직항',
      trip_type: '왕복',
    },
    isActive: true,
  }
];

// 필터 팝업에서 사용할 서버 조회 조건을 따로 보관한다.
export default function Conditions() {
  const [conditions, setConditions] = useState<ConditionCardItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isConditionsLoading, setIsConditionsLoading] = useState(false);
  const [isTogglingConditionId, setIsTogglingConditionId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ conditionId: number; keyword: string } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterState, setFilterState] = useState<ConditionFilterState>(defaultFilterState);
  const [serverErrorMessage, setServerErrorMessage] = useState('');
  const [editingCondition, setEditingCondition] = useState<EditConditionForm | null>(null);
  const [editingConditionSnapshot, setEditingConditionSnapshot] = useState<EditConditionForm | null>(null);
  const [newCondition, setNewCondition] = useState<NewConditionForm>({
    platform: '',
    keyword: '',
    maxPrice: '',
    mode: 'ALERT_ONLY',
    maxExecutionCount: '',
    // 만료일 연도는 사용자가 직접 선택하도록 기본값을 비워 둔다.
    expiryYear: '',
    expiryMonth: '',
    expiryDay: '',
    flightType: '',
    tripType: '',
  });

  const hasActiveFilters =
    searchKeyword.trim().length > 0 ||
    filterState.platform !== defaultFilterState.platform ||
    filterState.isActive !== defaultFilterState.isActive ||
    filterState.mode !== defaultFilterState.mode;


  // 2026-05-06: 조건 목록 조회에 page/size를 붙여 서버 페이지네이션을 함께 사용한다.
  const loadConditions = async (nextParams?: Partial<ConditionFilterState>, nextKeyword?: string) => {
    const mergedParams: ConditionFilterState = {
      platform: nextParams?.platform ?? filterState.platform,
      isActive: nextParams?.isActive ?? filterState.isActive,
      mode: nextParams?.mode ?? filterState.mode,
    };
    // 검색과 필터는 따로 저장하되, 서버 조회할 때는 항상 둘을 함께 묶어서 보낸다.
    // 그래서 검색 후 필터를 눌러도, 필터 후 검색을 해도 같은 기준으로 다시 조회된다.
    const keyword = (nextKeyword ?? searchKeyword).trim();

    try {
      setIsConditionsLoading(true);
      setServerErrorMessage('');
      // 검색어와 필터 값을 쿼리스트링으로 보내 서버에서 조건 목록을 다시 받아온다.
      const response = await fetchConditionList({
        keyword: keyword || undefined,
        platform: mergedParams.platform === 'ALL' ? undefined : mergedParams.platform,
        isActive: mergedParams.isActive === 'ALL' ? undefined : mergedParams.isActive === 'true',
        mode: mergedParams.mode === 'ALL' ? undefined : mergedParams.mode,
      });

      setConditions(response.data.conditions);
      setFilterState({
        platform: mergedParams.platform,
        isActive: mergedParams.isActive,
        mode: mergedParams.mode,
      });
    } catch (error: unknown) {
      // 2026-05-06: 서버 조회에 실패하면 개발용 예시 조건을 대신 보여준다.
      const errorResponse = getConditionApiErrorResponse(error);
      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setServerErrorMessage('실시간 조건 목록을 불러오지 못했습니다. 예시 데이터를 표시합니다.');
      }
      setConditions(exampleConditions);
    } finally {
      setIsConditionsLoading(false);
    }
  };

  useEffect(() => {
    void loadConditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
  };

  //옵션이 없으면 빈 문자열을 반환하고, 문자열이면 그대로 반환하고, 객체면 항공권 조건 형식으로 포맷한다.
  //항공권 이외에 신발이나, 전자제품에서 옵션의 필드는 어떡할 건지
  //object에서 string으로 바꿔야 하는지 등은 추후 논의가 필요하다.
  const formatOptions = (options: ConditionCreateRequest['options']) => {
    if (!options) {
      return ' ';
    }

    if (typeof options === 'string') {
      return options;
    }

    return `${options.flight_type} • ${options.trip_type}`;
  };

  // 2026-05-06: 조건 관련 공통 에러 코드는 동일한 메시지로 처리한다.
  // 2026-05-06: 조건 목록 조회 실패는 조회 전용 에러 코드에 따라 메시지를 분기한다.
  // 2026-05-06: 조건 등록 실패는 서버 에러 코드에 따라 다른 메시지로 안내한다.
  // 2026-05-06: 조건 상세 조회는 CONDITION 전용 에러 코드에 따라 메시지를 분기한다.
  // 2026-05-06: 조건 수정 실패는 서버가 내려준 메시지를 우선 그대로 보여준다.
  // 2026-05-06: 조건 삭제는 공통 오류와 삭제 전용 조건 오류를 분기한다.
  // 2026-05-06: 일시정지는 공통 오류와 일시정지 전용 조건 오류를 분기한다.
  // 2026-05-06: 재개는 공통 오류와 재개 전용 조건 오류를 분기한다.
  // 2026-05-06: 새 조건 등록 시 commandId를 날짜값이 아니라 현재 목록 기준으로 1씩 증가시키도록 변경한다.
  const getNextCommandId = () => {
    const commandIds = conditions
      .map((condition) => condition.commandId)
      .filter((commandId): commandId is number => typeof commandId === 'number');

    return (commandIds.length > 0 ? Math.max(...commandIds) : 0) + 1;
  };

  // 선택한 연도/월에 맞춰 일 수를 계산한다.
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  // 만료일 연도는 현재 연도부터 선택 가능하도록 목록을 만든다.
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 2100 - currentYear + 1 }, (_, index) => String(currentYear + index));
  };

  // 월은 1월부터 12월까지 고를 수 있도록 고정 목록을 반환한다.
  const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => String(index + 1));

  // 연도와 월이 모두 선택된 뒤에만 일 목록을 계산한다.
  const getDayOptions = (yearText: string, monthText: string) => {
    if (!yearText || !monthText) {
      return [];
    }

    const year = Number(yearText);
    const month = Number(monthText);
    const maxDay = getDaysInMonth(year, month);

    return Array.from({ length: maxDay }, (_, index) => String(index + 1));
  };

  // 서버로 보낼 expiredAt 문자열을 날짜 선택값에서 조합한다.
  const getExpiryDateText = () =>
    `${newCondition.expiryYear}-${newCondition.expiryMonth.padStart(2, '0')}-${newCondition.expiryDay.padStart(2, '0')}T23:59:59`;

  const getEditExpiryDateText = (yearText?: string, monthText?: string, dayText?: string) =>
    `${yearText ?? ''}-${(monthText ?? '').padStart(2, '0')}-${(dayText ?? '').padStart(2, '0')}T23:59:59`;

  // 2026-05-06: 항공권 조건에서만 옵션 2개를 입력받도록 기존 방식으로 복구한다.
  const isAirlinePlatform = (platform: string) => platform.includes('flight');

  const handlePlatformChange = (platform: string) => {
    setNewCondition((prev) => ({
      ...prev,
      platform,
    }));
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
    return map[platform] || '#6366F1';
  };


  // 2026-05-06: 토글 ON/OFF는 재개/일시정지 PATCH로 서버에 반영한다.
  const handleToggleCondition = async (conditionId: number, checked: boolean) => {
    const target = conditions.find((condition) => condition.conditionId === conditionId);
    if (!target) return;

    try {
      setIsTogglingConditionId(conditionId);
      const response = checked
        ? await resumeConditionDetail(conditionId)
        : await pauseConditionDetail(conditionId);

      if (response.message) {
        alert(response.message);
      }

      setConditions((prev) =>
        prev.map((condition) =>
          condition.conditionId === conditionId
            ? {
                ...condition,
                isActive: response.data?.isActive ?? checked,
                updatedAt: response.data?.updatedAt ?? condition.updatedAt,
              }
            : condition,
        ),
      );

      if (editingCondition?.conditionId === conditionId) {
        setEditingCondition((prev) =>
          prev
            ? {
                ...prev,
                isActive: response.data?.isActive ?? checked,
                updatedAt: response.data?.updatedAt ?? prev.updatedAt,
              }
            : prev,
        );
      }
    } catch (error: unknown) {
      const errorResponse = getConditionApiErrorResponse(error);

      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        if (shouldReloadConditionList(errorResponse?.error?.code)) {
          await reloadConditionList();
        }

        handleConditionError(error, checked ? '조건 재개에 실패했습니다. 잠시 후 다시 시도하세요.' : '조건 일시정지에 실패했습니다. 잠시 후 다시 시도하세요.');
      }
    } finally {
      setIsTogglingConditionId(null);
    }
  };

  // 2026-05-06: 카드 삭제는 확인 다이얼로그를 먼저 연다.
  const handleDeleteCondition = (conditionId: number) => {
    const target = conditions.find((condition) => condition.conditionId === conditionId);
    if (!target) return;

    setDeleteTarget({ conditionId, keyword: target.keyword });
  };

  const confirmDeleteCondition = async () => {
    if (!deleteTarget) return;

    const conditionId = deleteTarget.conditionId;

    try {
      const response = await deleteConditionDetail(conditionId);

      if (response.message) {
        alert(response.message);
      }

      setConditions((prev) => prev.filter((condition) => condition.conditionId !== conditionId));
      setDeleteTarget(null);
      // 2026-05-06: 삭제한 조건이 현재 보고 있는 상세 조건이면 상세 모달을 닫는다.
      if (editingCondition?.conditionId === conditionId) {
        closeEditModal();
      }
    } catch (error: unknown) {
      const errorResponse = getConditionApiErrorResponse(error);

      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        if (shouldReloadConditionList(errorResponse?.error?.code)) {
          await reloadConditionList();
        }

        handleConditionError(error, '조건 삭제에 실패했습니다. 잠시 후 다시 시도하세요.');
      }
    }
  };

  const calculatePriceDiff = (currentPrice?: number, targetPrice?: number) => {
    if (currentPrice == null || targetPrice == null) {
      return undefined;
    }

    return currentPrice - targetPrice;
  };

  // 2026-05-06: 현재가가 목표가보다 낮으면 조건이 충족된 것으로 표시한다.
  const isConditionSatisfied = (priceDiff?: number) => {
    return priceDiff != null && priceDiff < 0;
  };

  const getConditionStatusLabel = (priceDiff?: number) => {
    if (priceDiff == null) {
      return '상태 미확인';
    }

    return isConditionSatisfied(priceDiff) ? '조건 충족' : '조건 미충족';
  };

  const getPriceDiffSummaryText = (priceDiff?: number) => {
    if (priceDiff == null) {
      return '비교 불가';
    }

    const priceGapText = formatPrice(Math.abs(priceDiff));
    return priceDiff < 0 ? `${priceGapText} 낮음` : `${priceGapText} 높음`;
  };

  const getSortedRecentPrices = (recentPrices?: ConditionDetailItem['recentPrices']) => {
    if (!recentPrices || recentPrices.length === 0) {
      return [];
    }

    return [...recentPrices].sort(
      (left, right) => new Date(left.collectedAt).getTime() - new Date(right.collectedAt).getTime(),
    );
  };

  const sampleRecentPrices: ConditionDetailItem['recentPrices'] = [
    { price: 271000, collectedAt: '2026-04-16T10:30:00' },
    { price: 275000, collectedAt: '2026-04-16T10:00:00' },
    { price: 268000, collectedAt: '2026-04-16T09:30:00' },
  ];

  const MiniPriceChart = ({ recentPrices }: { recentPrices?: ConditionDetailItem['recentPrices'] }) => {
    const points = getSortedRecentPrices(recentPrices && recentPrices.length > 0 ? recentPrices : sampleRecentPrices);

    const prices = points.map((item) => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const width = 320;
    const height = 120;
    const padding = 14;

    const getX = (index: number) => {
      if (points.length === 1) {
        return width / 2;
      }

      return padding + (index * (width - padding * 2)) / (points.length - 1);
    };

    const getY = (price: number) => {
      if (maxPrice === minPrice) {
        return height / 2;
      }

      const normalized = (price - minPrice) / (maxPrice - minPrice);
      return height - padding - normalized * (height - padding * 2);
    };

    const linePath = points
      .map((item, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(item.price)}`)
      .join(' ');

    const areaPath = `${linePath} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#111827] dark:text-slate-50">최근 수집 가격</p>
            <p className="text-xs text-[#64748b]">최근 3개 가격 흐름 미니 차트</p>
          </div>
          <div className="text-right text-xs text-[#64748b]">
            <p>최저 {formatPrice(minPrice)}</p>
            <p>최고 {formatPrice(maxPrice)}</p>
          </div>
        </div>

        <svg className="h-[120px] w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="recentPriceAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#recentPriceAreaGradient)" />
          <path d={linePath} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((item, index) => {
            const x = getX(index);
            const y = getY(item.price);

            return (
              <g key={`${item.collectedAt}-${index}`}>
                <circle cx={x} cy={y} r="4.5" fill="#6366F1" stroke="white" className="dark:stroke-slate-800" strokeWidth="2" />
              </g>
            );
          })}
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {points.map((item, index) => (
            <div key={`${item.collectedAt}-${index}`} className="rounded-xl bg-[#F8FAFC] dark:bg-slate-900 px-3 py-2 text-center">
              <p className="text-[11px] font-semibold text-[#64748b]">{item.collectedAt.slice(11, 16)}</p>
              <p className="text-sm font-bold text-[#0f172a] dark:text-slate-50">{formatPrice(item.price)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const openDetailModal = async (condition: ConditionCardItem) => {
    const initialEditCondition: EditConditionForm = {
      conditionId: condition.conditionId,
      platform: condition.platform,
      keyword: condition.keyword,
      mode: condition.mode,
      currentPrice: condition.currentPrice,
      maxPrice: String(condition.maxPrice),
      priceDiff: calculatePriceDiff(condition.currentPrice, condition.maxPrice),
      currentExecutionCount: condition.maxExecutionCount,
      maxExecutionCount: condition.maxExecutionCount != null ? String(condition.maxExecutionCount) : '',
      lastCheckedAt: undefined,
      expiredAt: condition.expiredAt,
      updatedAt: undefined,
      ...(() => {
        const { year, month, day } = splitDateText(condition.expiredAt);
        return {
          editExpiryYearText: year,
          editExpiryMonthText: month,
          editExpiryDayText: day,
        };
      })(),
      options: condition.options,
      flightTypeText: typeof condition.options === 'object' && condition.options ? condition.options.flight_type : '',
      tripTypeText: typeof condition.options === 'object' && condition.options ? condition.options.trip_type : '',
      recentPrices: sampleRecentPrices,
      createdAt: undefined,
      isActive: condition.isActive,
    };
    
    setEditingCondition(initialEditCondition);
    setEditingConditionSnapshot(initialEditCondition);

    try {
      const detail = await fetchConditionDetail(condition.conditionId);
      const detailEditCondition: EditConditionForm = {
        conditionId: condition.conditionId,
        platform: detail.platform,
        keyword: detail.keyword,
        mode: detail.mode,
        currentPrice: detail.currentPrice,
        maxPrice: String(detail.maxPrice),
        priceDiff: detail.priceDiff ?? calculatePriceDiff(detail.currentPrice, detail.maxPrice),
        currentExecutionCount: detail.currentExecutionCount,
        maxExecutionCount: detail.maxExecutionCount != null ? String(detail.maxExecutionCount) : '',
        lastCheckedAt: detail.lastCheckedAt,
        expiredAt: detail.expiredAt,
        ...(() => {
          const { year, month, day } = splitDateText(detail.expiredAt);
          return {
            editExpiryYearText: year,
            editExpiryMonthText: month,
            editExpiryDayText: day,
          };
        })(),
        updatedAt: detail.updatedAt,
        options: detail.options,
        flightTypeText: typeof detail.options === 'object' && detail.options ? detail.options.flight_type : '',
        tripTypeText: typeof detail.options === 'object' && detail.options ? detail.options.trip_type : '',
        recentPrices: detail.recentPrices,
        createdAt: detail.createdAt,
        isActive: detail.isActive,
      };

      setEditingCondition(detailEditCondition);
      setEditingConditionSnapshot(detailEditCondition);
    } catch (error: unknown) {
      // 2026-05-06: 상세 조회 실패는 상세 조회 전용 에러 코드에 따라 안내한다.
      const errorResponse = getConditionApiErrorResponse(error);

      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        if (shouldReloadConditionList(errorResponse?.error?.code)) {
          await reloadConditionList();
          closeEditModal();
        }

        handleConditionError(error, '조건 상세 조회에 실패했습니다. 잠시 후 다시 시도하세요.', { closeModalOnStale: true });
      }
    }
  };

  const closeEditModal = () => {
    setEditingCondition(null);
    setEditingConditionSnapshot(null);
    setIsEditModalOpen(false);
  };

  const handleOpenEdit = () => {
    setEditingConditionSnapshot(editingCondition);
    setEditingCondition((prev) =>
      prev
        ? {
            ...prev,
            editExpiryYearText: '',
            editExpiryMonthText: '',
            editExpiryDayText: '',
          }
        : prev,
    );
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingCondition(editingConditionSnapshot);
    setIsEditModalOpen(false);
  };

  // 2026-05-06: 조건 오류가 나면 목록을 다시 받아 화면 상태를 서버 기준으로 맞춘다.
  const reloadConditionList = async () => {
    await loadConditions();
  };

  // 2026-05-06: 조건이 더 이상 유효하지 않다고 판단되는 에러는 목록을 다시 조회한다.
  const shouldReloadConditionList = (errorCode?: string) =>
    errorCode === 'CONDITION001' ||
    errorCode === 'CONDITION003' ||
    errorCode === 'CONDITION004' ||
    errorCode === 'CONDITION009';

  const handleConditionError = async (
    error: unknown,
    fallback: string,
    options?: { closeModalOnStale?: boolean },
  ) => {
    const errorResponse = getConditionApiErrorResponse(error);
    if (!errorResponse?.error) {
      alert(fallback);
      return;
    }

    const { code, message, detail } = errorResponse.error;

    if (code === 'SERVER001') {
      setServerErrorMessage(message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (shouldReloadConditionList(code)) {
      await reloadConditionList();
      if (options?.closeModalOnStale) {
        closeEditModal();
      }
    }

    let displayMessage = message ?? fallback;
    if (detail?.missingFields && detail.missingFields.length > 0) {
      displayMessage += ` (${detail.missingFields.join(', ')})`;
    }

    alert(displayMessage);
  };

  // 상세 보기 창에서 수정 가능한 값만 저장한다.
  const handleSaveEditCondition = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCondition) {
      return;
    }

    const validationMessage = getEditValidationMessage();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    const updatedOptions = isAirlinePlatform(editingCondition.platform)
      ? editingCondition.flightTypeText?.trim() || editingCondition.tripTypeText?.trim()
        ? {
            flight_type: editingCondition.flightTypeText?.trim() ?? '',
            trip_type: editingCondition.tripTypeText?.trim() ?? '',
          }
        : undefined
      : undefined;

    const updatedExpiredAt =
      editingCondition.editExpiryYearText && editingCondition.editExpiryMonthText && editingCondition.editExpiryDayText
        ? getEditExpiryDateText(
            editingCondition.editExpiryYearText,
            editingCondition.editExpiryMonthText,
            editingCondition.editExpiryDayText,
          )
        : undefined;

    const payload: ConditionUpdateRequest = {
      maxPrice: Number(editingCondition.maxPrice),
      mode: editingCondition.mode,
      ...(editingCondition.maxExecutionCount.trim()
         ? { maxExecutionCount: Number(editingCondition.maxExecutionCount) }
        : {}),
      ...(updatedExpiredAt ? { expiredAt: updatedExpiredAt } : {}),
      ...(updatedOptions ? { options: updatedOptions } : {}),
    };

    try {
      setIsSavingEdit(true);
      const response = await updateConditionDetail(editingCondition.conditionId, payload);

      if (response.message) {
        alert(response.message);
      }

      setConditions((prev) =>
        prev.map((condition) =>
          condition.conditionId === editingCondition.conditionId
            ? {
              ...condition,
              maxPrice: Number(editingCondition.maxPrice),
              mode: editingCondition.mode,
              maxExecutionCount: editingCondition.maxExecutionCount.trim() ? Number(editingCondition.maxExecutionCount) : condition.maxExecutionCount,
              expiredAt: updatedExpiredAt ?? condition.expiredAt,
              options: updatedOptions ?? condition.options,
              updatedAt: response.data?.updatedAt ?? condition.updatedAt,
            }
            : condition,
        ),
      );

      setEditingCondition((prev) =>
        prev
          ? {
              ...prev,
              updatedAt: response.data?.updatedAt ?? prev.updatedAt,
            }
          : prev,
      );

      setIsEditModalOpen(false);
    } catch (error: unknown) {
      const errorResponse = getConditionApiErrorResponse(error);

      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        if (shouldReloadConditionList(errorResponse?.error?.code)) {
          await reloadConditionList();
          closeEditModal();
        }

        handleConditionError(error, '조건 수정에 실패했습니다. 잠시 후 다시 시도하세요.', { closeModalOnStale: true });
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // 검색 버튼은 현재 필터 상태를 유지한 채 검색어만 서버에 반영한다.
    await loadConditions(undefined, searchKeyword);
  };

  const handleClearSearch = async () => {
    setSearchKeyword('');
    await loadConditions(undefined, '');
  };

  const handleResetFilters = async () => {
    setSearchKeyword('');
    setFilterState(defaultFilterState);
    await loadConditions(defaultFilterState, '');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewCondition({
      platform: '',
      keyword: '',
      maxPrice: '',
      mode: 'ALERT_ONLY',
      maxExecutionCount: '',
      // 모달을 닫을 때도 연도 기본값은 비워 둔다.
      expiryYear: '',
      expiryMonth: '',
      expiryDay: '',
      flightType: '',
      tripType: '',
    });
  };

  const handleAddCondition = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = getAddValidationMessage();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    // 폼 값을 백엔드가 요구하는 POST /api/conditions 스키마로 변환한다.
    const options = isAirlinePlatform(newCondition.platform)
      ? {
          flight_type: newCondition.flightType.trim(),
          trip_type: newCondition.tripType.trim(),
        }
      : undefined;

    const maxExecutionCount = newCondition.maxExecutionCount.trim()
      ? Number(newCondition.maxExecutionCount)
      : undefined;
    const expiredAt =
      newCondition.expiryYear && newCondition.expiryMonth && newCondition.expiryDay
        ? getExpiryDateText()
        : undefined;

    const payload: ConditionCreateRequest = {
      commandId: getNextCommandId(),
      platform: newCondition.platform.trim(),
      keyword: newCondition.keyword.trim(),
      maxPrice: Number(newCondition.maxPrice),
      mode: newCondition.mode,
      // 2026-05-06: maxExecutionCount, expiredAt, options는 입력된 값이 있을 때만 서버로 전송한다.
      ...(maxExecutionCount != null ? { maxExecutionCount } : {}),
      ...(expiredAt ? { expiredAt } : {}),
      ...(options ? { options } : {}),
    };

    try {
      setIsSubmitting(true);
      setServerErrorMessage('');
      // 서버 응답이 와야만 새 조건을 목록에 추가한다.
      const response = await createConditionRegistration(payload);
      // 2026-05-06: 조건 등록 성공 메시지는 서버 응답 바디의 message를 우선 사용한다.
      if (response.message) {
        alert(response.message);
      }
      const createdCondition = buildCreatedCondition(response, payload);

      setConditions((prev) => [createdCondition, ...prev]);
      closeModal();
    } catch (error: unknown) {
      const errorResponse = getConditionApiErrorResponse(error);
      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        handleConditionError(error, '조건 등록에 실패했습니다. 잠시 후 다시 시도하세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildCreatedCondition = (
    response: ConditionCreateResponse,
    payload: ConditionCreateRequest,
  ): ConditionCardItem => {
    if (response.conditionId == null) {
      throw new Error('conditionId is required in the create-condition response.');
    }

    // 응답에 일부 필드가 비어 있어도 방금 보낸 값으로 카드가 깨지지 않게 보정한다.
    return {
      conditionId: response.conditionId,
      commandId: response.commandId ?? payload.commandId,
      platform: response.platform ?? payload.platform,
      keyword: response.keyword ?? payload.keyword,
      currentPrice: response.currentPrice ?? payload.maxPrice,
      maxPrice: response.maxPrice ?? payload.maxPrice,
      mode: response.mode ?? payload.mode,
      maxExecutionCount: response.maxExecutionCount ?? payload.maxExecutionCount,
      expiredAt: response.expiredAt ?? payload.expiredAt,
      options: response.options ?? payload.options,
      isActive: response.isActive ?? true,
    };
  };

  const getAddValidationMessage = () => {
    if (!newCondition.platform.trim()) return '플랫폼을 입력하세요.';
    if (!newCondition.keyword.trim()) return '검색 키워드를 입력하세요.';
    if (!newCondition.maxPrice.trim()) return '목표가를 입력하세요.';

    if (
      isAirlinePlatform(newCondition.platform) &&
      (!newCondition.flightType.trim() || !newCondition.tripType.trim())
    ) {
      return '항공권 조건은 비행 종류와 여정 유형을 모두 입력하세요.';
    }

    if (
      Boolean(newCondition.expiryYear || newCondition.expiryMonth || newCondition.expiryDay) &&
      !(newCondition.expiryYear && newCondition.expiryMonth && newCondition.expiryDay)
    ) {
      return '만료일은 연/월/일을 모두 선택하세요.';
    }

    return '';
  };

  const getEditValidationMessage = () => {
    if (!editingCondition) return '';
    if (!editingCondition.maxPrice.trim()) return '목표 최대가를 입력하세요.';

    if (
      isAirlinePlatform(editingCondition.platform) &&
      (!editingCondition.flightTypeText?.trim() || !editingCondition.tripTypeText?.trim())
    ) {
      return '항공권 조건은 비행 종류와 여정 유형을 모두 입력하세요.';
    }

    if (
      Boolean(editingCondition.editExpiryYearText || editingCondition.editExpiryMonthText || editingCondition.editExpiryDayText) &&
      !(editingCondition.editExpiryYearText && editingCondition.editExpiryMonthText && editingCondition.editExpiryDayText)
    ) {
      return '만료일은 연/월/일을 모두 선택하세요.';
    }

    return '';
  };

  const isAddButtonDisabled = isSubmitting;
  const liveEditingPriceDiff = editingCondition
    ? calculatePriceDiff(editingCondition.currentPrice, Number(editingCondition.maxPrice))
    : undefined;

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-screen font-sans">
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto flex flex-col h-full">
        
        {/* 헤더 및 검색 */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between px-2 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#111827] dark:text-slate-50 tracking-tight">조건 관리</h1>
            <p className="text-[#6b7280] dark:text-slate-400 mt-1 font-medium">모니터링 조건을 세밀하게 설정하고 관리하세요.</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <form className="relative w-full md:w-80" onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="상품명 검색"
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl outline-none focus:border-[#6366F1] dark:focus:border-indigo-400 transition-colors placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 dark:text-slate-50 h-10"
              />
              {searchKeyword.trim() && (
                <button
                  type="button"
                  onClick={() => void handleClearSearch()}
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-slate-100 hover:text-[#475569] dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  aria-label="검색어 지우기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* 필터 드롭다운 (결제내역 필터와 동일한 스타일) */}
        <div className="mb-6 flex items-center gap-2 flex-wrap px-2">
          <Select
            value={filterState.platform}
            onValueChange={(value: string) => {
              setFilterState((prev) => ({ ...prev, platform: value }));
              void loadConditions({ platform: value });
            }}
          >
            <SelectTrigger className="w-[130px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3">
              <SelectValue placeholder="전체 플랫폼" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">전체 플랫폼</SelectItem>
              {['naver', 'aliexpress', 'naver_flight']
                .filter((platform) => platform !== 'ALL')
                .map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {getPlatformName(platform)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select
            value={filterState.isActive}
            onValueChange={(value: string) => {
              setFilterState((prev) => ({ ...prev, isActive: value as 'ALL' | 'true' | 'false' }));
              void loadConditions({ isActive: value as 'ALL' | 'true' | 'false' });
            }}
          >
            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3">
              <SelectValue placeholder="전체 상태" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">전체 상태</SelectItem>
              <SelectItem value="true">활성</SelectItem>
              <SelectItem value="false">비활성</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterState.mode}
            onValueChange={(value: string) => {
              setFilterState((prev) => ({ ...prev, mode: value as 'ALL' | 'AUTO_PAYMENT' | 'ALERT_ONLY' }));
              void loadConditions({ mode: value as 'ALL' | 'AUTO_PAYMENT' | 'ALERT_ONLY' });
            }}
          >
            <SelectTrigger className="w-[125px] bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 text-xs sm:text-sm rounded-xl h-9 px-3">
              <SelectValue placeholder="전체 모드" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">전체 모드</SelectItem>
              <SelectItem value="ALERT_ONLY">알람</SelectItem>
              <SelectItem value="AUTO_PAYMENT">자동결제</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleResetFilters()}
              className="h-9 rounded-xl border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#475569] hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              필터 초기화
            </Button>
          )}
        </div>

        {isConditionsLoading && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#475569] shadow-[0_2px_12px_rgb(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#6366F1]" />
            조건을 불러오는 중입니다...
          </div>
        )}

        {serverErrorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverErrorMessage}
          </div>
        )}

        {/* 메인 리스트 컨테이너 (Dashboard의 Bento Grid 템플릿 사용) */}
        <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* [수정] 필터 결과가 없을 때 안내 문구 표시 */}
            {!isConditionsLoading && conditions.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 rounded-[1.5rem] border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)]">
                <div className="w-16 h-16 rounded-full bg-[#EEF2FF] dark:bg-indigo-500/10 border border-[#6366F1]/10 flex items-center justify-center mb-4 text-[#9ca3af] dark:text-slate-500">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-[#111827] dark:text-slate-50 mb-1">조건이 없습니다</h4>
                <p className="text-[#6b7280] dark:text-slate-400">검색/필터 조건에 맞는 모니터링 항목을 찾을 수 없습니다.</p>
              </div>
            )}

            {isConditionsLoading && conditions.length === 0 &&
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`condition-skeleton-${index}`}
                  className="h-full min-h-[280px] animate-pulse rounded-[1.5rem] border border-[#E2E8F0] bg-white p-6 shadow-[0_2px_12px_rgb(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-[#E2E8F0] pb-3 dark:border-slate-700/60">
                    <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-700" />
                      <div className="h-5 w-14 rounded-md bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-3 px-1">
                    <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-7 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="ml-auto h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="ml-auto h-5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                    <div className="mt-4 h-6 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}

            {/* 새 조건 추가 카드 */}
            <button
              type="button"
              className="h-full min-h-[280px] bg-[#F8FAFC] dark:bg-slate-900 border-2 border-dashed border-[#d1d5db] rounded-[1.5rem] p-6 flex flex-col items-center justify-center hover:border-[#6366F1]/50 hover:bg-[#EEF2FF]/50 transition-all cursor-pointer group shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAFC] dark:focus-visible:ring-offset-slate-950"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center mb-4 group-hover:bg-[#6366F1] group-hover:border-[#6366F1] transition-colors">
                <Plus className="w-6 h-6 text-[#9ca3af] dark:text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[#4b5563] dark:text-slate-300 font-bold text-base group-hover:text-[#4F46E5] transition-colors">
                새 조건 등록
              </p>
              <p className="text-[#9ca3af] dark:text-slate-500 text-xs mt-1 group-hover:text-[#6366F1]/80">클릭하여 모니터링 직접 설정</p>
            </button>

            {/* 카드 렌더링 (Dashboard 리스트와 동일한 스타일 사용) */}
            {conditions.map((condition) => {
              const priceDiff = calculatePriceDiff(condition.currentPrice, condition.maxPrice);
              const isSatisfied = isConditionSatisfied(priceDiff);

              return (
                <div
                  key={condition.conditionId}
                  className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] p-6 shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(15,23,42,0.08)] transition-all duration-200 flex h-full flex-col group relative"
                >
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3 dark:border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={condition.isActive}
                        disabled={isTogglingConditionId === condition.conditionId}
                        onCheckedChange={(checked) => handleToggleCondition(condition.conditionId, Boolean(checked))}
                      />
                      <span className={`text-xs font-bold ${condition.isActive ? 'text-[#059669] dark:text-emerald-400' : 'text-[#94A3B8] dark:text-slate-500'}`}>
                        <Circle className="mr-1 inline-block h-2 w-2" fill="currentColor" />
                        {condition.isActive ? '가동 중' : '중지됨'}
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: `${getPlatformColor(condition.platform)}15`,
                          color: getPlatformColor(condition.platform),
                          borderColor: `${getPlatformColor(condition.platform)}30`,
                        }}
                      >
                        {getPlatformName(condition.platform)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`border-transparent px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${condition.mode === 'AUTO_PAYMENT' ? 'bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-[#fef3c7] text-[#b45309] dark:bg-[#b45309]/10 dark:text-[#fef3c7]'}`}
                      >
                        {condition.mode === 'AUTO_PAYMENT' ? '자동 결제' : '알람'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col rounded-2xl text-left">
                    <div className="mb-5 px-1">
                      <p className="h-[3.25rem] line-clamp-2 text-lg font-bold leading-snug text-[#111827] transition-colors group-hover:text-[#6366F1] dark:text-slate-50">{condition.keyword}</p>
                      <p className="mt-1.5 min-h-[1.25rem] line-clamp-1 text-sm text-[#6b7280] dark:text-slate-400">{formatOptions(condition.options)}</p>
                    </div>

                    <div className="mt-auto rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[#6366F1] text-[10px] uppercase font-bold tracking-wider mb-1">현재 수집가</p>
                          <p className="text-[#111827] dark:text-slate-50 font-black text-2xl">
                            {condition.currentPrice != null ? formatPrice(condition.currentPrice) : '수집 전'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#9ca3af] dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">목표가</p>
                          <p className="text-[#475569] dark:text-slate-300 font-semibold text-base">{formatPrice(condition.maxPrice)}</p>
                          {condition.currentPrice != null && priceDiff != null && (
                            <p className={`mt-2 text-xs font-bold ${isSatisfied ? 'text-[#059669] dark:text-emerald-400' : 'text-[#D97706] dark:text-amber-300'}`}>
                              {getPriceDiffSummaryText(priceDiff)}
                            </p>
                          )}
                        </div>
                      </div>

                      {condition.currentPrice != null && (
                        <div className="mt-4 flex justify-start">
                          <Badge
                            variant="outline"
                            className={`border-none px-3 py-1 rounded-lg text-xs font-bold ${
                              isSatisfied
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                            }`}
                          >
                            {getConditionStatusLabel(priceDiff)}
                          </Badge>
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => void openDetailModal(condition)}
                      className="group/btn -ml-2 flex items-center gap-1 rounded-lg bg-transparent px-2 py-1.5 text-sm font-bold text-[#475569] transition-colors hover:bg-[#EEF2FF] hover:text-[#6366F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 dark:focus-visible:ring-offset-slate-800"
                    >
                      상세 보기
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="조건 삭제"
                      onClick={() => void handleDeleteCondition(condition.conditionId)}
                      className="-mr-2 inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

      </div>



      {/* 모달 공통/기존 로직 유지 */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if(!open) closeModal(); }}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-[#E2E8F0] dark:border-slate-700">
          <form onSubmit={handleAddCondition}>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">새 조건 등록</DialogTitle>
              <DialogDescription className="text-[#475569] dark:text-slate-400">
                새로운 모니터링 조건을 설정합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 pb-2 mt-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">플랫폼</Label>
                <input
                  value={newCondition.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                  placeholder="예: 네이버 항공권"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">검색 키워드</Label>
                <input
                  value={newCondition.keyword}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, keyword: e.target.value }))}
                  className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                  placeholder="예: 인천-도쿄"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">목표가</Label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newCondition.maxPrice}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 pr-8 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                      placeholder="예: 250000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8] dark:text-slate-500 font-semibold">원</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">최대 결제 횟수</Label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newCondition.maxExecutionCount}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, maxExecutionCount: e.target.value }))}
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 pr-8 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                      placeholder="미입력 시 무제한"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8] dark:text-slate-500 font-semibold">회</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">알림 모드</Label>
                <div className="grid grid-cols-2 gap-3">
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
                        ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20 rounded-xl h-11'
                        : 'border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-900 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl h-11'
                    }
                  >
                    알람 전용
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
                        ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-500/10 rounded-xl h-11'
                        : 'border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-900 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl h-11'
                    }
                  >
                    자동 결제
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">만료일</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={newCondition.expiryYear}
                    onValueChange={(value: string) =>
                      setNewCondition((prev) => ({
                        ...prev,
                        expiryYear: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11">
                      <SelectValue placeholder="연도" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getYearOptions().map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newCondition.expiryMonth}
                    onValueChange={(value: string) =>
                      setNewCondition((prev) => ({
                        ...prev,
                        expiryMonth: value,
                        expiryDay: '',
                      }))
                    }
                  >
                    <SelectTrigger
                      className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11"
                      disabled={!newCondition.expiryYear}
                    >
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newCondition.expiryDay}
                    onValueChange={(value: string) =>
                      setNewCondition((prev) => ({
                        ...prev,
                        expiryDay: value,
                      }))
                    }
                  >
                    <SelectTrigger
                      className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11"
                      disabled={!newCondition.expiryYear || !newCondition.expiryMonth}
                    >
                      <SelectValue placeholder="일" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDayOptions(newCondition.expiryYear, newCondition.expiryMonth).map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}일
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isAirlinePlatform(newCondition.platform) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">비행 종류</Label>
                    <input
                      value={newCondition.flightType}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, flightType: e.target.value }))}
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                      placeholder="예: 직항"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">여정 유형</Label>
                    <input
                      value={newCondition.tripType}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, tripType: e.target.value }))}
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                      placeholder="예: 왕복"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-700">
              <Button type="button" variant="outline" onClick={closeModal} className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">
                취소
              </Button>
              <Button
                type="submit"
                disabled={isAddButtonDisabled}
                className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-[0_4px_10px_rgba(99,102,241,0.25)] border-none font-bold"
              >
                {isAddButtonDisabled ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-[#E2E8F0] dark:border-slate-700">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">조건 삭제</DialogTitle>
            <DialogDescription className="text-[#475569] dark:text-slate-400">
              {deleteTarget ? `'${deleteTarget.keyword}' 조건을 삭제할까요?` : '선택한 조건을 삭제할까요?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void confirmDeleteCondition()}
              className="rounded-xl px-6 py-2 bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.2)] border-none font-bold"
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 정보 확인 (읽기 전용 모달) */}
      {editingCondition && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4 transition-all">
          <div className="w-full max-w-2xl rounded-3xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-slate-800 px-8 py-5 bg-[#F8FAFC] dark:bg-slate-900">
              <h2 className="text-xl font-bold text-[#111827] dark:text-slate-50">상세 보기</h2>
              <button type="button" onClick={closeEditModal} className="text-[#9ca3af] dark:text-slate-500 hover:text-[#111827] dark:text-slate-50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-8 py-6 max-h-[80vh] overflow-y-auto overflow-x-hidden">
              <div className="flex flex-col gap-4 pb-4 border-b border-[#E2E8F0] dark:border-slate-700/60 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className="text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm border"
                      style={{
                        backgroundColor: `${getPlatformColor(editingCondition.platform)}15`,
                        color: getPlatformColor(editingCondition.platform),
                        borderColor: `${getPlatformColor(editingCondition.platform)}30`,
                      }}
                    >
                      {getPlatformName(editingCondition.platform)}
                    </span>
                    <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold ${editingCondition.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-[#94a3b8] text-[#94a3b8] dark:text-slate-500 bg-white dark:bg-slate-800'}`}>
                      {editingCondition.isActive ? '모니터링 활성' : '모니터링 비활성'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-[#0f172a] dark:text-slate-50 leading-snug">{editingCondition.keyword}</h3>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wider">알람 모드</p>
                  <div className="flex gap-2">
                    {editingCondition.mode === 'ALERT_ONLY' ? (
                      <Badge className="border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] rounded-xl h-8 px-4 text-xs font-bold border">알람 전용</Badge>
                    ) : (
                      <Badge className="border-[#6366F1] bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-500/10 rounded-xl h-8 px-4 text-xs font-bold border">자동 결제</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl border border-[#E2E8F0] dark:border-slate-700 p-5">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 mb-1 uppercase tracking-wide">현재 수집가</p>
                  <p className="text-lg font-black text-[#6366F1]">{editingCondition.currentPrice != null ? formatPrice(editingCondition.currentPrice) : '수집 전'}</p>
                </div>
                <div className="w-px h-10 bg-[#E2E8F0] dark:border-slate-700"></div>
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">목표 최대가</p>
                  <p className="text-lg font-black text-[#0f172a] dark:text-slate-50">{formatPrice(Number(editingCondition.maxPrice))}</p>
                </div>
                <div className="w-px h-10 bg-[#E2E8F0] dark:border-slate-700"></div>
                <div className="text-center flex-1 flex flex-col items-center">
                  <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 mb-1 uppercase tracking-wide">목표가 차이</p>
                  <p className={`text-base font-black ${isConditionSatisfied(liveEditingPriceDiff) ? 'text-[#059669] dark:text-emerald-400' : 'text-[#D97706] dark:text-amber-300'}`}>
                    {liveEditingPriceDiff != null ? formatPrice(liveEditingPriceDiff) : '계산 불가'}
                  </p>
                  {liveEditingPriceDiff != null && (
                    <Badge variant="outline" className={`mt-2 border-none px-3 py-1 rounded-lg text-xs font-bold ${isConditionSatisfied(liveEditingPriceDiff) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                      {getConditionStatusLabel(liveEditingPriceDiff)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-[#E2E8F0] dark:border-slate-700 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wide mb-1">결제 회수</p>
                    <p className="text-sm font-bold text-[#0f172a] dark:text-slate-50">현재 {editingCondition.currentExecutionCount ?? 0}회 / 최대 {editingCondition.maxExecutionCount.trim() ? `${editingCondition.maxExecutionCount}회` : '제한 없음'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wide mb-1">만료일</p>
                    <p className="text-sm font-bold text-[#0f172a] dark:text-slate-50">{editingCondition.expiredAt ? formatDateTimeText(editingCondition.expiredAt) : '만료일 없음'}</p>
                    <p className="text-[11px] text-[#64748b] mt-0.5">최근 확인: {formatDateTimeText(editingCondition.lastCheckedAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94a3b8] dark:text-slate-500 uppercase tracking-wide mb-1">메타</p>
                    <p className="text-[11px] text-[#64748b]">생성일: {formatDateTimeText(editingCondition.createdAt)}</p>
                    <p className="text-[11px] text-[#64748b]">수정일: {formatDateTimeText(editingCondition.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {isAirlinePlatform(editingCondition.platform) && (
                <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900 p-4">
                  <p className="text-[10px] font-bold text-[#64748b] mb-3 uppercase tracking-wide">세부 옵션</p>
                  <div className="flex gap-4">
                    <p className="text-sm font-bold text-[#0f172a] dark:text-slate-50">
                      <span className="text-[#64748b] mr-2 font-normal">비행 종류:</span>
                      {editingCondition.flightTypeText || editingCondition.options?.flight_type || '-'}
                    </p>
                    <p className="text-sm font-bold text-[#0f172a] dark:text-slate-50">
                      <span className="text-[#64748b] mr-2 font-normal">여정 종류:</span>
                      {editingCondition.tripTypeText || editingCondition.options?.trip_type || '-'}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-5 border-t border-[#F1F5F9] dark:border-slate-800">
                <label className="mb-3 block text-sm font-bold text-[#4b5563] dark:text-slate-300">가격 변동 추이</label>
                <div className="space-y-4">
                  <MiniPriceChart recentPrices={editingCondition.recentPrices} />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#F1F5F9] dark:border-slate-800 pt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 text-[#4b5563] dark:text-slate-300 font-bold hover:bg-[#e5e7eb] transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="rounded-full px-6 py-2.5 bg-[#6366F1] text-white font-bold hover:bg-[#4F46E5] shadow-[0_2px_10px_rgba(99,102,241,0.3)] transition-colors"
                >
                  수정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 조건 수정 모달 */}
      <Dialog open={!!editingCondition && isEditModalOpen} onOpenChange={(open) => { if(!open) handleCancelEdit(); }}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-[#E2E8F0] dark:border-slate-700">
          {editingCondition && (
          <form onSubmit={handleSaveEditCondition}>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">조건 수정</DialogTitle>
              <DialogDescription className="text-[#475569] dark:text-slate-400">
                선택한 모니터링 조건을 수정합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 pb-2 mt-2 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm border"
                  style={{
                    backgroundColor: `${getPlatformColor(editingCondition.platform)}15`,
                    color: getPlatformColor(editingCondition.platform),
                    borderColor: `${getPlatformColor(editingCondition.platform)}30`,
                  }}
                >
                  {getPlatformName(editingCondition.platform)}
                </span>
                <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold ${editingCondition.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-[#94a3b8] text-[#94a3b8] dark:text-slate-500 bg-white dark:bg-slate-800'}`}>
                  {editingCondition.isActive ? '모니터링 활성' : '모니터링 비활성'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">알람 모드</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCondition((prev) => (prev ? { ...prev, mode: 'ALERT_ONLY' } : prev))}
                    className={editingCondition.mode === 'ALERT_ONLY' ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20 rounded-xl h-11' : 'border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-900 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl h-11'}
                  >
                    알람 전용
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCondition((prev) => (prev ? { ...prev, mode: 'AUTO_PAYMENT' } : prev))}
                    className={editingCondition.mode === 'AUTO_PAYMENT' ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1] dark:bg-indigo-500/10 hover:bg-[#EEF2FF]/80 dark:hover:bg-indigo-500/20 rounded-xl h-11' : 'border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-900 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl h-11'}
                  >
                    자동 결제
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">목표 최대가</Label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    value={editingCondition.maxPrice}
                    onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, maxPrice: e.target.value } : prev))}
                    className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#6366F1]/40 rounded-xl px-4 py-3 pr-8 text-sm font-black text-[#4F46E5] focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8] dark:text-slate-500 font-semibold">원</span>
                </div>
                <p className="mt-1 text-xs text-[#64748b]">현재 기준가: {editingCondition.currentPrice != null ? formatPrice(editingCondition.currentPrice) : '수집 전'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">최대 결제 횟수</Label>
                <div className="relative">
                  <input
                    type="number"
                    value={editingCondition.maxExecutionCount}
                    onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, maxExecutionCount: e.target.value } : prev))}
                    placeholder="미입력 시 무제한"
                    className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 pr-8 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8] dark:text-slate-500 font-semibold">회</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">만료일</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={editingCondition.editExpiryYearText ?? ''}
                    onValueChange={(value: string) =>
                      setEditingCondition((prev) =>
                        prev
                          ? {
                              ...prev,
                              editExpiryYearText: value,
                              editExpiryDayText: '',
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11">
                      <SelectValue placeholder="연도" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getYearOptions().map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={editingCondition.editExpiryMonthText ?? ''}
                    onValueChange={(value: string) =>
                      setEditingCondition((prev) =>
                        prev
                          ? {
                              ...prev,
                              editExpiryMonthText: value,
                              editExpiryDayText: '',
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger
                      className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11"
                      disabled={!editingCondition.editExpiryYearText}
                    >
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={editingCondition.editExpiryDayText ?? ''}
                    onValueChange={(value: string) =>
                      setEditingCondition((prev) => (prev ? { ...prev, editExpiryDayText: value } : prev))
                    }
                  >
                    <SelectTrigger
                      className="bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0f172a] dark:text-slate-50 rounded-xl h-11"
                      disabled={!editingCondition.editExpiryYearText || !editingCondition.editExpiryMonthText}
                    >
                      <SelectValue placeholder="일" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDayOptions(editingCondition.editExpiryYearText ?? '', editingCondition.editExpiryMonthText ?? '').map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}일
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isAirlinePlatform(editingCondition.platform) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">비행 종류</Label>
                    <input
                      value={editingCondition.flightTypeText ?? ''}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, flightTypeText: e.target.value } : prev))}
                      placeholder="예: 직항"
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#475569] dark:text-slate-400 text-sm font-semibold">여정 유형</Label>
                    <input
                      value={editingCondition.tripTypeText ?? ''}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, tripTypeText: e.target.value } : prev))}
                      placeholder="예: 왕복"
                      className="w-full bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0f172a] dark:text-slate-50 focus:border-[#6366F1] dark:focus:border-indigo-400 focus:ring-1 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30 transition-all outline-none"
                    />
                  </div>
                </div>
              )}
              
            </div>

            <DialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-700">
              <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit}
                className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-[0_4px_10px_rgba(99,102,241,0.25)] border-none font-bold"
              >
                {isSavingEdit ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
