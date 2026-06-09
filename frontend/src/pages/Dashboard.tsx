import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { Sparkles, ListChecks, Sparkles as SparklesIcon, TrendingUp as TrendingUpIcon, CreditCard, CheckCircle, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { fetchAuthMe } from '../api/auth';
import { parseDashboardCommand, submitDashboardClarification, fetchCommandDetail, submitCommandSelection } from '../api/dashboard';
import { toast } from '../store/toastStore';
import { confirmDialog } from '../store/confirmDialogStore';
import ToastContainer from '../components/ui/ToastContainer';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LogoIcon } from '../components/ui/LogoIcon';
import DecorativeBackground from '../components/ui/DecorativeBackground';
import type {
  DashboardClarificationSubmissionRequest,
  DashboardCommandCandidateItem,
  DashboardCommandDetailResponse,
  DashboardCommandParseResponse,
  DashboardCommandParseSuccessResponse,
  DashboardCommandSelectionRequest,
  DashboardCommandSelectionResponse,
  DashboardCommandValidationResult,
} from '../types/dashboard';

type ClarificationAnswers = Record<string, string>;

/**
 * 플랫폼별로 그룹화 후 라운드로빈으로 섞는다.
 * 단일 플랫폼이면 원본 순서 그대로 반환한다.
 *
 * 예: [N1,N2,N3, A1,A2] → [N1,A1, N2,A2, N3]
 */
function interleaveByPlatform(
  list: DashboardCommandCandidateItem[],
): DashboardCommandCandidateItem[] {
  const groups: Record<string, DashboardCommandCandidateItem[]> = {};
  for (const item of list) {
    const key = item.platform ?? 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const buckets = Object.values(groups);
  // 단일 플랫폼이면 그대로 반환
  if (buckets.length <= 1) return list;

  // 라운드로빈: 각 플랫폼에서 한 개씩 번갈아 가져옴
  const result: DashboardCommandCandidateItem[] = [];
  const maxLen = Math.max(...buckets.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of buckets) {
      if (i < bucket.length) result.push(bucket[i]);
    }
  }
  return result;
}

// 설명: 흐름을 끊지 않는 토스트 성공 알림
const showSuccessToast = (title: string) => {
  toast.success(title);
};

// 설명: 비동기 검색 결과를 기다릴 때 짧게 대기하는 유틸입니다.
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type ClarificationFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
};

// 설명: 입력 예시로 보여줄 자연어 명령을 모아둡니다.
const shoppingCommandExamples = [
  '네이버에서 다이슨 에어랩 60만원 이하면 알림줘',
  '나이키 에어포스 1 화이트 270 사이즈 10만원 이하 자동결제',
];

// 설명: 상단 타이틀에서 순환 표시할 단어들입니다.
const rotatingCommandMessages = ['가전제품', '생필품', '신발', '전자제품'];



// 설명: HTML 태그를 제거해 화면용 텍스트를 만듭니다.
const stripHtmlTags = (text: string): string => text.replace(/<[^>]*>/g, '');

// 설명: 보완 입력 필드별 라벨과 안내 문구를 정합니다.
const getClarificationFieldConfig = (field: string): ClarificationFieldConfig => {
  switch (field) {
    case 'productName':
      return { key: field, label: '상품명', placeholder: '예: 나이키 에어포스 1' };
    case 'platform':
      return { key: field, label: '플랫폼', placeholder: '예: 네이버' };
    case 'maxPrice':
      return { key: field, label: '최대가', placeholder: '예: 250000' };
    case 'minPrice':
      return { key: field, label: '최저가', placeholder: '예: 200000' };
    case 'brand':
      return { key: field, label: '브랜드', placeholder: '예: QCY' };
    case 'model':
      return { key: field, label: '모델명', placeholder: '예: T13 PRO' };
    case 'color':
      return { key: field, label: '색상', placeholder: '예: 블랙' };
    case 'size':
      return { key: field, label: '사이즈', placeholder: '예: 270mm' };
    case 'currency':
      return { key: field, label: '통화', placeholder: '예: 원(KRW)' };
    case 'line':
      return { key: field, label: '라인', placeholder: '예: PRO' };
    default:
      return { key: field, label: field, placeholder: `예: ${field}` };
  }
};

