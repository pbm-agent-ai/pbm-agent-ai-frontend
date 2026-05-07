import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, X, Search, Circle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { createConditionRegistration, deleteConditionDetail, fetchConditionDetail, fetchConditionList, pauseConditionDetail, resumeConditionDetail, updateConditionDetail } from '../api/condition';
import type {
  ConditionCardItem,
  ConditionCreateRequest,
  ConditionCreateResponse,
  ConditionDetailItem,
  ConditionListPagination,
  ConditionUpdateRequest,
} from '../types/condition.ts';

//필터 팝업에서 선택한 값을 관리하는 타입
type ConditionFilterState = { 
  platform: string;
  isActive: 'ALL' | 'true' | 'false';
  mode: 'ALL' | 'AUTO_PAYMENT' | 'ALERT_ONLY';
};

type ConditionQueryState = ConditionFilterState & {
  page: number;
  size: number;
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
  maxExecutionCount?: number;
  maxExecutionCountText?: string;
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

  return { year, month, day };
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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTogglingConditionId, setIsTogglingConditionId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterState, setFilterState] = useState<ConditionFilterState>({
    platform: 'ALL',
    isActive: 'ALL',
    mode: 'ALL',
  });
  const [queryState, setQueryState] = useState<ConditionQueryState>({
    platform: 'ALL',
    isActive: 'ALL',
    mode: 'ALL',
    page: 0,
    size: 10,
  });
  const [pagination, setPagination] = useState<ConditionListPagination>({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
  });
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

  type ConditionListQueryParams = Partial<ConditionQueryState>;

  // 2026-05-06: 조건 목록 조회에 page/size를 붙여 서버 페이지네이션을 함께 사용한다.
  const loadConditions = async (nextParams?: ConditionListQueryParams) => {
    const mergedParams: ConditionQueryState = {
      platform: nextParams?.platform ?? filterState.platform,
      isActive: nextParams?.isActive ?? filterState.isActive,
      mode: nextParams?.mode ?? filterState.mode,
      page: nextParams?.page ?? queryState.page,
      size: nextParams?.size ?? queryState.size,
    };
    // 검색과 필터는 따로 저장하되, 서버 조회할 때는 항상 둘을 함께 묶어서 보낸다.
    // 그래서 검색 후 필터를 눌러도, 필터 후 검색을 해도 같은 기준으로 다시 조회된다.
    const keyword = searchKeyword.trim();

    try {
      setServerErrorMessage('');
      // 검색어와 필터 값을 쿼리스트링으로 보내 서버에서 조건 목록을 다시 받아온다.
      const response = await fetchConditionList({
        keyword: keyword || undefined,
        platform: mergedParams.platform === 'ALL' ? undefined : mergedParams.platform,
        isActive: mergedParams.isActive === 'ALL' ? undefined : mergedParams.isActive === 'true',
        mode: mergedParams.mode === 'ALL' ? undefined : mergedParams.mode,
        page: mergedParams.page,
        size: mergedParams.size,
      });

      setConditions(response.data.conditions);
      setFilterState({
        platform: mergedParams.platform,
        isActive: mergedParams.isActive,
        mode: mergedParams.mode,
      });
      setQueryState(mergedParams);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalElements: response.data.totalElements,
      });
    } catch (error: unknown) {
      // 2026-05-06: 서버 조회에 실패하면 개발용 예시 조건을 대신 보여준다.
      const errorResponse = getConditionApiErrorResponse(error);
      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert(getConditionListErrorMessage(error));
      }
      setConditions(exampleConditions);
      setPagination({ currentPage: 0, totalPages: 1, totalElements: exampleConditions.length });
    }
  };

  useEffect(() => {
    void loadConditions({ page: 0, size: queryState.size });
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
  const getCommonConditionErrorMessage = (errorCode?: string, errorMessage?: string) => {
    if (errorCode === 'AUTH004') {
      return errorMessage ?? '인증 토큰이 필요합니다.';
    }

    if (errorCode === 'AUTH007') {
      return errorMessage ?? 'Access Token이 만료되었습니다.';
    }

    if (errorCode === 'SERVER001') {
      return errorMessage ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    return null;
  };

  // 2026-05-06: 조건 목록 조회 실패는 조회 전용 에러 코드에 따라 메시지를 분기한다.
  const getConditionListErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    if (!errorCode) {
      return '조건 목록 조회에 실패했습니다. 잠시 후 다시 시도하세요.';
    }

    // if (errorCode === 'VALIDATION001') {
    //   return errorMessage ?? '올바르지 않은 플랫폼값입니다.';
    // }

    // if (errorCode === 'VALIDATION002') {
    //   return errorMessage ?? '올바르지 않은 모드값입니다.';
    // }

    // if (errorCode === 'VALIDATION003') {
    //   return errorMessage ?? '페이지 번호는 0 이상이어야 합니다.';
    // }

    // if (errorCode === 'VALIDATION004') {
    //   return errorMessage ?? '페이지 크기는 1 이상 100 이하여야 합니다.';
    // }

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    return errorMessage ?? '조건 목록 조회에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 조건 등록 실패는 서버 에러 코드에 따라 다른 메시지로 안내한다.
  const getConditionRegistrationErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;
    const missingFields = errorResponse?.error?.detail?.missingFields;

    if (!errorCode) {
      return '조건 등록에 실패했습니다. 잠시 후 다시 시도하세요.';
    }

    if (errorCode === 'VALIDATION001') {
      return missingFields && missingFields.length > 0
        ? `${errorMessage ?? '필수 입력값이 누락되었습니다.'} (${missingFields.join(', ')})`
        : errorMessage ?? '필수 입력값이 누락되었습니다.';
    }

    if (errorCode === 'VALIDATION002') {
      return errorMessage ?? '올바르지 않은 플랫폼값입니다.';
    }

    // if (errorCode === 'VALIDATION003') {
    //   return errorMessage ?? '올바르지 않은 모드값입니다.';
    // }

    if (errorCode === 'VALIDATION004') {
      return errorMessage ?? '목표 가격은 0원보다 커야 합니다.';
    }

    if (errorCode === 'VALIDATION005') {
      return errorMessage ?? '만료일은 현재 시간 이후여야 합니다.';
    }

    if (errorCode === 'COMMAND002') {
      return errorMessage ?? '존재하지 않는 명령입니다.';
    }

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    return errorMessage ?? '조건 등록에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 조건 상세 조회는 CONDITION 전용 에러 코드에 따라 메시지를 분기한다.
  const getConditionDetailErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    if (errorCode === 'CONDITION001') {
      return errorMessage ?? '존재하지 않는 조건입니다.';
    }

    if (errorCode === 'CONDITION004') {
      return errorMessage ?? '해당 조건에 접근할 권한이 없습니다.';
    }

    return errorMessage ?? '조건 상세 조회에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 조건 수정 실패는 서버가 내려준 메시지를 우선 그대로 보여준다.
  const getConditionUpdateErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    if (!errorCode) {
      return '조건 수정에 실패했습니다. 잠시 후 다시 시도하세요.';
    }

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    if (errorCode === 'VALIDATION001') {
      return errorMessage ?? '목표 가격은 0원보다 커야 합니다.';
    }

    if (errorCode === 'VALIDATION002') {
      return errorMessage ?? '올바르지 않은 모드값입니다. ALERT_ONLY / AUTO_PAYMENT 중 하나를 입력해주세요';
    }

    if (errorCode === 'VALIDATION003') {
      return errorMessage ?? '만료일은 현재 시간 이후여야 합니다.';
    }

    if (errorCode === 'VALIDATION004') {
      return errorMessage ?? '수정할 항목을 하나 이상 입력해주세요';
    }

    if (errorCode === 'CONDITION004') {
      return errorMessage ?? '해당 조건에 접근할 권한이 없습니다.';
    }

    if (errorCode === 'CONDITION001') {
      return errorMessage ?? '존재하지 않는 조건입니다.';
    }

    if (errorCode === 'CONDITION002') {
      return errorMessage ?? '완료된 조건은 수정할 수 없습니다.';
    }

    return errorMessage ?? '조건 수정에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 조건 삭제는 공통 오류와 삭제 전용 조건 오류를 분기한다.
  const getConditionDeleteErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    if (errorCode === 'CONDITION001') {
      return errorMessage ?? '존재하지 않는 조건입니다.';
    }

    if (errorCode === 'CONDITION004') {
      return errorMessage ?? '해당 조건에 접근할 권한이 없습니다.';
    }

    if (errorCode === 'CONDITION003') {
      return errorMessage ?? '이미 삭제된 조건입니다.';
    }

    return errorMessage ?? '조건 삭제에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 일시정지는 공통 오류와 일시정지 전용 조건 오류를 분기한다.
  const getConditionPauseErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    if (errorCode === 'CONDITION001') {
      return errorMessage ?? '존재하지 않는 조건입니다.';
    }

    if (errorCode === 'CONDITION004') {
      return errorMessage ?? '해당 조건에 접근할 권한이 없습니다.';
    }

    if (errorCode === 'CONDITION005') {
      return errorMessage ?? '이미 일시정지된 조건입니다.';
    }

    if (errorCode === 'CONDITION006') {
      return errorMessage ?? '완료되거나 삭제된 조건은 일시정지할 수 없습니다.';
    }

    return errorMessage ?? '조건 일시정지에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

  // 2026-05-06: 재개는 공통 오류와 재개 전용 조건 오류를 분기한다.
  const getConditionResumeErrorMessage = (error: unknown) => {
    const errorResponse = getConditionApiErrorResponse(error);
    const errorCode = errorResponse?.error?.code;
    const errorMessage = errorResponse?.error?.message;

    const commonMessage = getCommonConditionErrorMessage(errorCode, errorMessage);
    if (commonMessage) {
      return commonMessage;
    }

    if (errorCode === 'CONDITION001') {
      return errorMessage ?? '존재하지 않는 조건입니다.';
    }

    if (errorCode === 'CONDITION004') {
      return errorMessage ?? '해당 조건에 접근할 권한이 없습니다.';
    }

    if (errorCode === 'CONDITION007') {
      return errorMessage ?? '만료된 조건은 재개할 수 없습니다. 새 조건을 등록해주세요.';
    }

    if (errorCode === 'CONDITION008') {
      return errorMessage ?? '이미 모니터링 중인 조건입니다.';
    }

    if (errorCode === 'CONDITION009') {
      return errorMessage ?? '삭제된 조건은 재개할 수 없습니다.';
    }

    return errorMessage ?? '조건 재개에 실패했습니다. 잠시 후 다시 시도하세요.';
  };

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
    return Array.from({ length: 90 }, (_, index) => String(currentYear + index));
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

  const platformOptions = useMemo(() => {
    const platforms = Array.from(new Set(conditions.map((condition) => condition.platform)));
    return ['ALL', ...platforms];
  }, [conditions]);

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

        alert(checked ? getConditionResumeErrorMessage(error) : getConditionPauseErrorMessage(error));
      }
    } finally {
      setIsTogglingConditionId(null);
    }
  };

  // 2026-05-06: 카드 좌상단 X 버튼으로 조건을 삭제한다.
  const handleDeleteCondition = async (conditionId: number) => {
    const target = conditions.find((condition) => condition.conditionId === conditionId);
    if (!target) return;

    const confirmed = window.confirm(`'${target.keyword}' 조건을 삭제할까요?`);
    if (!confirmed) return;

    try {
      const response = await deleteConditionDetail(conditionId);

      if (response.message) {
        alert(response.message);
      }

      setConditions((prev) => prev.filter((condition) => condition.conditionId !== conditionId));
      setPagination((prev) => ({
        ...prev,
        totalElements: Math.max(0, prev.totalElements - 1),
      }));
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

        alert(getConditionDeleteErrorMessage(error));
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

  const getSortedRecentPrices = (recentPrices?: ConditionDetailItem['recentPrices']) => {
    if (!recentPrices || recentPrices.length === 0) {
      return [];
    }

    return [...recentPrices].sort(
      (left, right) => new Date(left.collectedAt).getTime() - new Date(right.collectedAt).getTime(),
    );
  };

  const MiniPriceChart = ({ recentPrices }: { recentPrices?: ConditionDetailItem['recentPrices'] }) => {
    const sampleRecentPrices: ConditionDetailItem['recentPrices'] = [
      { price: 271000, collectedAt: '2026-04-16T10:30:00' },
      { price: 275000, collectedAt: '2026-04-16T10:00:00' },
      { price: 268000, collectedAt: '2026-04-16T09:30:00' },
    ];

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
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#111827]">최근 수집 가격</p>
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
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#recentPriceAreaGradient)" />
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((item, index) => {
            const x = getX(index);
            const y = getY(item.price);

            return (
              <g key={`${item.collectedAt}-${index}`}>
                <circle cx={x} cy={y} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              </g>
            );
          })}
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {points.map((item, index) => (
            <div key={`${item.collectedAt}-${index}`} className="rounded-xl bg-[#f8fafc] px-3 py-2 text-center">
              <p className="text-[11px] font-semibold text-[#64748b]">{item.collectedAt.slice(11, 16)}</p>
              <p className="text-sm font-bold text-[#0f172a]">{formatPrice(item.price)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const openDetailModal = async (condition: ConditionCardItem) => {
    setIsEditing(false);
    const initialEditCondition: EditConditionForm = {
      conditionId: condition.conditionId,
      platform: condition.platform,
      keyword: condition.keyword,
      mode: condition.mode,
      currentPrice: condition.currentPrice,
      maxPrice: String(condition.maxPrice),
      priceDiff: calculatePriceDiff(condition.currentPrice, condition.maxPrice),
      currentExecutionCount: condition.maxExecutionCount,
      maxExecutionCount: condition.maxExecutionCount,
      maxExecutionCountText: condition.maxExecutionCount != null ? String(condition.maxExecutionCount) : '',
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
      recentPrices: [],
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
        maxExecutionCount: detail.maxExecutionCount,
        maxExecutionCountText: detail.maxExecutionCount != null ? String(detail.maxExecutionCount) : '',
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

        alert(getConditionDetailErrorMessage(error));
      }
    }
  };

  const closeEditModal = () => {
    setEditingCondition(null);
    setEditingConditionSnapshot(null);
    setIsEditing(false);
  };

  // 2026-05-06: 조건 오류가 나면 목록을 다시 받아 화면 상태를 서버 기준으로 맞춘다.
  const reloadConditionList = async (params?: Partial<ConditionQueryState>) => {
    await loadConditions({
      ...params,
      page: params?.page ?? queryState.page,
      size: params?.size ?? queryState.size,
    });
  };

  // 2026-05-06: 조건이 더 이상 유효하지 않다고 판단되는 에러는 목록을 다시 조회한다.
  const shouldReloadConditionList = (errorCode?: string) =>
    errorCode === 'CONDITION001' ||
    errorCode === 'CONDITION003' ||
    errorCode === 'CONDITION004' ||
    errorCode === 'CONDITION009';

  // 2026-05-06: 수정 모드 취소는 모달을 닫지 않고 원본 상세값으로 되돌린다.
  const cancelEditMode = () => {
    setEditingCondition(editingConditionSnapshot);
    setIsEditing(false);
  };

  // 상세 보기 창에서 수정 가능한 값만 저장한다.
  const handleSaveEditCondition = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCondition) {
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
      ...(editingCondition.maxExecutionCountText?.trim()
        ? { maxExecutionCount: Number(editingCondition.maxExecutionCountText) }
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
              maxExecutionCount: editingCondition.maxExecutionCountText?.trim()
                ? Number(editingCondition.maxExecutionCountText)
                : condition.maxExecutionCount,
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

      closeEditModal();
    } catch (error: unknown) {
      const errorResponse = getConditionApiErrorResponse(error);

      if (errorResponse?.error?.code === 'SERVER001') {
        setServerErrorMessage(errorResponse.error.message ?? '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        if (shouldReloadConditionList(errorResponse?.error?.code)) {
          await reloadConditionList();
          closeEditModal();
        }

        alert(getConditionUpdateErrorMessage(error));
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // 검색 버튼은 현재 필터 상태를 유지한 채 검색어만 서버에 반영한다.
    await loadConditions({ page: 0 });
  };

  const handleApplyFilter = async () => {
    // 필터 팝업에서 고른 조건을 현재 검색어와 함께 서버 조회에 적용한다.
    await loadConditions({ ...filterState, page: 0, size: queryState.size });
    setIsFilterModalOpen(false);
  };

  const handleResetFilter = async () => {
    const resetState: ConditionFilterState = {
      platform: 'ALL',
      isActive: 'ALL',
      mode: 'ALL',
    };

    // 필터 값과 검색어를 초기화한 뒤 서버 목록도 다시 처음 상태로 가져온다.
    setSearchKeyword('');
    setFilterState(resetState);
    await loadConditions({ ...resetState, page: 0, size: queryState.size });
    setIsFilterModalOpen(false);
  };

  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 0 || nextPage >= pagination.totalPages) {
      return;
    }

    await loadConditions({ page: nextPage });
  };

  const handlePageSizeChange = async (size: string) => {
    const nextSize = Number(size);
    if (Number.isNaN(nextSize) || nextSize <= 0) {
      return;
    }

    await loadConditions({ size: nextSize, page: 0 });
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

    // 서버에서 에러메세지를 입력 받는 방식을 추후 적용
    if (
      !newCondition.platform.trim() ||
      !newCondition.keyword.trim() ||
      !newCondition.maxPrice.trim()
    ) {
      alert('플랫폼, keyword, maxPrice, mode를 입력하세요.');
      return;
    }

    // 폼 값을 백엔드가 요구하는 POST /api/conditions 스키마로 변환한다.
    const options = isAirlinePlatform(newCondition.platform)
      ? {
          flight_type: newCondition.flightType.trim(),
          trip_type: newCondition.tripType.trim(),
        }
      : undefined;

    if (isAirlinePlatform(newCondition.platform)) {
      if (!newCondition.flightType.trim() || !newCondition.tripType.trim()) {
        alert('항공권 조건은 options.flight_type와 options.trip_type를 모두 입력하세요.');
        return;
      }
    }

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
        alert(getConditionRegistrationErrorMessage(error));
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

  const isAddButtonDisabled = isSubmitting;
  const liveEditingPriceDiff = editingCondition
    ? calculatePriceDiff(editingCondition.currentPrice, Number(editingCondition.maxPrice))
    : undefined;
  const editDisabled = !isEditing || isSavingEdit;

  return (
    <div className="w-full bg-[#eef2f6] min-h-screen font-sans">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto flex flex-col h-full">
        
        {/* 헤더 및 검색 */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between px-2 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">조건 관리</h1>
            <p className="text-[#6b7280] mt-1 font-medium">모니터링 조건을 세밀하게 설정하고 관리하세요.</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            {/* 검색창은 키워드만 입력받고, 실제 조회는 검색 버튼을 눌렀을 때 수행한다. */}
            <form className="relative w-full md:w-80" onSubmit={handleSearchSubmit}>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="키워드를 검색하세요..."
                className="w-full pl-10 pr-24 bg-[#f9fafb] border-transparent text-sm focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#10b981]/30 focus-visible:border-[#10b981] rounded-full h-11 transition-all outline-none"
              />
              <Button
                type="submit"
                variant="outline"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 rounded-full border-[#e5e7eb] bg-white px-4 text-[#047857] hover:bg-[#ecfdf5]"
              >
                검색
              </Button>
            </form>
            <Button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="h-11 rounded-full bg-[#111827] px-5 text-white hover:bg-[#0f172a]"
            >
              {/* 필터 버튼은 별도 팝업을 열어서 상세 조건을 선택하게 한다. */}
              필터
            </Button>
          </div>
        </div>

        {serverErrorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverErrorMessage}
          </div>
        )}

        {/* 메인 리스트 컨테이너 (Dashboard의 Bento Grid 템플릿 사용) */}
        <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-[#e5e7eb] flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* [수정] 필터 결과가 없을 때 안내 문구 표시 */}
            {conditions.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-[#f9fafb] rounded-2xl border border-dashed border-[#e5e7eb]">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-[#9ca3af]">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-[#111827] mb-1">조건이 없습니다</h4>
                <p className="text-[#6b7280]">검색/필터 조건에 맞는 모니터링 항목을 찾을 수 없습니다.</p>
              </div>
            )}

            {/* 카드 렌더링 (Dashboard 리스트와 동일한 스타일 사용) */}
            {conditions.map((condition) => (
              <div
                key={condition.conditionId}
                className="bg-[#f9fafb] border border-[#f3f4f6] rounded-2xl p-6 hover:bg-white hover:border-[#10b981]/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group relative"
                onClick={() => void openDetailModal(condition)}
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-label="조건 삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteCondition(condition.conditionId);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Badge
                      variant="outline"
                      className="border-none px-3 py-1 rounded-lg text-xs font-bold"
                      style={{
                        backgroundColor: condition.isActive ? '#10b98115' : '#f0a04015',
                        color: condition.isActive ? '#10b981' : '#f0a040',
                      }}
                    >
                      <Circle className="w-2 h-2 inline-block mr-1.5" fill="currentColor" />
                      {condition.isActive ? '가동 중' : '중지됨'}
                    </Badge>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="ml-auto flex items-center gap-3">
                    <span className="text-xs font-medium text-[#6b7280] bg-white px-2.5 py-1 rounded-md shadow-sm border border-[#e5e7eb]">
                      {condition.platform}
                    </span>
                    <Switch
                      checked={condition.isActive}
                      disabled={isTogglingConditionId === condition.conditionId}
                      onCheckedChange={(checked) => handleToggleCondition(condition.conditionId, Boolean(checked))}
                    />
                  </div>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-[#111827] font-bold text-lg leading-tight line-clamp-2 group-hover:text-[#10b981] transition-colors">{condition.keyword}</p>
                  {/* 2026-05-06: 옵션 정보를 다시 카드에 표시한다. */}
                  <p className="text-[#6b7280] text-sm mt-2 line-clamp-1">{formatOptions(condition.options)}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[#9ca3af] text-[10px] uppercase font-bold tracking-wider mb-0.5">목표가</p>
                      <p className="text-[#6b7280] font-semibold text-base">{formatPrice(condition.maxPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#10b981] text-[10px] uppercase font-bold tracking-wider mb-0.5">현재 수집가</p>
                      <p className="text-[#111827] font-black text-2xl">
                        {condition.currentPrice != null ? formatPrice(condition.currentPrice) : '수집 전'}
                      </p>
                    </div>
                  </div>

                  {condition.currentPrice != null && (
                    <div className="flex justify-start">
                      <Badge
                        variant="outline"
                        className={`border-none px-3 py-1 rounded-lg text-xs font-bold ${
                          isConditionSatisfied(calculatePriceDiff(condition.currentPrice, condition.maxPrice))
                            ? 'bg-[#d1fae5] text-[#047857]'
                            : 'bg-[#e2e8f0] text-[#475569]'
                        }`}
                      >
                        {getConditionStatusLabel(calculatePriceDiff(condition.currentPrice, condition.maxPrice))}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-[#e5e7eb] flex justify-between items-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${condition.mode === 'AUTO_PAYMENT' ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fef3c7] text-[#b45309]'}`}>
                      {condition.mode === 'AUTO_PAYMENT' ? '자동 결제' : '알람'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* 새 조건 추가 카드 (Dashboard 배너 호버 디자인 결합) */}
            <div
              className="bg-[#f9fafb] border-2 border-dashed border-[#d1d5db] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px] hover:border-[#10b981]/50 hover:bg-[#ecfdf5]/50 transition-all cursor-pointer group shadow-sm hover:shadow"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-[#e5e7eb] flex items-center justify-center mb-4 group-hover:bg-[#10b981] group-hover:border-[#10b981] transition-colors">
                <Plus className="w-6 h-6 text-[#9ca3af] group-hover:text-white transition-colors" />
              </div>
              <p className="text-[#4b5563] font-bold text-base group-hover:text-[#047857] transition-colors">
                새 조건 등록
              </p>
              <p className="text-[#9ca3af] text-xs mt-1 group-hover:text-[#10b981]/80">클릭하여 모니터링 직접 설정</p>
            </div>
          </div>

          {/* 2026-05-06: 하단에서 페이지 크기를 선택할 수 있도록 노출한다. */}
          <div className="mt-6 flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#6b7280]">페이지 크기</span>
              <Select value={String(queryState.size)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[110px] rounded-full bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-[#94a3b8]">총 {pagination.totalElements}개</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => void handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 0}
              >
                이전
              </Button>
              <span className="min-w-[96px] text-center text-sm font-semibold text-[#334155]">
                {pagination.currentPage + 1} / {Math.max(pagination.totalPages, 1)}
              </span>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => void handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage + 1 >= pagination.totalPages}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl border border-[#e5e7eb] p-0">
          <DialogHeader className="border-b border-[#f3f4f6] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#111827]">필터</DialogTitle>
            <DialogDescription className="text-[#6b7280]">
              플랫폼, 활성화 상태, 모드를 선택하면 서버 조회 조건에 반영된다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#4b5563]">플랫폼</label>
              <Select
                value={filterState.platform}
                onValueChange={(value: string) =>
                  setFilterState((prev) => ({
                    ...prev,
                    platform: value,
                  }))
                }
              >
                <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                  <SelectValue placeholder="전체 플랫폼" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 플랫폼</SelectItem>
                  {platformOptions
                    .filter((platform) => platform !== 'ALL')
                    .map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4b5563]">모니터링 활성화</label>
              <Select
                value={filterState.isActive}
                onValueChange={(value: 'ALL' | 'true' | 'false') =>
                  setFilterState((prev) => ({
                    ...prev,
                    isActive: value,
                  }))
                }
              >
                <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 상태</SelectItem>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#4b5563]">알람 모드</label>
              <Select
                value={filterState.mode}
                onValueChange={(value: 'ALL' | 'AUTO_PAYMENT' | 'ALERT_ONLY') =>
                  setFilterState((prev) => ({
                    ...prev,
                    mode: value,
                  }))
                }
              >
                <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                  <SelectValue placeholder="전체 모드" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 모드</SelectItem>
                  <SelectItem value="ALERT_ONLY">알람</SelectItem>
                  <SelectItem value="AUTO_PAYMENT">자동결제</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-[#f3f4f6] px-6 py-5">
            <Button type="button" variant="outline" onClick={handleResetFilter} className="rounded-full">
              초기화
            </Button>
            <Button type="button" onClick={handleApplyFilter} className="rounded-full bg-[#10b981] text-white hover:bg-[#059669]">
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 모달 공통/기존 로직 유지 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-all">
          <div className="w-full max-w-xl rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-8 py-5 bg-[#f9fafb]">
              <h2 className="text-xl font-bold text-[#111827]">새 조건 등록</h2>
              <button type="button" onClick={closeModal} className="text-[#9ca3af] hover:text-[#111827] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCondition} className="space-y-5 px-8 py-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#4b5563]">platform</label>
                <input
                  value={newCondition.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                  placeholder="예: naver_flight"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#4b5563]">keyword</label>
                <input
                  value={newCondition.keyword}
                  onChange={(e) => setNewCondition((prev) => ({ ...prev, keyword: e.target.value }))}
                  className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                  placeholder="예: ICN-TYO"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#4b5563]">maxPrice</label>
                  <input
                    type="number"
                    value={newCondition.maxPrice}
                    onChange={(e) => setNewCondition((prev) => ({ ...prev, maxPrice: e.target.value }))}
                    className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                    placeholder="예: 250000"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#4b5563]">maxExecutionCount</label>
                  <input
                    type="number"
                    value={newCondition.maxExecutionCount}
                    onChange={(e) => setNewCondition((prev) => ({ ...prev, maxExecutionCount: e.target.value }))}
                    className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                    placeholder="예: 1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#4b5563]">mode</label>
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
                        : 'rounded-xl h-11'
                    }
                  >
                    ALERT_ONLY
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
                        ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20 rounded-xl h-11'
                        : 'rounded-xl h-11'
                    }
                  >
                    AUTO_PAYMENT
                  </Button>
                </div>
              </div>

              <div>
                {/* 만료일은 연/월/일 드롭다운으로만 입력받는다. */}
                <label className="mb-2 block text-sm font-bold text-[#4b5563]">expiredAt</label>
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
                    <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                      <SelectValue placeholder="연도" />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* 월을 선택하면 일 목록이 해당 월 기준으로 다시 계산된다. */}
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
                    <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
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
                  {/* 연/월이 모두 있어야 일 선택지가 보이도록 처리한다. */}
                  <Select
                    value={newCondition.expiryDay}
                    onValueChange={(value: string) =>
                      setNewCondition((prev) => ({
                        ...prev,
                        expiryDay: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
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
                  <div>
                    {/* 2026-05-06: 항공권 조건은 options를 2개 입력값으로 받는다. */}
                    <label className="mb-2 block text-sm font-bold text-[#4b5563]">options.flight_type</label>
                    <input
                      value={newCondition.flightType}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, flightType: e.target.value }))}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                      placeholder="예: 직항"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#4b5563]">options.trip_type</label>
                    <input
                      value={newCondition.tripType}
                      onChange={(e) => setNewCondition((prev) => ({ ...prev, tripType: e.target.value }))}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none"
                      placeholder="예: 왕복"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-[#f3f4f6]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full px-6 py-2.5 bg-[#f3f4f6] text-[#4b5563] font-bold hover:bg-[#e5e7eb] transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-full px-6 py-2.5 bg-[#10b981] text-white font-bold hover:bg-[#059669] shadow-md shadow-[#10b981]/20 transition-colors"
                >
                  {isAddButtonDisabled ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상세 정보 확인 및 수정 모달 */}
      {editingCondition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-all">
          <div className="w-full max-w-2xl rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-8 py-5 bg-[#f9fafb]">
              <h2 className="text-xl font-bold text-[#111827]">상세 보기</h2>
              <button type="button" onClick={closeEditModal} className="text-[#9ca3af] hover:text-[#111827] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCondition} className="space-y-6 px-8 py-6 max-h-[80vh] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* 인라인 편집 구역 */}
              <div className="bg-[#f8fafc] rounded-2xl p-6 border border-[#e2e8f0] shadow-inner space-y-5">
                <div className="flex flex-col gap-4 pb-4 border-b border-[#e2e8f0]/60 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[10px] font-black uppercase text-[#64748b] bg-white border border-[#e2e8f0] px-2 py-1 rounded-md shadow-sm">
                        {editingCondition.platform}
                      </span>
                      <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold ${editingCondition.isActive ? 'border-[#10b981] text-[#10b981] bg-[#10b981]/10' : 'border-[#94a3b8] text-[#94a3b8] bg-white'}`}>
                        {editingCondition.isActive ? '모니터링 활성' : '모니터링 비활성'}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-black text-[#0f172a] leading-snug">{editingCondition.keyword}</h3>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">알람 모드</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={editDisabled}
                        onClick={() => setEditingCondition((prev) => (prev ? { ...prev, mode: 'ALERT_ONLY' } : prev))}
                        className={editingCondition.mode === 'ALERT_ONLY' ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20 rounded-xl h-10 transition-all disabled:opacity-60' : 'border-[#e2e8f0] rounded-xl h-10 text-[#64748b] bg-[#f8fafc] transition-all hover:bg-white hover:text-[#0f172a] disabled:opacity-60'}
                      >
                        알람 전용
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={editDisabled}
                        onClick={() => setEditingCondition((prev) => (prev ? { ...prev, mode: 'AUTO_PAYMENT' } : prev))}
                        className={editingCondition.mode === 'AUTO_PAYMENT' ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20 rounded-xl h-10 transition-all disabled:opacity-60' : 'border-[#e2e8f0] rounded-xl h-10 text-[#64748b] bg-[#f8fafc] transition-all hover:bg-white hover:text-[#0f172a] disabled:opacity-60'}
                      >
                        자동 결제
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <p className="text-[10px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wide">현재 수집가</p>
                    <p className="text-base font-black text-[#10b981]">{editingCondition.currentPrice != null ? formatPrice(editingCondition.currentPrice) : '수집 전'}</p>
                  </div>

                  <div className="rounded-xl border border-[#10b981]/30 bg-[#ecfdf5] p-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wide">목표 최대가</p>
                      <span className="text-[10px] font-bold text-[#10b981] bg-white border border-[#10b981]/20 px-2 py-0.5 rounded-md">
                        현재 기준가: {editingCondition.currentPrice != null ? formatPrice(editingCondition.currentPrice) : '수집 전'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="1000"
                      disabled={editDisabled}
                      value={editingCondition.maxPrice}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, maxPrice: e.target.value } : prev))}
                      className="w-full rounded-xl border border-[#10b981]/40 bg-white px-4 py-3 text-sm font-black text-[#047857] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b]"
                    />
                  </div>

                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <p className="text-[10px] font-bold text-[#94a3b8] mb-1 uppercase tracking-wide">목표가와의 차이</p>
                    <p className={`text-base font-black ${isConditionSatisfied(liveEditingPriceDiff) ? 'text-[#16a34a]' : 'text-[#f59e0b]'}`}>
                      {liveEditingPriceDiff != null ? formatPrice(liveEditingPriceDiff) : '계산 불가'}
                    </p>
                    {liveEditingPriceDiff != null && (
                      <div className="mt-2">
                        <Badge variant="outline" className={`border-none px-3 py-1 rounded-lg text-xs font-bold ${isConditionSatisfied(liveEditingPriceDiff) ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#e2e8f0] text-[#475569]'}`}>
                          {getConditionStatusLabel(liveEditingPriceDiff)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">현재 결제 회수</p>
                      <span className="text-[10px] font-bold text-[#64748b]">현재 {editingCondition.currentExecutionCount ?? 0}회</span>
                    </div>
                    <label className="mb-2 block text-sm font-bold text-[#4b5563]">최대 허용 횟수</label>
                    <input
                      type="number"
                      min="1"
                      disabled={editDisabled}
                      value={editingCondition.maxExecutionCountText ?? ''}
                      onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, maxExecutionCountText: e.target.value } : prev))}
                      placeholder="예: 2"
                      className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b]"
                    />
                  </div>

                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <label className="mb-2 block text-sm font-bold text-[#4b5563]">만료일</label>
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
                        <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] h-11" disabled={editDisabled}>
                          <SelectValue placeholder="연도" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] h-11" disabled={editDisabled}>
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
                          className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] h-11"
                          disabled={editDisabled || !editingCondition.editExpiryYearText || !editingCondition.editExpiryMonthText}
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
                    <p className="mt-2 text-[11px] text-[#64748b]">최근 확인: {formatDateTimeText(editingCondition.lastCheckedAt)}</p>
                  </div>

                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-2">메타 정보</p>
                    <div className="space-y-1 text-[11px] font-semibold text-[#64748b]">
                      <p>생성일: {formatDateTimeText(editingCondition.createdAt)}</p>
                      <p>마지막 수정일: {formatDateTimeText(editingCondition.updatedAt)}</p>
                    </div>
                  </div>

                  {isAirlinePlatform(editingCondition.platform) && (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 md:col-span-2">
                      <p className="text-[10px] font-bold text-[#64748b] mb-3 uppercase tracking-wide">세부 옵션</p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-[#4b5563]">options.flight_type</label>
                          <input
                            disabled={editDisabled}
                            value={editingCondition.flightTypeText ?? ''}
                            onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, flightTypeText: e.target.value } : prev))}
                            placeholder="예: 직항"
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b]"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-bold text-[#4b5563]">options.trip_type</label>
                          <input
                            disabled={editDisabled}
                            value={editingCondition.tripTypeText ?? ''}
                            onChange={(e) => setEditingCondition((prev) => (prev ? { ...prev, tripTypeText: e.target.value } : prev))}
                            placeholder="예: 왕복"
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#0f172a] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 최근 수집 가격 리스트 */}
              <div className="pt-5 border-t border-[#f3f4f6]">
                <label className="mb-3 block text-sm font-bold text-[#4b5563]">가격 변동 추이</label>
                <div className="space-y-4">
                  <MiniPriceChart recentPrices={editingCondition.recentPrices} />
                  <div className="space-y-2.5 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {editingCondition.recentPrices && editingCondition.recentPrices.length > 0 ? (
                      editingCondition.recentPrices.map((item, index) => (
                        <div key={`${item.collectedAt}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-[#f1f5f9] hover:border-[#e2e8f0] transition-colors">
                          <span className="font-bold text-[#0f172a] text-sm">{formatPrice(item.price)}</span>
                          <span className="text-[10px] font-bold text-[#64748b] bg-[#f1f5f9] px-2 py-1 rounded-md">{item.collectedAt}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-sm text-[#94a3b8]">
                        <div className="w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center mb-3">
                          <Search className="w-4 h-4 text-[#94a3b8]" />
                        </div>
                        <p className="font-bold text-xs">최근 가격 변동 기록이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#f3f4f6] pt-6">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-full px-6 py-2.5 bg-[#f3f4f6] text-[#4b5563] font-bold hover:bg-[#e5e7eb] transition-colors"
                    >
                      닫기
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-full px-6 py-2.5 bg-[#10b981] text-white font-bold hover:bg-[#059669] shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-colors"
                    >
                      수정
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditMode}
                      className="rounded-full px-6 py-2.5 bg-[#f3f4f6] text-[#4b5563] font-bold hover:bg-[#e5e7eb] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="rounded-full px-6 py-2.5 bg-[#10b981] text-white font-bold hover:bg-[#059669] shadow-[0_2px_10px_rgba(16,185,129,0.3)] transition-colors hover:shadow-[0_2px_15px_rgba(16,185,129,0.4)]"
                    >
                      {isSavingEdit ? '저장 중...' : '저장'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
