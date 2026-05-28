import { useEffect, useState } from 'react';
import { Circle, Clock, CheckCircle, DollarSign, Search, Sparkles, TrendingUp } from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchAuthMe } from '../api/auth';
import { parseDashboardCommand, submitDashboardClarification, fetchCommandDetail, submitCommandSelection, submitCommandProductLinks } from '../api/dashboard';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LogoIcon } from '../components/ui/LogoIcon';
import type {
  DashboardClarificationSubmissionRequest,
  DashboardCommandCandidateItem,
  DashboardCommandDetailResponse,
  DashboardCommandParseResponse,
  DashboardCommandParseSuccessResponse,
  DashboardCommandProductLinksRequest,
  DashboardCommandSelectionRequest,
  DashboardCommandSelectionResponse,
  DashboardCommandValidationResult,
  DashboardMonitoringItem,
  DashboardStat,
} from '../types/dashboard';

type ClarificationAnswers = Record<string, string>;

// 설명: 흐름을 끊지 않는 토스트 성공 알림
const showSuccessToast = async (title: string) => {
  await Swal.fire({
    icon: 'success',
    title,
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
};

type ClarificationFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
};

// 설명: 입력 예시로 보여줄 자연어 명령을 모아둡니다.
const shoppingCommandExamples = [
  '네이버 항공에서 인천-오사카 25만원 이하면 바로 결제해줘',
  '나이키 에어포스 1 화이트 270 사이즈 10만원 이하 자동결제',
];

// 설명: 상단 타이틀에서 순환 표시할 단어들입니다.
const rotatingCommandMessages = ['항공권', '생필품', '신발', '전자기기'];

// 설명: 초기 모니터링 목록은 빈 상태로 시작합니다.
const initialMonitoringItems: DashboardMonitoringItem[] = [
  {
    conditionId: 999,
    status: 'exploring',
    statusLabel: '탐색 중',
    statusColor: '#16a34a',
    product: '갤럭시 버즈 FE',
    platform: '쿠팡',
    currentPrice: '₩89,000',
    targetPrice: '₩75,000',
  },
];

// 설명: 가격 문자열에서 숫자만 추출합니다.
const formatNumericPrice = (priceText: string) => {
  const parsed = Number(priceText.replace(/[^\d-]/g, ''));
  return Number.isNaN(parsed) ? 0 : parsed;
};

// 설명: HTML 태그를 제거해 화면용 텍스트를 만듭니다.
const stripHtmlTags = (text: string): string => text.replace(/<[^>]*>/g, '');

// 설명: 보완 입력 필드별 라벨과 안내 문구를 정합니다.
const getClarificationFieldConfig = (field: string): ClarificationFieldConfig => {
  switch (field) {
    case 'productName':
      return { key: field, label: '상품명', placeholder: '예: 나이키 에어포스 1' };
    case 'platform':
      return { key: field, label: '플랫폼', placeholder: '예: 쿠팡' };
    case 'route':
      return { key: field, label: '비행 경로', placeholder: '예: 인천-도쿄 왕복' };
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

// 설명: 플랫폼 식별자를 사람이 읽기 쉬운 이름으로 바꿉니다.
const getPlatformName = (platform: string) => {
  const platformMap: Record<string, string> = {
    naver: '네이버 쇼핑',
    coupang: '쿠팡',
    'naver-flights': '네이버 항공',
    aliexpress: 'AliExpress',
    ALIEXPRESS: 'AliExpress',
  };
  return platformMap[platform] || platform;
};

// 설명: 플랫폼별 대표 색상을 반환합니다.
const getPlatformColor = (platform: string) => {
  const colorMap: Record<string, string> = {
    naver: '#03c75a',
    coupang: '#ff6b6b',
    'naver-flights': '#03c75a',
    aliexpress: '#E62E04',
    ALIEXPRESS: '#E62E04',
  };
  return colorMap[platform] || '#0463e7';
};

// 설명: 모니터링 상태에 맞는 색상을 정합니다.
const getMonitoringStatusColor = (status: DashboardMonitoringItem['status'], statusLabel?: string) => {
  if (status === 'waiting' || statusLabel?.trim() === '대기 중') return '#f97316';
  if (status === 'exploring' || statusLabel?.trim() === '탐색 중') return '#16a34a';
  return '#1E4D8C';
};

export default function Dashboard() {
  // 설명: 상단 검색어를 저장합니다.
  const [searchQuery, setSearchQuery] = useState('');
  // 설명: 자연어 명령 입력값을 저장합니다.
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  // 설명: 순환 문구의 현재 인덱스를 관리합니다.
  const [rotatingMessageIndex, setRotatingMessageIndex] = useState(0);
  // 설명: 순환 문구의 표시 여부를 제어합니다.
  const [isRotatingMessageVisible, setIsRotatingMessageVisible] = useState(true);
  // 설명: 입력창 포커스 상태를 저장합니다.
  const [isCommandInputFocused, setIsCommandInputFocused] = useState(false);
  // ── 조건 분석 버튼 호버 시 로봇 입 O자로 변경 ──
  const [isAnalyzeBtnHovered, setIsAnalyzeBtnHovered] = useState(false);
  // 설명: 분석된 명령 미리보기를 저장합니다.
  const [parsedPreview, setParsedPreview] = useState<DashboardCommandParseSuccessResponse | null>(null);
  // 설명: 후보 상품 목록을 저장합니다.
  const [candidates, setCandidates] = useState<DashboardCommandCandidateItem[]>([]);
  const [validationResult, setValidationResult] = useState<DashboardCommandValidationResult | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectionSubmitting, setSelectionSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [productUrlInputs, setProductUrlInputs] = useState<string[]>(['']);
  const [productUrlSubmitting, setProductUrlSubmitting] = useState(false);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  // 설명: 추가 설명 입력값을 저장합니다.
  const [clarificationInput, setClarificationInput] = useState('');
  // 설명: 보완 전송 상태를 저장합니다.
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  // 설명: 누락 항목별 답변을 저장합니다.
  const [clarificationAnswers, setClarificationAnswers] = useState<ClarificationAnswers>({});

  // 설명: 모니터링 데이터와 요약 지표를 준비합니다.
  const monitoringItems = initialMonitoringItems;
  // 설명: 전체 모니터링 개수를 계산합니다.
  const monitoringCount = monitoringItems.length;
  // 설명: 완료된 결제 건수를 계산합니다.
  const completedPaymentCount = monitoringItems.filter((item) => item.status === 'completed').length;
  // 설명: 대기 중인 조건 수를 계산합니다.
  const waitingCount = monitoringItems.filter((item) => item.status === 'waiting' || item.statusLabel?.trim() === '대기 중').length;
  // 설명: 예상 절약 금액을 합산합니다.
  const totalSavingsAmount = monitoringItems.reduce((sum, item) => {
    const currentPrice = formatNumericPrice(item.currentPrice);
    const targetPrice = formatNumericPrice(item.targetPrice);
    return sum + Math.max(targetPrice - currentPrice, 0);
  }, 0);

  // 설명: 대시보드 카드에 보여줄 통계를 구성합니다.
  const stats: DashboardStat[] = [
    { label: '모니터링 중', value: String(monitoringCount), color: 'text-zinc-900 dark:text-zinc-50', icon: TrendingUp },
    { label: '완료된 결제', value: String(completedPaymentCount), color: 'text-zinc-700 dark:text-zinc-300', icon: CheckCircle },
    { label: '조건 대기 중', value: String(waitingCount), color: 'text-zinc-700 dark:text-zinc-300', icon: Clock },
    { label: '총 절약 금액', value: `₩${totalSavingsAmount.toLocaleString()}`, color: 'text-zinc-900 dark:text-zinc-50', icon: DollarSign },
  ];

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

  // 설명: 새 분석 결과를 화면 초기 상태에 반영합니다.
  const applyParsedPreview = (preview: DashboardCommandParseSuccessResponse) => {
    setParsedPreview(preview);
    setCandidates([]);
    setValidationResult(null);
    setSelectedProductIds([]);
    setSelectionSubmitting(false);
    setShowClarificationModal(false);
    setClarificationInput('');
    setClarificationAnswers({});
  };

  // 설명: 자연어 명령을 분석하고 결과를 불러옵니다.
  const handleAnalyzeClick = async (): Promise<void> => {
    const commandText = naturalLanguageInput.trim();
    if (!commandText) {
      await Swal.fire({ icon: 'warning', title: '자연어 입력 필요', text: '명령어를 입력해주세요.', confirmButtonText: '확인', confirmButtonColor: '#1E4D8C' });
      return;
    }

    try {
      setIsAnalyzing(true);

      // 설명: 로그인 사용자 정보를 먼저 가져옵니다.
      const user = await fetchAuthMe();
      if (!user) throw new Error('AUTH_REQUIRED');

      const response: DashboardCommandParseResponse = await parseDashboardCommand({ userId: user.id, commandText });
      if (!response.success) throw new Error(response.message);

      applyParsedPreview(response);

      // 설명: 필요하면 상세 세션도 함께 조회합니다.
      const commandId = response.data.commandId;
      const hasMissingFields = (response.data.missingFields?.length ?? 0) > 0;

      // 미싱필드가 없을 때만 명령 세션 조회해서 상품 목록 받아옴
      if (!hasMissingFields && commandId != null) {
        try {
          const sessionResponse: DashboardCommandDetailResponse = await fetchCommandDetail(commandId);

          if (sessionResponse.success) {
            setCandidates(sessionResponse.data.candidates ?? []);
            setValidationResult(sessionResponse.data.validationResult ?? null);
          }
        } catch {
          // 상품 목록 조회 실패는 치명적이지 않음
        }
      }

      await showSuccessToast('분석 완료');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.';
      const mockCandidate: DashboardCommandCandidateItem = {
        productId: 'mock-product-1',
        title: '삼성 갤럭시 버즈 FE 블루투스 이어폰',
        lprice: '89000',
        mallName: '쿠팡',
        productUrl: 'https://www.coupang.com/vp/products/123456789',
        currency: 'KRW',
        platform: 'coupang',
        searchKeyword: '무선 이어폰',
        imageUrl: 'https://via.placeholder.com/128',
      };

      const mockParseResponse: DashboardCommandParseSuccessResponse = {
        success: true,
        message: 'Mock parse response',
        data: {
          intent: 'shopping.monitor',
          parsedData: {
            productName: '갤럭시 버즈 FE',
            platform: '쿠팡',
            maxPrice: 100000,
            mode: 'ALERT_ONLY',
          },
          missingFields: ['productName', 'maxPrice'],
          ambiguousFields: ['color'],
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
        duplicateProducts: [mockCandidate],
        confirmationMessage: '기존 모니터링 이력이 있습니다.',
      };

      applyParsedPreview(mockParseResponse);
      setCandidates([mockCandidate]);
      setValidationResult(mockValidationResult);
      setSelectedProductIds([]);
      setProductUrlInputs(['']);

      await Swal.fire({
        icon: 'warning',
        title: '서버 연결 실패',
        text: `${errorMessage} / 미리보기용 모의 데이터를 표시합니다.`,
        confirmButtonText: '확인',
        confirmButtonColor: '#1E4D8C',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 설명: 선택한 상품을 서버로 전송하고, 중복 모니터링이 감지되면 재시작 확인을 받습니다.
  const handleSelectionSubmit = async (): Promise<void> => {
    const commandId = parsedPreview?.data.commandId;

    if (!commandId || selectedProductIds.length === 0) {
      return;
    }

    const doSelection = async (forceResubscribe: boolean): Promise<string> => {
      const payload: DashboardCommandSelectionRequest = {
        selectedProductIds: selectedProductIds,
        forceResubscribe,
      };

      const response: DashboardCommandSelectionResponse = await submitCommandSelection(commandId, payload);

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.message;
    };

    const loadSession = async () => {
      try {
        const sessionResponse: DashboardCommandDetailResponse = await fetchCommandDetail(commandId);

        if (sessionResponse.success) {
          setCandidates(sessionResponse.data.candidates ?? []);
          setValidationResult(sessionResponse.data.validationResult ?? null);

          return sessionResponse.data;
        }
      } catch {
        // 세션 조회 실패는 치명적이지 않음
      }

      return null;
    };

    try {
      setSelectionSubmitting(true);

      // 1차 제출: forceResubscribe = false
      await doSelection(false);

      // 선택 완료 후 바로 세션 조회
      const sessionData = await loadSession();

      // 중복 모니터링 확인이 필요한 경우
      if (
        sessionData?.status === 'RESUBSCRIBE_CONFIRMATION_REQUIRED' &&
        (sessionData.validationResult?.duplicateProducts?.length ?? 0) > 0
      ) {
        const confirmResult = await Swal.fire({
          icon: 'question',
          title: '기존 모니터링 확인',
          html: `
            <p class="text-sm text-zinc-700 mb-2">이미 모니터링 중인 상품이 있습니다.</p>
            <p class="text-sm text-zinc-700">기존 모니터링을 갱신하거나 다시 시작하시겠습니까?</p>
          `,
          showCancelButton: true,
          confirmButtonText: '재시작/갱신',
          cancelButtonText: '취소',
          confirmButtonColor: '#1E4D8C',
          cancelButtonColor: '#94A3B8',
          reverseButtons: true,
        });

        if (confirmResult.isConfirmed) {
      // 2차 제출: forceResubscribe = true
          await doSelection(true);

          // 최종 세션 조회
          await loadSession();

          setSelectedProductIds([]);

          await showSuccessToast('모니터링 갱신 완료');
        } else {
          await Swal.fire({
            icon: 'info',
            title: '선택 유지',
            text: '기존 모니터링을 유지합니다. 새로운 조건을 다시 시도해보세요.',
            confirmButtonText: '확인',
            confirmButtonColor: '#1E4D8C',
          });
        }
      } else {
        // 일반 성공
        setSelectedProductIds([]);

        await showSuccessToast('상품 선택 완료');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '상품 선택을 전송하지 못했습니다.';
      await Swal.fire({
        icon: 'error',
        title: '전송 실패',
        text: errorMessage,
        confirmButtonText: '확인',
        confirmButtonColor: '#1E4D8C',
      });
    } finally {
      setSelectionSubmitting(false);
    }
  };

  // 설명: 직접 입력한 상품 URL을 전송합니다.
  const handleProductUrlSubmit = async (): Promise<void> => {
    if (!parsedPreview?.data.commandId) {
      return;
    }

    // 설명: 빈 URL을 제외하고 전송 대상을 정리합니다.
    const urls = productUrlInputs.map((u) => u.trim()).filter(Boolean);

    if (urls.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'URL 입력 필요', text: '상품 URL을 하나 이상 입력해주세요.', confirmButtonText: '확인', confirmButtonColor: '#1E4D8C' });
      return;
    }

    if (urls.length > 5) {
      await Swal.fire({ icon: 'warning', title: '초과', text: '최대 5개의 URL만 입력 가능합니다.', confirmButtonText: '확인', confirmButtonColor: '#1E4D8C' });
      return;
    }

    try {
      setProductUrlSubmitting(true);

      // 설명: URL 목록을 요청 본문으로 구성합니다.
      const payload: DashboardCommandProductLinksRequest = { productUrls: urls };
      const response = await submitCommandProductLinks(parsedPreview.data.commandId, payload);

      if (!response.success) {
        throw new Error(response.message);
      }

      setCandidates(response.data.candidates ?? []);
      setValidationResult(response.data.validationResult ?? null);
      setProductUrlInputs(['']);

      await showSuccessToast('URL 제출 완료');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'URL 전송에 실패했습니다.';
      await Swal.fire({ icon: 'error', title: '전송 실패', text: errorMessage, confirmButtonText: '확인', confirmButtonColor: '#1E4D8C' });
    } finally {
      setProductUrlSubmitting(false);
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
      await Swal.fire({
        icon: 'warning',
        title: '보완 입력 필요',
        text: '추가 설명이나 항목별 답변을 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#1E4D8C',
      });
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
        try {
          const sessionResponse: DashboardCommandDetailResponse = await fetchCommandDetail(sessionId);

          if (sessionResponse.success) {
            setCandidates(sessionResponse.data.candidates ?? []);
            setValidationResult(sessionResponse.data.validationResult ?? null);
          }
        } catch {
          // 세션 조회 실패는 치명적이지 않음
        }
      }

      await showSuccessToast('보완 내용 전송 완료');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '보완 내용을 전송하지 못했습니다.';
      await Swal.fire({
        icon: 'error',
        title: '전송 실패',
        text: errorMessage,
        confirmButtonText: '확인',
        confirmButtonColor: '#1E4D8C',
      });
    } finally {
      setClarificationSubmitting(false);
    }
  };

  // 설명: 검색어와 완료 상태를 기준으로 목록을 줄입니다.
  const filteredMonitoringItems = monitoringItems
    .filter((item) => item.status !== 'completed')
    .filter((item) => item.product.toLowerCase().includes(searchQuery.toLowerCase()));

  // 설명: 현재 분석에서 누락된 항목을 꺼냅니다.
  const missingFields = parsedPreview?.data.missingFields ?? [];

  // 설명: 모니터링 항목을 섹션별로 분류합니다.
  const getMonitoringSectionKey = (item: DashboardMonitoringItem): 'exploring' | 'waiting' | 'other' => {
    const statusLabel = item.statusLabel?.trim();
    if (item.status === 'waiting' || statusLabel === '대기 중') return 'waiting';
    if (item.status === 'exploring' || statusLabel === '탐색 중') return 'exploring';
    return 'other';
  };

  // 설명: 탐색 중인 조건만 추립니다.
  const exploringMonitoringItems = filteredMonitoringItems.filter((item) => getMonitoringSectionKey(item) === 'exploring');
  // 설명: 대기 중인 조건만 추립니다.
  const waitingMonitoringItems = filteredMonitoringItems.filter((item) => getMonitoringSectionKey(item) === 'waiting');
  // 설명: 탐색 섹션 열림 상태를 저장합니다.
  const [isExploringOpen, setIsExploringOpen] = useState(true);
  // 설명: 대기 섹션 열림 상태를 저장합니다.
  const [isWaitingOpen, setIsWaitingOpen] = useState(true);

  // 설명: 모니터링 카드 한 개를 렌더링합니다.
  const renderMonitoringCard = (item: DashboardMonitoringItem) => (
    <div
      key={item.conditionId}
      className="w-full min-w-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:shadow-[0_4px_12px_rgb(15,23,42,0.06)] hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col group relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1E4D8C]/30 to-transparent"></div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
            <Circle
              className="w-1.5 h-1.5"
              style={{
                color: getMonitoringStatusColor(item.status, item.statusLabel),
                fill: getMonitoringStatusColor(item.status, item.statusLabel),
              }}
            />
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-[11px] leading-none">{item.statusLabel}</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] font-medium px-2 py-0.5 rounded"
          style={{
            color: getPlatformColor(item.platform),
            borderColor: `${getPlatformColor(item.platform)}33`,
            backgroundColor: `${getPlatformColor(item.platform)}12`,
          }}
        >
          {getPlatformName(item.platform)}
        </Badge>
      </div>

      <div className="mb-3 flex-1">
        <p className="text-zinc-900 dark:text-zinc-50 font-bold text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors">
          {item.product}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 mt-auto">
        <div className="flex flex-col">
          <span className="text-zinc-700 dark:text-zinc-300 text-[11px] font-medium mb-0.5">목표가</span>
          <span className="text-zinc-900 dark:text-zinc-50 font-semibold text-[13px] sm:text-sm">{item.targetPrice}</span>
        </div>
        <div className="flex items-center justify-center text-zinc-200 font-light text-xl px-2">/</div>
        <div className="flex flex-col items-end flex-1">
          <span className="text-zinc-900 dark:text-zinc-50 text-[11px] font-medium mb-0.5">현재가</span>
          <span className="text-zinc-900 dark:text-zinc-50 font-extrabold text-base sm:text-lg tracking-tight">{item.currentPrice}</span>
        </div>
      </div>
    </div>
  );
  //
  // 설명: 모니터링 섹션 묶음을 렌더링합니다.
  const renderMonitoringSection = (
    title: string,
    description: string,
    items: DashboardMonitoringItem[],
    countBadgeClassName: string,
    isOpen: boolean,
    onToggle: () => void,
  ) => (
    <div className="w-full min-w-0 self-start rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4D8C] to-[#DBE2EF]"></div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-700 px-5 py-4 pt-5 text-left cursor-pointer"
      >
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-[#112D4E] dark:text-zinc-50">{title}</h4>
            <Badge className={countBadgeClassName}>{items.length}건</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-500 dark:text-zinc-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{items.map(renderMonitoringCard)}</div>
          ) : (
            <div className="rounded-[1.5rem] border-2 border-dashed border-[#DBE2EF]/60 dark:border-zinc-700 bg-[#F9F7F7]/50 dark:bg-zinc-950 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#112D4E] dark:text-zinc-50">{title} 조건이 없습니다</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">검색 조건을 바꾸거나 새 분석을 시도해보세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 설명: 대시보드의 전체 화면 레이아웃을 그립니다.
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen font-sans text-zinc-900 dark:text-zinc-50">
      {/* 설명: 상단 히어로와 자연어 입력 영역입니다. */}
      <section className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 w-full pt-16 pb-20 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1E4D8C] via-[#0F3460] to-[#DBE2EF]"></div>
        <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center relative z-10">
          <div className="mb-4 flex h-12 items-center text-4xl font-medium text-zinc-700 dark:text-zinc-300 md:text-4xl">
            <span className="relative inline-grid h-12 items-center overflow-hidden text-[#1E4D8C] dark:text-[#7BAEDA] transition-[width] duration-300">
              <span className="invisible whitespace-nowrap font-bold">{rotatingCommandMessages[rotatingMessageIndex]}</span>
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-bold transition-all duration-300 ${isRotatingMessageVisible ? 'translate-y-[-50%] opacity-100' : 'translate-y-[-70%] opacity-0'}`}>
                {rotatingCommandMessages[rotatingMessageIndex]}
              </span>
            </span>
            <span>&nbsp;찾고 계신가요?</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-10">
            원하는 가격, <span className="relative inline-block"><span className="relative z-10 text-[#1E4D8C] dark:text-[#7BAEDA]">알아서 척척</span><span className="absolute bottom-1 left-0 w-full h-3 bg-[#DBE2EF] dark:bg-[#1E4D8C]/30 -z-10 rounded-sm skew-x-[-10deg]"></span></span> 찾아드려요.
          </h1>

          <div className="w-full max-w-3xl bg-white dark:bg-zinc-800 rounded-[2rem] shadow-[0_8px_32px_rgb(15,23,42,0.06)] border border-zinc-200 dark:border-zinc-700 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] rounded-t-[2rem]"></div>
            <div className="p-4 pt-5 flex flex-col gap-3">
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-2 ring-1 ring-[#E2E8F0] focus-within:bg-zinc-100 dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-[#1E4D8C]/30 dark:focus-within:ring-[#7BAEDA]/30 transition-all duration-300">
                <textarea
                  rows={1}
                  placeholder="예: 쿠팡에서 탐사수 7000원 밑으로 알림"
                  value={naturalLanguageInput}
                  onFocus={() => setIsCommandInputFocused(true)}
                  onBlur={() => window.setTimeout(() => setIsCommandInputFocused(false), 150)}
                  onChange={(e) => {
                    setNaturalLanguageInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  className="w-full bg-transparent border-none px-4 py-3 text-zinc-900 dark:text-zinc-50 text-lg placeholder:text-zinc-700 dark:placeholder:text-zinc-400 focus:outline-none resize-none min-h-[60px] font-medium"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 px-2">
                <Button
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] dark:hover:from-[#7BAEDA] hover:to-[#0F3460] dark:hover:to-[#1E4D8C] hover:-translate-y-0.5 rounded-xl h-12 px-8 text-base font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)] transition-all duration-300 w-full sm:w-auto group border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => void handleAnalyzeClick()}
                  onMouseEnter={() => setIsAnalyzeBtnHovered(true)}
                  onMouseLeave={() => setIsAnalyzeBtnHovered(false)}
                >
                  {isAnalyzing ? (
                    <LogoIcon className="w-4 h-4 mr-2 animate-spin" animated={false} mouth="open" />
                  ) : (
                    <LogoIcon className="w-4 h-4 mr-2" animated={false} mouth={isAnalyzeBtnHovered ? 'open' : 'auto'} />
                  )}
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
                    입력 보완하기
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
                <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-[95vw] sm:max-w-2xl bg-white dark:bg-zinc-800 rounded-3xl p-0 overflow-hidden border-zinc-200 dark:border-zinc-700 shadow-xl">
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-zinc-900 dark:text-zinc-50 text-xl font-bold">조건 보완</DialogTitle>
                    <DialogDescription className="text-zinc-700 dark:text-zinc-300">
                      AI가 이해한 값은 유지되고, 누락된 항목만 추가로 입력합니다.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 px-6 pb-2 mt-2 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">누락된 항목 입력</h4>
                      </div>

                      {missingFields.length > 0 ? (
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          {missingFields.map((field) => {
                            const config = getClarificationFieldConfig(field);
                            const isNumericField = field === 'maxPrice' || field === 'minPrice';

                            return (
                              <div key={field} className="space-y-2 md:col-span-2">
                                <Label className="text-zinc-700 dark:text-zinc-300 text-sm">{config.label}</Label>
                                <Input
                                  value={clarificationAnswers[field] ?? ''}
                                  onChange={(e) => setClarificationAnswers((prev) => ({ ...prev, [field]: e.target.value }))}
                                  placeholder={config.placeholder}
                                  inputMode={isNumericField ? 'numeric' : 'text'}
                                  className="bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 focus-visible:ring-2 focus-visible:ring-[#1E4D8C]/30 focus-visible:border-[#1E4D8C]/40 dark:focus-visible:border-[#7BAEDA]/50"
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                          구조화된 추가 입력은 필요하지 않아요.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-zinc-700 dark:text-zinc-300 text-sm">추가 설명(선택)</Label>
                        <span className="text-xs text-zinc-500 dark:text-zinc-300">필요할 때만</span>
                      </div>
                      <textarea
                        value={clarificationInput}
                        onChange={(e) => setClarificationInput(e.target.value)}
                        placeholder="예: 블랙 모델이 아니라 화이트 모델입니다."
                        className="min-h-[96px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1E4D8C]/30"
                      />
                    </div>
                  </div>

                  <DialogFooter className="bg-zinc-100 dark:bg-zinc-900 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 sm:justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowClarificationModal(false);
                      }}
                      className="rounded-xl px-6 py-2 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      닫기
                    </Button>
                    <Button type="button" onClick={() => void handleClarificationSubmit()} disabled={clarificationSubmitting} className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] dark:hover:from-[#7BAEDA] hover:to-[#0F3460] dark:hover:to-[#1E4D8C] shadow-[0_4px_10px_rgba(30,77,140,0.25)] border-none font-bold">
                      {clarificationSubmitting ? '전송 중...' : '보완 내용 보내기'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 설명: 분석 완료 상태를 표시합니다. */}
              {parsedPreview && !parsedPreview.data.needsClarification && (
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-4 text-left">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">분석 완료</p>
                  <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">추가 입력 없이도 조건 분석이 끝났어요.</p>
                </div>
              )}

              {/* 설명: 상품 URL 직접 입력 영역입니다. */}
              {parsedPreview && (
                <div className="mx-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput((prev) => !prev)}
                    aria-expanded={showUrlInput}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors cursor-pointer"
                  >
                    <span>원하는 상품이 목록에 없나요?</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${showUrlInput ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUrlInput && (
                    <div className="mt-2 rounded-[1.5rem] border border-dashed border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 text-left shadow-sm">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 mb-2">직접 상품 URL 입력 (최대 5개)</h4>
                      <div className="flex flex-col gap-2">
                        {productUrlInputs.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => {
                                const next = [...productUrlInputs];
                                next[index] = e.target.value;
                                setProductUrlInputs(next);
                              }}
                              placeholder={`URL ${index + 1}`}
                              className="flex-1 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm h-9 transition-all duration-200"
                            />
                            {index === productUrlInputs.length - 1 && productUrlInputs.length < 5 && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setProductUrlInputs((prev) => [...prev, ''])}
                                className="shrink-0 rounded-xl px-3 text-xs h-9"
                              >
                                +
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        onClick={() => void handleProductUrlSubmit()}
                        disabled={productUrlSubmitting}
                        className="mt-3 rounded-xl bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white px-4 py-1.5 text-xs font-bold"
                      >
                        {productUrlSubmitting ? '전송 중...' : 'URL 제출'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* 설명: 후보 상품 목록과 선택 버튼을 보여줍니다. */}
              {candidates.length > 0 ? (
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 text-left shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">상품 목록</h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-300">최대 {candidates.length}개</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* 설명: 후보별 상태 배지를 계산해 렌더링합니다. */}
                    {(() => {
                      const triggeredIds = new Set((validationResult?.triggeredProducts ?? []).map((p) => p.productId));
                      const monitoringIds = new Set((validationResult?.monitoringProducts ?? []).map((p) => p.productId));
                      const duplicateIds = new Set((validationResult?.duplicateProducts ?? []).map((p) => p.productId));

                      return candidates.map((item) => {
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
                            className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                              selectedProductIds.includes(item.productId)
                                ? 'border-[#1E4D8C] dark:border-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 ring-2 ring-[#1E4D8C]/30 dark:ring-[#7BAEDA]/30'
                                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:shadow-sm'
                            }`}
                          >
                            <img src={item.imageUrl} alt={item.title} className="w-16 h-16 rounded-lg object-cover shrink-0 bg-white" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">{stripHtmlTags(item.title)}</div>
                              {badgeText && (
                                <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight ${badgeClass}`}>
                                  {badgeText}
                                </span>
                              )}
                              <div className="mt-1.5 text-sm font-bold text-[#1E4D8C] dark:text-[#7BAEDA]">₩{Number(item.lprice).toLocaleString()}</div>
                              <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-300">{item.mallName} · {item.platform}</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {selectedProductIds.length > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <span className="text-xs text-zinc-500 dark:text-zinc-300">{selectedProductIds.length}개 선택됨</span>
                      <Button
                        type="button"
                        onClick={() => void handleSelectionSubmit()}
                        disabled={selectionSubmitting}
                        className="rounded-xl bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white px-6 py-2 font-bold"
                      >
                        {selectionSubmitting ? '전송 중...' : '선택 완료'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (isCommandInputFocused || naturalLanguageInput.trim().length > 0) && (
                // 설명: 입력 예시와 사용 팁을 안내합니다.
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-5 text-left shadow-inner">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">이렇게 입력해 보세요!</h3>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-3">원하는 문장을 클릭해 자연어 쇼핑 명령을 빠르게 입력할 수 있어요.</p>
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
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50 transition hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 hover:shadow-[0_2px_8px_rgb(217,119,6,0.08)] hover:bg-[#F9F7F7] dark:hover:bg-[#1E4D8C]/10 hover:text-[#1E4D8C] dark:hover:text-[#7BAEDA] hover:-translate-y-0.5 cursor-pointer"
                          >
                            "{text}"
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-700 pt-4 md:pt-0 md:pl-6">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 text-[#1E4D8C] dark:text-[#7BAEDA] flex items-center justify-center text-xs shadow-sm border border-[#1E4D8C]/10">💡</span>
                        이런 것도 알아들어요
                      </h4>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 space-y-3 font-medium">
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-zinc-900 dark:text-zinc-50">플랫폼:</strong> 네이버 쇼핑, 네이버 항공, 쿠팡, 알리익스프레스 등</p></div>
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-zinc-900 dark:text-zinc-50">상품 정보:</strong> 브랜드명, 정확한 모델명, 사이즈, 색상 등</p></div>
                        <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#1E4D8C]/50 mt-1.5 flex-shrink-0" /><p><strong className="text-zinc-900 dark:text-zinc-50">조건 액션:</strong> 얼마 이하, 즉시 결제, 알림만, 대기 등</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* 설명: 모니터링 현황과 목록을 보여줍니다. */}
      <section className="py-16 px-4 md:px-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#112D4E] dark:text-zinc-50">나의 모니터링 현황</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mt-2 font-medium">지금까지 AI가 얼마나 절약해 주었는지 확인해보세요.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            {/* 설명: 통계 카드들을 순서대로 보여줍니다. */}
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const cardStyles = [
                'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
                'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
                'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
                'bg-gradient-to-br from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] border-transparent text-white',
              ];
              const labelColors = ['text-zinc-700 dark:text-zinc-300', 'text-zinc-700 dark:text-zinc-300', 'text-zinc-700 dark:text-zinc-300', 'text-[#DBE2EF]'];
              const valueColors = ['text-zinc-900 dark:text-zinc-50', 'text-zinc-900 dark:text-zinc-50', 'text-zinc-900 dark:text-zinc-50', 'text-white'];
              const iconColors = ['text-[#1E4D8C] dark:text-[#7BAEDA]', 'text-[#1E4D8C] dark:text-[#7BAEDA]', 'text-[#1E4D8C] dark:text-[#7BAEDA]', 'text-white'];
              const iconBgs = ['bg-[#F9F7F7] dark:bg-[#1E4D8C]/10', 'bg-[#F9F7F7] dark:bg-[#1E4D8C]/10', 'bg-[#F9F7F7] dark:bg-[#1E4D8C]/10', 'bg-white/20'];

              return (
                <div key={index} className={`border rounded-[1.5rem] p-6 flex flex-col justify-center shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-lg hover:border-[#1E4D8C]/40 dark:hover:border-[#7BAEDA]/50 transition-all duration-300 ${cardStyles[index % 4]}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${iconBgs[index % 4]} flex items-center justify-center border-none`}><Icon className={`w-5 h-5 ${iconColors[index % 4]}`} /></div>
                    <div className={`text-[13px] font-bold ${labelColors[index % 4]}`}>{stat.label}</div>
                  </div>
                  <div className={`text-[28px] font-extrabold tracking-tight text-center ${valueColors[index % 4]}`}>{stat.value}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            {/* 설명: 현재 진행 중인 모니터링 목록을 배치합니다. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-[#112D4E] dark:text-zinc-50 md:text-2xl">진행 중인 모니터링</h3>
                <Badge variant="secondary" className="bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 text-[#1E4D8C] dark:text-[#7BAEDA] hover:bg-[#F9F7F7] dark:hover:bg-[#1E4D8C]/10 border border-[#DBE2EF] dark:border-[#1E4D8C]/30 font-semibold rounded-md px-2 py-0.5 text-xs">총 {filteredMonitoringItems.length}건</Badge>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <Input type="text" placeholder="상품명 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus-visible:ring-1 focus-visible:ring-[#1E4D8C]/40 dark:focus-visible:ring-[#7BAEDA]/40 focus-visible:border-[#1E4D8C]/40 dark:focus-visible:border-[#7BAEDA]/50 rounded-lg h-10 transition-all placeholder:text-zinc-700 dark:placeholder:text-zinc-400" />
              </div>
            </div>

            {filteredMonitoringItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {renderMonitoringSection(
                  '탐색 중인 조건',
                  'AI가 실시간으로 가격과 조건 충족 여부를 추적하고 있습니다.',
                  exploringMonitoringItems,
                  'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border border-[#F8FAFC] font-semibold rounded-md px-2 py-0.5 text-xs',
                  isExploringOpen,
                  () => setIsExploringOpen((prev) => !prev),
                )}
                {renderMonitoringSection(
                  '대기 중인 조건',
                  '조건은 등록되었고, 다음 이벤트나 가격 변화를 기다리고 있습니다.',
                  waitingMonitoringItems,
                  'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-[#F8FAFC] font-semibold rounded-md px-2 py-0.5 text-xs',
                  isWaitingOpen,
                  () => setIsWaitingOpen((prev) => !prev),
                )}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center bg-zinc-50 dark:bg-zinc-950 rounded-[1.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4 text-zinc-700 dark:text-zinc-300"><Search className="w-5 h-5" /></div>
                <h4 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 mb-1">모니터링 중인 상품이 없습니다</h4>
                <p className="text-zinc-700 dark:text-zinc-300 text-sm">상단 입력창을 통해 원하는 상품을 분석해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