export default function Dashboard() {
  // 설명: 자연어 명령 입력값을 저장합니다.
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  // 설명: 순환 문구의 현재 인덱스를 관리합니다.
  const [rotatingMessageIndex, setRotatingMessageIndex] = useState(0);
  // 설명: 순환 문구의 표시 여부를 제어합니다.
  const [isRotatingMessageVisible, setIsRotatingMessageVisible] = useState(true);
  // 설명: 입력창 포커스 상태를 저장합니다.
  const [isCommandInputFocused, setIsCommandInputFocused] = useState(false);
  // 설명: 분석된 명령 미리보기를 저장합니다.
  const [parsedPreview, setParsedPreview] = useState<DashboardCommandParseSuccessResponse | null>(null);
  // 설명: 후보 상품 목록을 저장합니다.
  const [candidates, setCandidates] = useState<DashboardCommandCandidateItem[]>([]);
  const [validationResult, setValidationResult] = useState<DashboardCommandValidationResult | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectionSubmitting, setSelectionSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
  // 설명: 분석 종료 후 어지러움 효과 (눈이 @로)
  const [showDizzy, setShowDizzy] = useState(false);
  // 설명: 어지러움 후 멍한 표정 (0.5초)
  const [showNeutral, setShowNeutral] = useState(false);

  useEffect(() => {
    if (!showDizzy) return;
    const timer = window.setTimeout(() => {
      setShowDizzy(false);
      setShowNeutral(true);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [showDizzy]);

  useEffect(() => {
    if (!showNeutral) return;
    const timer = window.setTimeout(() => setShowNeutral(false), 500);
    return () => window.clearTimeout(timer);
  }, [showNeutral]);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  // 설명: 추가 설명 입력값을 저장합니다.
  const [clarificationInput, setClarificationInput] = useState('');
  // 설명: 보완 전송 상태를 저장합니다.
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  // 설명: 누락 항목별 답변을 저장합니다.
  const [clarificationAnswers, setClarificationAnswers] = useState<ClarificationAnswers>({});
  // 설명: 추천 상품 페이지네이션 — 현재 페이지 (0부터 시작), 페이지당 10개
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  // 설명: 등록 성공 시 버튼 morph 표시 (자동 리셋)
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    if (!submissionSuccess) return;
    const timer = window.setTimeout(() => setSubmissionSuccess(false), 1800);
    return () => window.clearTimeout(timer);
  }, [submissionSuccess]);

  // 설명: AUTO_PURCHASE 마감일 (달력으로 선택)
  const [scheduledEndAt, setScheduledEndAt] = useState<Date | undefined>(addDays(new Date(), 7));

  // 설명: forceResubscribe 재요청 시 마지막으로 제출한 상품 ID를 재사용합니다.
  const lastSubmittedProductIdsRef = useRef<string[]>([]);
  // 설명: 재구독 확인 팝업이 중복으로 뜨지 않도록 제어합니다.
  const resubscribePopupActiveRef = useRef(false);

  const commandId = parsedPreview?.data.commandId ?? null;
  // 설명: 전체 페이지 수 (30개 기준 최대 3페이지, 10개 단위)
  const totalPages = Math.ceil(candidates.length / pageSize);

  // 설명: command-service 세션을 다시 조회해 최신 후보 상품/검증 결과를 화면 상태에 반영합니다.
  // 멀티 플랫폼 결과는 라운드로빈으로 섞어서 표시한다.
  const syncSessionState = (sessionResponse: DashboardCommandDetailResponse) => {
    if (!sessionResponse.success) {
      return null;
    }

    setCandidates(interleaveByPlatform(sessionResponse.data.candidates ?? []));
    setValidationResult(sessionResponse.data.validationResult ?? null);
    setCurrentPage(0); // 설명: 새 후보 목록이 오면 첫 페이지로 리셋
    return sessionResponse.data;
  };

  // 설명: parse 직후에는 세션이 SEARCHING 상태이고 후보 상품이 아직 비어 있을 수 있어,
  //       Kafka 기반 검색 결과가 세션에 반영될 때까지 짧게 폴링합니다.
  const waitForCandidateSession = async (commandId: string) => {
    const maxAttempts = 20;
    const delayMs = 1500;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        // 설명: size=30 — 최대 30개 후보를 받아와서 클라이언트에서 10개씩 페이지네이션
        const sessionResponse: DashboardCommandDetailResponse = await fetchCommandDetail(commandId, 0, 30);
        const sessionData = syncSessionState(sessionResponse);

        if (!sessionData) {
          return null;
        }

        const hasCandidates = (sessionData.candidates?.length ?? 0) > 0;
        const isCandidateReadyStatus =
          sessionData.status === 'PRODUCT_SELECTION_REQUIRED' ||
          sessionData.status === 'PRODUCT_SELECTED' ||
          sessionData.status === 'RESUBSCRIBE_CONFIRMATION_REQUIRED';
        const isTerminalStatus = sessionData.status === 'FAILED' || sessionData.status === 'CANCELLED';

        if (hasCandidates || isCandidateReadyStatus || isTerminalStatus) {
          return sessionData;
        }
      } catch {
        // 폴링 중 일시 실패는 치명적이지 않으므로 다음 시도에서 재확인한다.
      }

      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }

    return null;
  };
  
  // 설명: 상단 안내 문구를 주기적으로 바꿉니다.
  useEffect(() => {
    let timeoutId: number | null = null;
    const intervalId = window.setInterval(() => {
      setIsRotatingMessageVisible(false);
      timeoutId = window.setTimeout(() => {
        setRotatingMessageIndex((prev) => (prev + 1) % rotatingCommandMessages.length);
        setIsRotatingMessageVisible(true);
      }, 250);
    }, 2400);

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  // 설명: 상품 선택 전송 후 command-service 상태를 폴링해 재구독 확인/완료 상태를 처리합니다.
  useEffect(() => {
    if (!commandId || !selectionSubmitting) {
      return;
    }

    const TERMINAL_STATUSES = [
      'MONITORING_STARTED',
      'PRICE_CHECK_COMPLETED',
      'AUTO_PURCHASE_COMPLETED',
      'BROWSER_PURCHASE_IN_PROGRESS',
      'FAILED',
      'CANCELLED',
    ];

    const intervalId = window.setInterval(async () => {
      if (resubscribePopupActiveRef.current) {
        return;
      }

      try {
        // 설명: 폴링 시에도 동일하게 size=30으로 세션 조회 (페이지네이션 일관성 유지)
        const sessionResponse: DashboardCommandDetailResponse = await fetchCommandDetail(commandId, 0, 30);
        if (!sessionResponse.success) {
          return;
        }

        const sessionData = syncSessionState(sessionResponse);
        if (!sessionData) {
          return;
        }

        if (sessionData.status === 'RESUBSCRIBE_CONFIRMATION_REQUIRED') {
          window.clearInterval(intervalId);
          resubscribePopupActiveRef.current = true;

          const ok = await confirmDialog.show({
            title: '기존 모니터링 확인',
            message: '이미 모니터링 중인 상품이 있습니다. 기존 모니터링을 갱신하거나 다시 시작하시겠습니까?',
            confirmText: '재시작/갱신',
            cancelText: '취소',
            icon: 'question',
          });

          if (ok) {
            try {
              const payload: DashboardCommandSelectionRequest = {
                selectedProductIds: lastSubmittedProductIdsRef.current,
                forceResubscribe: true,
              };
              const response: DashboardCommandSelectionResponse = await submitCommandSelection(commandId, payload);
              if (!response.success) {
                throw new Error(response.message);
              }
              setSelectionSubmitting(false);
              setSelectedProductIds([]);
              await showSuccessToast('모니터링 갱신 완료');
            } catch (error: unknown) {
              setSelectionSubmitting(false);
              toast.error(error instanceof Error ? error.message : '오류가 발생했습니다.');
            }
          } else {
            setSelectionSubmitting(false);
            toast.info('기존 모니터링을 유지합니다. 새로운 조건을 다시 시도해보세요.');
          }

          resubscribePopupActiveRef.current = false;
          return;
        }

        if (TERMINAL_STATUSES.includes(sessionData.status)) {
          window.clearInterval(intervalId);
          setSelectionSubmitting(false);

          if (
            sessionData.status === 'MONITORING_STARTED' ||
            sessionData.status === 'PRICE_CHECK_COMPLETED' ||
            sessionData.status === 'AUTO_PURCHASE_COMPLETED' ||
            sessionData.status === 'BROWSER_PURCHASE_IN_PROGRESS'
          ) {
            setSelectedProductIds([]);
            setSubmissionSuccess(true);
            await showSuccessToast(
              sessionData.status === 'BROWSER_PURCHASE_IN_PROGRESS' ? '자동 구매 시작됨' : '상품 선택 완료',
            );
          }
        }
      } catch {
        // 일시적 네트워크 오류는 다음 주기에 재시도한다.
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [commandId, selectionSubmitting]);

  // 설명: 새 분석 결과를 화면 초기 상태에 반영합니다.
  const applyParsedPreview = (preview: DashboardCommandParseSuccessResponse) => {
    setParsedPreview(preview);
    setCandidates([]);
    setValidationResult(null);
    setSelectedProductIds([]);
    setCurrentPage(0); // 설명: 새 분석 결과 시 첫 페이지로 초기화
    setSelectionSubmitting(false);
    setShowClarificationModal(false);
    setClarificationInput('');
    setClarificationAnswers({});
    lastSubmittedProductIdsRef.current = [];
    resubscribePopupActiveRef.current = false;
  };

  // 설명: 검색 결과를 초기화하고 새로 검색할 수 있게 합니다.
  const handleResetSearch = () => {
    setParsedPreview(null);
    setCandidates([]);
    setValidationResult(null);
    setSelectedProductIds([]);
    setCurrentPage(0); // 설명: 검색 초기화 시 첫 페이지로 리셋
    setNaturalLanguageInput('');
    setScheduledEndAt(addDays(new Date(), 7));
    lastSubmittedProductIdsRef.current = [];
    resubscribePopupActiveRef.current = false;
  };

  // 설명: 자연어 명령을 분석하고 결과를 불러옵니다.
  const handleAnalyzeClick = async (): Promise<void> => {
    if (isAnalyzing) {
      return;
    }

    const commandText = naturalLanguageInput.trim();
    if (!commandText) {
      toast.warning('명령어를 입력해주세요.');
      return;
    }

    const analyzeStartTime = Date.now();

    try {
      setIsAnalyzing(true);

      // 설명: 로그인 사용자 정보를 먼저 가져옵니다.
      const user = await fetchAuthMe();
      if (!user) throw new Error('AUTH_REQUIRED');

      const response: DashboardCommandParseResponse = await parseDashboardCommand({ userId: user.id, commandText });
      if (!response.success) throw new Error(response.message);

      applyParsedPreview(response);

      // URL_MONITOR: 모달 없이 바로 모니터링 등록 상태로 이동
      if (response.data.intent === 'URL_MONITOR') {
        if (!response.data.needsClarification && response.data.commandId) {
          await showSuccessToast('URL 모니터링 등록 완료');
        }
        return; // 모달, 후보 조회 없이 종료
      }

      // 설명: 필요하면 상세 세션도 함께 조회합니다.
      // AUTO_PURCHASE도 이제 동일하게 처리 (조건 모달은 상품 선택 후 "조건 생성하기"에서 열림)
      const commandId = response.data.commandId;
      const hasMissingFields = (response.data.missingRequiredFields?.length ?? 0) > 0;

      // 미싱필드가 없을 때만 명령 세션 조회해서 상품 목록 받아옴
      if (!hasMissingFields && commandId != null) {
        setIsFetchingCandidates(true);
        try {
          await waitForCandidateSession(commandId);
        } finally {
          setIsFetchingCandidates(false);
        }
      }

      await showSuccessToast('분석 완료');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.';

      // 설명: 페이지네이션 테스트용 mock 후보 25개 (다양한 플랫폼, 가격, 상품명)
      const mockProducts = [
        { title: '삼성 갤럭시 버즈 FE 블루투스 이어폰', price: '89000', mall: '쿠팡', platform: 'coupang' },
      ];
      const mockCandidates: DashboardCommandCandidateItem[] = mockProducts.map((p, i) => ({
        productId: `mock-product-${i + 1}`,
        title: p.title,
        lprice: p.price,
        mallName: p.mall,
        productUrl: '#',
        currency: 'KRW',
        platform: p.platform,
        searchKeyword: p.title,
        imageUrl: `https://via.placeholder.com/128/1E4D8C/FFFFFF?text=${encodeURIComponent(p.title.slice(0, 4))}`,
      }));

      const mockParseResponse: DashboardCommandParseSuccessResponse = {
        success: true,
        message: 'Mock parse response',
        data: {
          intent: 'shopping.monitor',
          parsedCommand: {
            productName: 'Mock 상품',
            platform: 'ALL',
            maxPrice: 1000000,
            mode: 'ALERT_ONLY',
          },
          missingRequiredFields: ['maxPrice'],
          ambiguousFields: [],
          needsClarification: true,
          confidence: 0.98,
          commandId: "999999",
        },
      };

      const mockValidationResult: DashboardCommandValidationResult = {
        triggeredProducts: [],
        monitoringProducts: [],
        purchasedProductId: null,
        summaryMessage: '모의 데이터로 미리보기를 표시합니다.',
        confirmationRequired: false,
        duplicateProducts: [],
        confirmationMessage: '',
      };

      applyParsedPreview(mockParseResponse);
      setCandidates(mockCandidates);
      setValidationResult(mockValidationResult);
      setSelectedProductIds([]);

      toast.warning(`${errorMessage} / 미리보기용 모의 데이터를 표시합니다.`);
    } finally {
      // 설명: 최소 1.5초간 analyzing 유지 (안테나 회전을 확인할 수 있도록)
      const minDuration = 1500;
      const elapsed = Date.now() - analyzeStartTime;
      if (elapsed < minDuration) {
        await new Promise((r) => window.setTimeout(r, minDuration - elapsed));
      }
      setIsAnalyzing(false);
      setShowDizzy(true);
    }
  };

  // 설명: 선택한 상품을 서버로 전송하고, 중복 모니터링이 감지되면 재시작 확인을 받습니다.
  const handleSelectionSubmit = async (): Promise<void> => {
    if (!commandId || selectedProductIds.length === 0) {
      return;
    }

    try {
      setSelectionSubmitting(true);
      lastSubmittedProductIdsRef.current = [...selectedProductIds];

      const payload: DashboardCommandSelectionRequest = {
        selectedProductIds,
        forceResubscribe: false,
        scheduledEndAt: scheduledEndAt ? scheduledEndAt.toISOString() : null,
      };
      const response: DashboardCommandSelectionResponse = await submitCommandSelection(commandId, payload);
      if (!response.success) {
        throw new Error(response.message);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '상품 선택을 전송하지 못했습니다.';
      toast.error(errorMessage);
      setSelectionSubmitting(false);
    } finally {
      // 성공 시 후속 상태 변화는 폴링 useEffect가 처리한다.
    }
  };

  // 설명: 누락된 조건을 보완 입력으로 전송합니다.
  const handleClarificationSubmit = async (): Promise<void> => {
    if (!parsedPreview?.data.commandId) {
      return;
    }

    // 설명: 비어 있지 않은 답변만 골라냅니다.
    const answers = Object.entries(clarificationAnswers).reduce<ClarificationAnswers>((acc, [key, value]) => {
      if (value.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});

    if (!clarificationInput.trim() && Object.keys(answers).length === 0) {
      toast.warning('추가 설명이나 항목별 답변을 입력해주세요.');
      return;
    }

    try {
      setClarificationSubmitting(true);

      // 설명: 추가 설명과 항목별 답변을 묶어 보냅니다.
      const payload: DashboardClarificationSubmissionRequest = {
        clarificationInput: clarificationInput.trim(),
        answers,
      };

      const response = await submitDashboardClarification(parsedPreview.data.commandId, payload);

      if (!response.success) {
        throw new Error(response.message);
      }

      setClarificationInput('');
      setClarificationAnswers({});
      setShowClarificationModal(false);

      // 보완 성공 후 명령 세션 조회해서 상품 목록 갱신
      // 설명: 보완 후 최신 후보 목록을 다시 조회합니다.
      const sessionId = parsedPreview.data.commandId;
      if (sessionId != null) {
        setIsFetchingCandidates(true);
        try {
          await waitForCandidateSession(sessionId);
        } finally {
          setIsFetchingCandidates(false);
        }
      }

      await showSuccessToast('보완 내용 전송 완료');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '보완 내용을 전송하지 못했습니다.';
      toast.error(errorMessage);
    } finally {
      setClarificationSubmitting(false);
    }
  };

  // 설명: 현재 분석에서 누락된 항목을 꺼냅니다.
  const missingFields = parsedPreview?.data.missingRequiredFields ?? [];
  // 설명: AUTO_PURCHASE 인텐트인지 확인합니다.
  const isAutoPurchase = parsedPreview?.data.intent === 'AUTO_PURCHASE';

  // 설명: 대시보드의 전체 화면 레이아웃을 그립니다.
  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden">
      {/* --- 장식용 기하학 배경 요소 (Abstract Geometric + Glassmorphism) --- */}
      <DecorativeBackground />
      {/* 설명: 상단 히어로와 자연어 입력 영역입니다. */}
      <section className="bg-white/10 dark:bg-slate-950/20 w-full pt-16 pb-20 px-4 md:px-8 relative overflow-hidden z-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1E4D8C] via-[#0F3460] to-[#DBE2EF]"></div>
        <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center relative z-10">
          {/* ── 마스코트 로고 아이콘 ── */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] mb-5 relative overflow-hidden border border-white/10">
            <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
            {isAnalyzing ? (
              <LogoIcon className="w-12 h-12 animate-spin" animated={false} mouth="open" />
            ) : showDizzy ? (
              <LogoIcon className="w-12 h-12" animated={false} dizzy />
            ) : showNeutral ? (
              <LogoIcon className="w-12 h-12" animated={false} mouth="auto" />
            ) : (
              <LogoIcon className="w-12 h-12" animated={true} mouth="smile" analyzing />
            )}
          </div>
          <div className="mb-4 flex h-12 items-center text-4xl font-medium text-slate-700 dark:text-slate-300 md:text-4xl">
            <span className="relative inline-grid h-12 items-center overflow-hidden text-[#1E4D8C] dark:text-[#7BAEDA] transition-[width] duration-300">
              <span className="invisible whitespace-nowrap font-bold">{rotatingCommandMessages[rotatingMessageIndex]}</span>
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-bold transition-all duration-300 ${isRotatingMessageVisible ? 'translate-y-[-50%] opacity-100' : 'translate-y-[-70%] opacity-0'}`}>
                {rotatingCommandMessages[rotatingMessageIndex]}
              </span>
            </span>
            <span>&nbsp;찾고 계신가요?</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-10">
            원하는 가격, <span className="relative inline-block"><span className="relative z-10 text-[#1E4D8C] dark:text-[#7BAEDA]">알아서 척척</span><span className="absolute bottom-1 left-0 w-full h-3 bg-[#DBE2EF] dark:bg-[#1E4D8C]/30 -z-10 rounded-sm skew-x-[-10deg]"></span></span> 찾아드려요.
          </h1>

          <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-[2rem] shadow-[0_8px_32px_rgb(15,23,42,0.06)] border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] rounded-t-[2rem]"></div>
            <div className="p-4 pt-5 flex flex-col gap-3">
              <div className={`bg-white dark:bg-slate-800 rounded-2xl p-2 ring-1 transition-all duration-300 ${
                isAnalyzing
                  ? 'ring-2 ring-[#1E4D8C]/50 dark:ring-[#7BAEDA]/50 shadow-[0_0_15px_rgba(30,77,140,0.2)] animate-pulse'
                  : 'ring-[#E2E8F0] focus-within:bg-slate-100 dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-[#1E4D8C]/30 dark:focus-within:ring-[#7BAEDA]/30'
              }`}>
                <textarea
                  rows={1}
                  disabled={isAnalyzing}
                  placeholder="예: 쿠팡에서 탐사수 7000원 밑으로 알림"
                  value={naturalLanguageInput}
                  onFocus={() => setIsCommandInputFocused(true)}
                  onBlur={() => window.setTimeout(() => setIsCommandInputFocused(false), 150)}
                  onChange={(e) => {
                    setNaturalLanguageInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  className={`w-full bg-transparent border-none px-4 py-3 text-slate-900 dark:text-slate-50 text-lg placeholder:text-slate-700 dark:placeholder:text-slate-400 focus:outline-none resize-none min-h-[60px] font-medium ${isAnalyzing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 px-2">
                {parsedPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetSearch}
                    disabled={isAnalyzing}
                    className="rounded-xl h-12 px-5 text-sm font-bold border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    새로 검색
                  </Button>
                )}
                <Button
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] dark:hover:from-[#7BAEDA] hover:to-[#0F3460] dark:hover:to-[#1E4D8C] hover:-translate-y-0.5 rounded-xl h-12 px-8 text-base font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)] transition-all duration-300 w-full sm:w-auto group border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => void handleAnalyzeClick()}
                >
                  {isAnalyzing ? '분석 중...' : '조건 분석하기'}
                </Button>
              </div>

              {/* 설명: 누락 항목 보완 안내를 보여줍니다. */}
              {parsedPreview?.data.needsClarification && (
                <div className="mx-2 mt-2 flex flex-col items-start gap-2 rounded-[1.5rem] border border-[#DBE2EF] dark:border-[#1E4D8C]/30 bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 px-4 py-3 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1E4D8C] dark:text-[#7BAEDA] shrink-0" />
                    <p className="text-sm font-medium text-[#1E4D8C] dark:text-[#7BAEDA]">혹시 빠뜨린 내용이 있나요?</p>
                  </div>
                  <Button type="button" onClick={() => setShowClarificationModal(true)} className="rounded-xl bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white">
                    조건 보완하기
                  </Button>
                </div>
              )}

              {/* 설명: 조건 보완 모달을 제공합니다. */}
              <Dialog
                open={showClarificationModal}
                onOpenChange={(open) => {
                  setShowClarificationModal(open);
                }}
              >
                <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-[95vw] sm:max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden border-slate-200 dark:border-slate-700 shadow-2xl">
                  {/* 헤더 */}
                  <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1E4D8C]/10 dark:bg-[#1E4D8C]/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                        </div>
                        <div>
                          <DialogTitle className="text-slate-900 dark:text-slate-50 text-lg font-bold">
                            {selectedProductIds.length > 0 ? '조건 확인' : '조건 보완'}
                          </DialogTitle>
                          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {selectedProductIds.length > 0
                              ? '선택한 상품의 모니터링 조건을 확인하고 시작하세요.'
                              : 'AI가 파악한 조건을 확인하고, 부족한 정보를 채워주세요.'}
                          </DialogDescription>
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowClarificationModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                    {selectedProductIds.length > 0 ? (
                      /* ── 조건 생성하기 경로: 선택 상품 요약 + 마감일 확인 ── */
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#1E4D8C]/5 to-[#0F3460]/5 dark:from-[#1E4D8C]/10 dark:to-[#0F3460]/10 rounded-xl p-3 text-sm text-[#1E4D8C] dark:text-[#7BAEDA] font-medium">
                          선택한 상품을 기반으로 자동 결제 조건을 생성합니다.
                        </div>

                        {/* 선택 상품 수 */}
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">선택된 상품</span>
                          <span className="ml-auto text-sm font-bold text-slate-900 dark:text-slate-50">{selectedProductIds.length}개</span>
                        </div>

                        {/* 목표가 (read-only) */}
                        {parsedPreview?.data.parsedCommand?.maxPrice != null && (
                          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-sm text-slate-600 dark:text-slate-400">목표가</span>
                            <span className="ml-auto text-sm font-bold text-[#1E4D8C] dark:text-[#7BAEDA]">
                              ₩{parsedPreview.data.parsedCommand.maxPrice.toLocaleString()} 이하
                            </span>
                          </div>
                        )}

                        {/* 모니터링 마감일 달력 */}
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">모니터링 마감일</Label>
                          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/10 text-[#1E4D8C] dark:text-[#7BAEDA] text-xs font-semibold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {scheduledEndAt
                              ? format(scheduledEndAt, 'yyyy년 M월 d일', { locale: ko })
                              : '날짜를 선택해주세요'}
                          </div>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 overflow-hidden flex justify-center">
                            <DayPicker
                              mode="single"
                              selected={scheduledEndAt}
                              onSelect={(date) => { if (date) setScheduledEndAt(date); }}
                              locale={ko}
                              disabled={{ before: addDays(new Date(), 1) }}
                              defaultMonth={scheduledEndAt ?? addDays(new Date(), 7)}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">기본값 7일 · 내일 이후만 선택 가능</p>
                        </div>
                      </div>
                    ) : isAutoPurchase ? (
                      /* ── AUTO_PURCHASE 보완 입력 (누락 필드가 있는 경우) ── */
                      <div className="space-y-4">
                        {/* 안내 문구 */}
                        <div className="bg-gradient-to-r from-[#1E4D8C]/5 to-[#0F3460]/5 dark:from-[#1E4D8C]/10 dark:to-[#0F3460]/10 rounded-xl p-3 text-sm text-[#1E4D8C] dark:text-[#7BAEDA] font-medium">
                          자동 결제에 필요한 조건을 입력해주세요.
                        </div>

                        {/* 상품명 */}
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">상품명</Label>
                          <Input
                            value={clarificationAnswers['productName'] ?? ''}
                            onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, productName: e.target.value }))}
                            placeholder="예: 에디파이어 스피커"
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1E4D8C]/20 focus-visible:border-[#1E4D8C] rounded-xl h-10 text-sm transition-all"
                          />
                        </div>

                        {/* 플랫폼 — 버튼 다중 선택 */}
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">플랫폼</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {([{ value: 'NAVER', label: '네이버' }, { value: 'ALIEXPRESS', label: '알리익스프레스' }] as const).map(({ value, label }) => {
                              const selected = (clarificationAnswers['platform'] ?? '').split(',').filter(Boolean).includes(value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    const current = new Set((clarificationAnswers['platform'] ?? '').split(',').filter(Boolean));
                                    if (current.has(value)) { current.delete(value); } else { current.add(value); }
                                    setClarificationAnswers((prev) => ({ ...prev, platform: Array.from(current).join(',') }));
                                  }}
                                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                                    selected
                                      ? 'border-[#1E4D8C] bg-[#1E4D8C] text-white dark:border-[#7BAEDA] dark:bg-[#7BAEDA] dark:text-slate-900 shadow-md'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[#1E4D8C]/50 dark:hover:border-[#7BAEDA]/50 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA]'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 최대가 */}
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">최대가</Label>
                          <Input
                            value={clarificationAnswers['maxPrice'] ?? ''}
                            onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, maxPrice: e.target.value }))}
                            placeholder="예: 10000"
                            inputMode="numeric"
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1E4D8C]/20 focus-visible:border-[#1E4D8C] rounded-xl h-10 text-sm transition-all"
                          />
                        </div>

                        {/* 모니터링 마감일 — 달력 */}
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">
                            모니터링 마감일
                          </Label>
                          {/* 선택된 날짜 표시 배지 */}
                          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E4D8C]/10 dark:bg-[#7BAEDA]/10 text-[#1E4D8C] dark:text-[#7BAEDA] text-xs font-semibold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {scheduledEndAt
                              ? format(scheduledEndAt, 'yyyy년 M월 d일', { locale: ko })
                              : '날짜를 선택해주세요'}
                          </div>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-2 overflow-hidden flex justify-center">
                            <DayPicker
                              mode="single"
                              selected={scheduledEndAt}
                              onSelect={(date) => { if (date) setScheduledEndAt(date); }}
                              locale={ko}
                              disabled={{ before: addDays(new Date(), 1) }}
                              defaultMonth={scheduledEndAt ?? addDays(new Date(), 7)}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            기본값 7일 · 내일 이후만 선택 가능
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ── 기존: 일반 조건 보완 UI ── */
                      <>
                        {/* AI가 이해한 내용 (Inset 스타일) */}
                        {(() => {
                          const d = parsedPreview?.data.parsedCommand;
                          if (!d) return null;
                          const items: { label: string; value: string }[] = [];
                          if (d.productName) items.push({ label: '상품', value: d.productName });
                          if (d.brand) items.push({ label: '브랜드', value: d.brand });
                          if (d.platform) items.push({ label: '플랫폼', value: d.platform });
                          if (d.maxPrice != null) items.push({ label: '목표가', value: `₩${d.maxPrice.toLocaleString()}` });
                          if (d.mode) items.push({ label: '모드', value: d.mode === 'AUTO_PAYMENT' ? '자동결제' : '알림' });
                          if (items.length === 0) return null;
                          return (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 ring-1 ring-slate-100 dark:ring-slate-700">
                              <div className="flex items-center gap-1.5 mb-3">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">AI가 이해한 조건</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {items.map((item, i) => (
                                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1E4D8C]/5 dark:bg-[#1E4D8C]/15 text-[#1E4D8C] dark:text-[#7BAEDA]">
                                    <span className="opacity-60">{item.label}:</span>
                                    {item.value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 누락된 항목 (Left border accent) */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                              추가 확인이 필요한 항목 <span className="text-amber-500 font-bold">{missingFields.length > 0 ? missingFields.length : ''}</span>
                            </p>
                          </div>

                          {missingFields.length > 0 ? (
                            <div className="space-y-3">
                              {missingFields.map((field) => {
                                const config = getClarificationFieldConfig(field);
                                const isNumericField = field === 'maxPrice' || field === 'minPrice';

                                return (
                                  <div key={field}>
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block">{config.label} <span className="text-amber-500 ml-0.5">*</span></Label>
                                    <Input
                                      value={clarificationAnswers[field] ?? ''}
                                      onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [field]: e.target.value }))}
                                      placeholder={config.placeholder}
                                      inputMode={isNumericField ? 'numeric' : 'text'}
                                      className="bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 rounded-xl h-10 text-sm transition-all"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              모든 항목이 분석되었어요. 추가 설명이 필요하면 아래를 활용하세요.
                            </div>
                          )}
                        </div>

                        {/* 추가 설명 (선택) */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              추가 설명 <span className="font-normal text-slate-400">(선택)</span>
                            </p>
                          </div>
                          <textarea
                            value={clarificationInput}
                            onChange={(e) => setClarificationInput(e.target.value)}
                            placeholder="AI에게 덧붙일 말이 있다면 적어주세요."
                            className="min-h-[80px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none resize-none focus:ring-2 focus:ring-[#1E4D8C]/30 transition-all"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* 푸터 */}
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowClarificationModal(false)}
                      className="rounded-xl px-5 py-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold"
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedProductIds.length > 0) {
                          // 조건 생성하기 경로: 재파싱 없이 선택된 상품 그대로 등록
                          setShowClarificationModal(false);
                          void handleSelectionSubmit();
                        } else {
                          // 보완 입력 경로: 재파싱 후 검색
                          void handleClarificationSubmit();
                        }
                      }}
                      disabled={selectedProductIds.length > 0 ? selectionSubmitting : clarificationSubmitting}
                      className="rounded-xl px-5 py-2 bg-[#1E4D8C] hover:bg-[#0F3460] text-white shadow-md shadow-[#1E4D8C]/20 border-none font-bold text-sm transition-all"
                    >
                      {selectedProductIds.length > 0
                        ? (selectionSubmitting ? '등록 중...' : '조건 생성하기')
                        : (clarificationSubmitting ? '전송 중...' : isAutoPurchase ? '검색하기' : '조건 적용하기')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 설명: 분석 완료 상태를 표시합니다. */}
              {parsedPreview && !parsedPreview.data.needsClarification && (
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">분석 완료</p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">추가 입력 없이도 조건 분석이 끝났어요.</p>
                </div>
              )}

              {/* 상품 후보 로딩 중 */}
              {isFetchingCandidates && (
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 flex flex-col items-center gap-3 shadow-sm">
                  <LogoIcon className="w-7 h-7" animated={false} analyzing={isFetchingCandidates} />
                  <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">상품 검색 중입니다...</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">후보 상품을 불러오고 있어요</p>
                </div>
              )}

              {/* 설명: 후보 상품 목록과 선택 버튼을 보여줍니다. */}
              {!isFetchingCandidates && candidates.length > 0 ? (
                <div className="-mx-4 -mb-4 mt-4 bg-slate-50/80 dark:bg-slate-900/50 px-5 py-6 border-t border-slate-200 dark:border-slate-800 shadow-[inset_0_4px_6px_-4px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">추천 상품</h3>
                      {selectedProductIds.length === 0 ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">상품을 선택해 주세요</span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{selectedProductIds.length}개 선택됨</span>
                      )}
                    </div>
                    {/* 설명: 현재 페이지 / 전체 페이지 · 총 상품 개수 */}
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{currentPage + 1}/{Math.ceil(candidates.length / pageSize)} · 총 {candidates.length}개</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(() => {
                      const triggeredIds = new Set((validationResult?.triggeredProducts ?? []).map((p) => p.productId));
                      const monitoringIds = new Set((validationResult?.monitoringProducts ?? []).map((p) => p.productId));
                      const duplicateIds = new Set((validationResult?.duplicateProducts ?? []).map((p) => p.productId));
                      // 설명: 현재 페이지에 해당하는 10개만 추출 (클라이언트 사이드 페이지네이션)
                      const startIdx = currentPage * pageSize;
                      const pagedCandidates = candidates.slice(startIdx, startIdx + pageSize);

                      return pagedCandidates.map((item) => {
                        const isSelected = selectedProductIds.includes(item.productId);
                        let badgeText = '';
                        let badgeClass = '';

                        if (triggeredIds.has(item.productId)) {
                          badgeText = '즉시 조건 충족';
                          badgeClass = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
                        } else if (monitoringIds.has(item.productId)) {
                          badgeText = '모니터링 중';
                          badgeClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
                        } else if (duplicateIds.has(item.productId)) {
                          badgeText = '기존 구독 이력';
                          badgeClass = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
                        }

                        return (
                          <div
                            key={item.productId}
                            onClick={() => {
                              setSelectedProductIds((prev) =>
                                prev.includes(item.productId)
                                  ? prev.filter((id) => id !== item.productId)
                                  : [...prev, item.productId],
                              );
                            }}
                            className={`group relative flex gap-3 rounded-2xl p-3.5 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-2 border-[#1E4D8C] dark:border-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 shadow-[0_4px_12px_rgba(30,77,140,0.08)]'
                                : 'border border-white dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:-translate-y-1'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                src={item.imageUrl}
                alt={item.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23F1F5F9"/><text x="40" y="40" font-family="sans-serif" font-size="8" fill="%2394A3B8" text-anchor="middle" dominant-baseline="middle">이미지 없음</text></svg>';
                  e.currentTarget.classList.add('opacity-60');
                }}
                className="w-20 h-20 rounded-xl object-cover bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 transition-opacity duration-300"
              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                  <div className="w-6 h-6 rounded-full bg-[#1E4D8C] dark:bg-[#7BAEDA] flex items-center justify-center shadow-md">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 leading-snug">{stripHtmlTags(item.title)}</div>
                              {badgeText && (
                                <span className={`mt-1.5 inline-flex items-center self-start rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                                  {badgeText}
                                </span>
                              )}
                              <div className="mt-auto pt-2">
                                <div className="text-sm font-bold text-[#1E4D8C] dark:text-[#7BAEDA]">₩{Number(item.lprice).toLocaleString()}</div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.mallName} · {item.platform}</div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 설명: 페이지네이션 컨트롤 — 1페이지 이하일 경우 숨김 */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {/* 설명: 이전 페이지 버튼 (첫 페이지에서는 비활성화) */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      {/* 설명: 페이지 번호 버튼 — 현재 페이지는 파란색 하이라이트 */}
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCurrentPage(i)}
                          className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 rounded-xl text-sm font-bold transition-all duration-200 ${
                            i === currentPage
                              ? 'bg-[#1E4D8C] dark:bg-[#7BAEDA] text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      {/* 설명: 다음 페이지 버튼 (마지막 페이지에서는 비활성화) */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {selectedProductIds.length > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-3 bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 rounded-2xl border border-[#DBE2EF] dark:border-[#1E4D8C]/30 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1E4D8C] dark:bg-[#7BAEDA] flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-[#1E4D8C] dark:text-[#7BAEDA]">{selectedProductIds.length}개 선택됨</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setClarificationAnswers({});
                          setShowClarificationModal(true);
                        }}
                        disabled={selectionSubmitting || submissionSuccess}
                        className={`rounded-xl font-bold shadow-md transition-all duration-300 ${
                          submissionSuccess
                            ? 'bg-emerald-500 text-white w-12 h-12 p-0 rounded-full shadow-lg shadow-emerald-500/30'
                            : 'bg-[#1E4D8C] hover:bg-[#0F3460] text-white px-6 py-2 shadow-[#1E4D8C]/20'
                        }`}
                      >
                        {submissionSuccess ? (
                          <svg className="w-5 h-5 animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          '조건 생성하기'
                        )}
                      </Button>
                    </div>
                )}
                </div>
              ) : (isCommandInputFocused || naturalLanguageInput.trim().length > 0) && (
                // 설명: 입력 예시와 사용 팁을 안내합니다.
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-5 text-left shadow-inner">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">이렇게 입력해 보세요!</h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mb-3">원하는 문장을 클릭해 자연어 쇼핑 명령을 빠르게 입력할 수 있어요.</p>
                      <div className="flex flex-col gap-2">
                        {/* 설명: 예시 문구를 클릭하면 입력칸에 채워집니다. */}
                        {shoppingCommandExamples.map((text, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setNaturalLanguageInput(text);
                            }}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-50 transition hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:shadow-[0_2px_8px_rgb(217,119,6,0.08)] hover:bg-[#F9F7F7] dark:hover:bg-[#1E4D8C]/10 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA] hover:-translate-y-0.5 cursor-pointer"
                          >
                            "{text}"
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 text-[#1E4D8C] dark:text-[#7BAEDA] flex items-center justify-center text-xs shadow-sm border border-[#1E4D8C]/10">💡</span>
                        이런 것도 알아들어요
                      </h4>
                      <div className="text-sm text-slate-700 dark:text-slate-300 space-y-3 font-medium">
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-slate-900 dark:text-slate-50">플랫폼:</strong> 네이버 쇼핑, 알리익스프레스</p></div>
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-slate-900 dark:text-slate-50">상품 정보:</strong> 브랜드명, 정확한 모델명, 사이즈, 색상 등</p></div>
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-slate-900 dark:text-slate-50">원하는 방식:</strong> 얼마 이하 즉시 결제/알림만 등</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 메뉴 네비게이션 카드 (모니터링 현황이 있던 자리) */}
      <section className="py-16 px-4 md:px-8 bg-slate-50/30 dark:bg-slate-900/40 relative z-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">빠른 이동</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">원하는 페이지로 바로 이동하세요.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { path: '/conditions', label: '조건 관리', icon: ListChecks, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', desc: '등록된 조건 확인' },
              { path: '/recommendations', label: '추천', icon: SparklesIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', desc: '유튜버 리뷰 기반 추천' },
              { path: '/price-history', label: '가격 히스토리', icon: TrendingUpIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20', desc: '가격 변동 추이' },
              { path: '/payments', label: '결제 내역', icon: CreditCard, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20', desc: '자동 결제 현황' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  to={item.path}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#1E4D8C]/30 dark:hover:border-[#7BAEDA]/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{item.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
}
