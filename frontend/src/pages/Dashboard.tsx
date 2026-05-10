import { TrendingUp, CheckCircle, Clock, DollarSign, Send, Circle, Search, MessageSquare, Bot, Sparkles } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog.tsx';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import {
  createDashboardMonitoringItem,
  createMonitoringCondition,
  fetchDashboardStatsSummary,
} from '../api/dashboard';
import { 
  fetchConditionDetail, 
  fetchDashboardMonitoringItems } from '../api/condition';
import type {
  DashboardMonitoringItem,
  DashboardMonitoringCreateResponse,
  DashboardCommandParsedData,
  DashboardParsedConditionChip,
  DashboardStat,
  DashboardStatsSummary,
} from '../types/dashboard';

type PaymentMode = 'ALERT_ONLY' | 'AUTO_PAYMENT';

type ProductDetailDraft = {
  productName: string;
  platform: string;
  options: string; //원래 productDetail
  targetPrice: string;
  monitoringRegisteredAt: string;  //추후 createdAt으로 변경 가능
  paymentMode: PaymentMode;  //추후 mode로 변경 가능
  expiryYear: string;
  expiryMonth: string;
  expiryDay: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    detail?: string | null;
  };
};

const shoppingCommandExamples = [
  '네이버 항공에서 인천-오사카 25만원 이하면 바로 결제해줘',
  '나이키 에어포스 1 화이트 270 사이즈 10만원 이하 자동결제'
];

const rotatingCommandMessages = [
  '항공권',
  '생필품',
  '신발',
  '전자기기',
];

const mockCommandIdSeed = Date.now();

const getMockCommandId = () => Math.floor(mockCommandIdSeed + Math.random() * 100000);

const detectPlatformFromCommand = (commandText: string): DashboardMonitoringItem['platform'] => {
  const normalizedText = commandText.toLowerCase();

  if (normalizedText.includes('쿠팡')) return 'coupang';
  if (normalizedText.includes('11번가') || normalizedText.includes('11st')) return '11st';
  if (normalizedText.includes('g마켓') || normalizedText.includes('gmarket')) return 'gmarket';
  if (normalizedText.includes('옥션') || normalizedText.includes('auction')) return 'auction';
  if (normalizedText.includes('항공')) return 'naver-flights';
  if (normalizedText.includes('네이버')) return 'naver';

  return '';
};

const detectTargetPriceFromCommand = (commandText: string): string => {
  const match = commandText.match(/(\d+[\d,]*)\s*(만원|원)/);

  if (!match) {
    return '';
  }

  const amount = Number(match[1].replace(/,/g, ''));

  if (Number.isNaN(amount)) {
    return '';
  }

  return match[2] === '만원' ? String(amount * 10000) : String(amount);
};

const buildMockCommandPreview = (commandText: string): DashboardMonitoringCreateResponse => {
  const platform = detectPlatformFromCommand(commandText);
  const targetPrice = detectTargetPriceFromCommand(commandText);

  return {
    success: true,
    message: '서버 연결 없이 로컬 미리보기로 표시합니다.',
    data: {
      commandId: getMockCommandId(),
      status: 'mock-preview',
      parsedData: {
        productName: commandText,
        platform,
        maxPrice: targetPrice ? Number(targetPrice) : undefined,
        mode: commandText.includes('자동결제') || commandText.includes('바로 결제') ? 'AUTO_PAYMENT' : 'ALERT_ONLY',
        options: '',
      },
      missingFields: [
        ...(platform ? [] : ['platform']),
        ...(targetPrice ? [] : ['maxPrice']),
      ],
    },
  };
};

const getCurrentLocalDateText = () =>
  new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const createProductDetailDraft = (productName = ''): ProductDetailDraft => {
  const now = new Date();

  return {
    productName,
    platform: '',
    options: '',
    targetPrice: '',
    monitoringRegisteredAt: getCurrentLocalDateText(),
    paymentMode: 'ALERT_ONLY',
    expiryYear: String(now.getFullYear()),
    expiryMonth: '',
    expiryDay: '',
  };
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const getExpiryDateText = (draft: ProductDetailDraft) =>
  `${draft.expiryYear}-${draft.expiryMonth.padStart(2, '0')}-${draft.expiryDay.padStart(2, '0')}`;

const buildProductDetailDraftFromParsedData = (parsedData: DashboardCommandParsedData): ProductDetailDraft => {
  const now = new Date();

  return {
    productName: parsedData.productName || '',
    platform: parsedData.platform || '',
    options: parsedData.route || parsedData.options || '',
    targetPrice: parsedData.maxPrice != null ? String(parsedData.maxPrice) : '',
    monitoringRegisteredAt: getCurrentLocalDateText(),
    paymentMode: parsedData.mode || 'ALERT_ONLY',
    expiryYear: String(now.getFullYear()),
    expiryMonth: '',
    expiryDay: '',
  };
};

// 2026-05-08: Palette Shift -> Option 7 (Full Dark Mode Support)
// Extended the Option 6 Unified Card System to support Tailwind dark mode.
// Added dark:bg-slate-800/900/950 for surfaces, dark:text-slate-50/400 for text hierarchy,
// and dark:border-slate-700/600 for card borders. Preserved semantic Indigo accents.
// 2026-05-08: Palette Shift -> Option 6 (Unified Card System)
// Unfied the card language to eliminate visual disharmony:
// - All primary cards now share identical border radii (rounded-[1.5rem] or rounded-xl)
// - All primary cards share the same subtle drop shadow: shadow-[0_2px_12px_rgb(15,23,42,0.04)]
// - Eliminated tinted/dashed backgrounds on standard stat cards so they read as a unified family
// - Standardized hover physics (border-[#6366F1]/40, shadow-lg, -translate-y)
// - Kept the "Total Savings" stat card emphasized (Indigo gradient) but matching the physical card constraints.
export default function Dashboard() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [rotatingMessageIndex, setRotatingMessageIndex] = useState(0);
  const [isRotatingMessageVisible, setIsRotatingMessageVisible] = useState(true);
  const [isCommandInputFocused, setIsCommandInputFocused] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DashboardMonitoringItem | null>(null);
  // 상세 입력 모달에서 사용할 상품 정보를 따로 보관한다.
  const [productDetailDraft, setProductDetailDraft] = useState<ProductDetailDraft>(() =>
    createProductDetailDraft(),
  );
  const [platformIsLocked, setPlatformIsLocked] = useState(false);
  const [pendingPreviewResponse, setPendingPreviewResponse] = useState<DashboardMonitoringCreateResponse | null>(null);
  const [parsedConditionBadges, setParsedConditionBadges] = useState<DashboardParsedConditionChip[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardStatsSummary, setDashboardStatsSummary] = useState<DashboardStatsSummary>({
    monitoringCount: 0,
    completedPaymentCount: 0,
    waitingCount: 0,
    totalSavingsAmount: 0,
  });

  // [수정] 모니터링 목록은 대시보드 전용 타입으로 명시한다.
  const [monitoringItems, setMonitoringItems] = useState<DashboardMonitoringItem[]>([
    {
      conditionId: 1,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#16a34a',
      product: '인천-오사카 왕복 항공권(테스트)',
      platform: 'naver-flights',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    },
     {
      conditionId: 3,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#16a34a',
      product: '인천-오사카 왕복 항공권(테스트)',
      platform: 'coupang',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    },
     {
      conditionId: 4,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#16a34a',
      product: '인천-오사카 왕복 항공권(테스트)',
      platform: 'naver-flights',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    },
    {
      conditionId: 2,
      status: 'waiting',
      statusLabel: '대기 중',
      statusColor: '#f97316',
      product: 'PS5 디지털 에디션(테스트)',
      platform: 'naver-flights',
      currentPrice: '₩609,000',
      targetPrice: '₩590,000',
    }
  ]);

  // [추가] 대시보드 상단에 보여줄 핵심 지표 카드의 정보를 담는 배열이다.
  const stats: DashboardStat[] = [ 
    {
      label: '모니터링 중',
      value: String(dashboardStatsSummary.monitoringCount),
      color: 'text-[#0F172A] dark:text-slate-50',
      icon: TrendingUp,
    },
    {
      label: '완료된 결제',
      value: String(dashboardStatsSummary.completedPaymentCount),
      color: 'text-[#334155] dark:text-slate-300',
      icon: CheckCircle,
    },
    {
      label: '조건 대기 중',
      value: String(dashboardStatsSummary.waitingCount),
      color: 'text-[#475569] dark:text-slate-400',
      icon: Clock,
    },
    {
      label: '총 절약 금액',
      value: `₩${dashboardStatsSummary.totalSavingsAmount.toLocaleString()}`,
      color: 'text-[#0F172A] dark:text-slate-50',
      icon: DollarSign,
    },
  ];

  // [추가] 핵심 지표 수치는 전용 summary API에서 받아온다.
  useEffect(() => {
    const loadDashboardStatsSummary = async () => {
      try {
        const summary = await fetchDashboardStatsSummary();
        setDashboardStatsSummary(summary);
      } catch {
        setDashboardStatsSummary({
          monitoringCount: 0,
          completedPaymentCount: 0,
          waitingCount: 0,
          totalSavingsAmount: 0,
        });
      }
    };

    void loadDashboardStatsSummary();
  }, []);

  // [추가] 대시보드 모니터링 목록만 먼저 시도하고, 실패하면 현재 mock 상태를 유지한다.
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        // 서버에서 받은 목록으로 현재 화면의 모니터링 항목을 전부 교체한다.
        const monitoringList = await fetchDashboardMonitoringItems();
        setMonitoringItems(monitoringList);
      } catch {
        // [추가] 서버 응답이 없을 때는 기존 mock 목록을 유지한다.
        setError('실시간 모니터링 목록을 불러오지 못했습니다. 현재는 로컬 mock 데이터를 표시합니다.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  useEffect(() => {
    // 2026-05-08: 히어로 문구에서 상품 카테고리만 순환 노출되도록 애니메이션을 적용한다.
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
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleExecuteClick = async (): Promise<void> => {
    const commandText = naturalLanguageInput.trim();

    // 서버 응답을 받아 파싱된 플랫폼은 잠그고, 그렇지 않으면 직접 입력할 수 있게 둔다.
    try {
      const response = await createMonitoringCondition(commandText);
      const parsedData = response.data.parsedData;

      setPlatformIsLocked(Boolean(parsedData.platform));
      setPendingPreviewResponse(response);
      setMissingFields(response.data.missingFields ?? []);
      setParsedConditionBadges(getParsedConditionBadges(parsedData));
      setProductDetailDraft(buildProductDetailDraftFromParsedData(parsedData));
      setShowConfirmDialog(true);
    } catch (error: unknown) {
      const errorResponse = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data : null;
      const errorCode = errorResponse?.error?.code;
      const errorMessage = errorResponse?.error?.message;
      const isServerUnavailable = axios.isAxiosError(error) && !error.response;

      // 2026-05-08: UI 검증을 위해 서버 미연결 시에도 로컬 mock 파싱 결과로 상세 입력 모달을 계속 열 수 있게 한다.
      if (isServerUnavailable) {
        const mockPreview = buildMockCommandPreview(commandText);
        const parsedData = mockPreview.data.parsedData;

        setPlatformIsLocked(Boolean(parsedData.platform));
        setPendingPreviewResponse(mockPreview);
        setMissingFields(mockPreview.data.missingFields ?? []);
        setParsedConditionBadges(getParsedConditionBadges(parsedData));
        setProductDetailDraft(buildProductDetailDraftFromParsedData(parsedData));
        setShowConfirmDialog(true);

        await Swal.fire({
          icon: 'info',
          title: '로컬 미리보기 모드',
          text: '서버 연결 없이도 UI 검증이 가능하도록 로컬 mock 데이터로 계속 진행합니다.',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
        return;
      }

      //에러 처리는 에러 코드에 따라 구분
      if (errorCode === 'VALIDATION001') {
        await Swal.fire({
          icon: 'warning',
          title: '자연어 입력 필요',
          text: errorMessage || '명령어를 입력해주세요',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
      } else if (errorCode === 'VALIDATION002') {
        await Swal.fire({
          icon: 'warning',
          title: '입력 길이 초과',
          text: errorMessage || '명령어는 500자를 초과할 수 없습니다',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
      }  else if (errorCode === 'COMMAND001') {
        await Swal.fire({
          icon: 'warning',
          title: '쇼핑 관련 명령을 입력해주세요',
          text: errorMessage || '예) 쿠팡, 신발, 9만원 이하, 바로 결제..',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
      } else if (errorCode === 'AI001') {
        await Swal.fire({
          icon: 'warning',
          title: 'AI 응답 지연',
          text: errorMessage || 'AI 응답이 10초를 초과했습니다. 잠시 후 다시 시도해주세요',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
      }
      setPlatformIsLocked(false);
      setPendingPreviewResponse(null);
      setParsedConditionBadges([]);
      setMissingFields([]);
      setProductDetailDraft(createProductDetailDraft(commandText));
    }
  };

  const handleConfirmMonitoring = async () => {
    // 최종 전송 문자열은 상세 입력 폼의 값들만 합쳐 만든다.
    if (missingFields.includes('productName') && !productDetailDraft.productName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '상품명 입력 필요',
        text: '상품명을 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }

    if (missingFields.includes('route') && !productDetailDraft.options.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '상품 디테일 입력 필요',
        text: '상품 디테일을 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }

    if (missingFields.includes('maxPrice') && !productDetailDraft.targetPrice.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '목표가 입력 필요',
        text: '목표가를 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }

    if (!productDetailDraft.expiryMonth || !productDetailDraft.expiryDay) {
      await Swal.fire({
        icon: 'warning',
        title: '만료일 선택 필요',
        text: '모니터링 만료일의 월과 일을 선택해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }
    
    const registrationDate = new Date();
    registrationDate.setHours(0, 0, 0, 0);
    const expiryDate = new Date(
      Number(productDetailDraft.expiryYear),
      Number(productDetailDraft.expiryMonth) - 1,
      Number(productDetailDraft.expiryDay),
    );

    if (expiryDate.getTime() < registrationDate.getTime()) {
      await Swal.fire({
        icon: 'warning',
        title: '만료 날짜 오류',
        text: '모니터링 만료 날짜는 등록일보다 과거일 수 없습니다. 날짜를 다시 선택해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }

    if (!platformIsLocked && !productDetailDraft.platform.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '플랫폼 입력 필요',
        text: '플랫폼을 직접 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
      return;
    }

    if (!pendingPreviewResponse) { // 데이터가 없으면 진행하지 않는다는 안전장치 
      return;
    }

    try {
      const result = await createDashboardMonitoringItem({
        commandId: pendingPreviewResponse.data.commandId,
        productName: productDetailDraft.productName.trim(),
        platform: (productDetailDraft.platform.trim() || pendingPreviewResponse.data.parsedData.platform || '') as DashboardMonitoringItem['platform'],
        route: pendingPreviewResponse.data.parsedData.route || undefined,
        productDetail: productDetailDraft.options.trim(),
        targetPrice: productDetailDraft.targetPrice.trim(),
        monitoringRegisteredAt: productDetailDraft.monitoringRegisteredAt,
        paymentMode: productDetailDraft.paymentMode,
        expiryDate: getExpiryDateText(productDetailDraft),
      });

      const refreshedMonitoringItems = await fetchDashboardMonitoringItems();
      setMonitoringItems(refreshedMonitoringItems);
      setNaturalLanguageInput('');
      setError('');

      setShowConfirmDialog(false);
      setProductDetailDraft(createProductDetailDraft());
      setPlatformIsLocked(false);
      setPendingPreviewResponse(null);
      setMissingFields([]);

      await Swal.fire({
        icon: 'success',
        title: '모니터링 시작',
        text: result.message || '모니터링이 시작되었습니다.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
    } catch (error: unknown) {
      const isServerUnavailable = axios.isAxiosError(error) && !error.response;

      if (isServerUnavailable) {
        const localMonitoringItem: DashboardMonitoringItem = {
          conditionId: getMockCommandId(),
          status: 'exploring',
          statusLabel: '탐색 중',
          statusColor: getMonitoringStatusColor('exploring', '탐색 중'),
          product: productDetailDraft.productName.trim() || naturalLanguageInput.trim() || '로컬 모니터링 항목',
          platform: (productDetailDraft.platform.trim() || pendingPreviewResponse.data.parsedData.platform || '') as DashboardMonitoringItem['platform'],
          currentPrice: '-',
          targetPrice: productDetailDraft.targetPrice.trim() ? `₩${Number(productDetailDraft.targetPrice).toLocaleString()}` : '-',
        };

        setMonitoringItems((prev) => [localMonitoringItem, ...prev]);
        setNaturalLanguageInput('');
        setError('서버 연결 없이 로컬 mock 데이터로 UI를 표시하고 있습니다.');
        setShowConfirmDialog(false);
        setProductDetailDraft(createProductDetailDraft());
        setPlatformIsLocked(false);
        setPendingPreviewResponse(null);
        setMissingFields([]);
        setParsedConditionBadges([]);

        await Swal.fire({
          icon: 'success',
          title: '로컬 모니터링 추가',
          text: '서버 연결 없이도 UI 검증이 가능하도록 로컬 mock 항목을 추가했습니다.',
          confirmButtonText: '확인',
          confirmButtonColor: '#6366F1',
        });
        return;
      }

      const errorResponse = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data : null;
      const errorMessage = errorResponse?.error?.message;

      await Swal.fire({
        icon: 'error',
        title: '모니터링 시작 실패',
        text: errorMessage || '서버에 모니터링 정보를 저장하지 못했습니다.',
        confirmButtonText: '확인',
        confirmButtonColor: '#6366F1',
      });
    }
  };
  // 모니터링 항목 클릭 시 상세 정보 다이얼로그 열기
  //any타입에서 -> DashboardMonitoringItem으로 변경
  const handleDetailClick = async (item: DashboardMonitoringItem) => {
    const conditionId = item.conditionId;

    if (conditionId == null) {
      return;
    }

    try {
      // 상세 모달은 목록 데이터가 아니라 선택한 conditionId의 최신 상세값으로 채운다.
      const detail = await fetchConditionDetail(conditionId);
      setSelectedItem({
        ...item,
        conditionId,
        product: detail.keyword,
        platform: detail.platform as DashboardMonitoringItem['platform'],
        currentPrice: detail.currentPrice != null ? `₩${detail.currentPrice.toLocaleString()}` : '-',
        targetPrice: `₩${detail.maxPrice.toLocaleString()}`,
        status: item.status,
        statusLabel: item.statusLabel,
        statusColor: getMonitoringStatusColor(item.status, item.statusLabel),
      });
    } catch {
      setSelectedItem({
        ...item,
        conditionId,
      });
    } finally {
      setShowDetailDialog(true);
    }
  };

  // 가격 차이 계산 함수
  const calculatePriceDifference = (currentPrice: string, targetPrice: string) => {
    const current = parseInt(currentPrice.replace('₩', '').replace(',', '').replace('-', '0'));
    const target = parseInt(targetPrice.replace('₩', '').replace(',', ''));
    
    if (current === 0) {
      return '가격 수집 중...';
    }
    
    const difference = current - target;
    
    if (difference > 0) {
      return `목표가보다 ₩${difference.toLocaleString()} 높음`;
    } else if (difference < 0) {
      return `목표가보다 ₩${Math.abs(difference).toLocaleString()} 낮음`;
    } else {
      return '목표가와 동일';
    }
  };

  // 플랫폼 이름 변환 함수
  const getPlatformName = (platform: string) => {
    const platformMap: { [key: string]: string } = {
      'naver': '네이버 쇼핑',
      'coupang': '쿠팡',
      '11st': '11번가',
      'gmarket': 'G마켓',
      'auction': '옥션',
      'naver-flights': '네이버 항공',
    };
    return platformMap[platform] || platform;
  };

  // 플랫폼 색상 매핑
  const getPlatformColor = (platform: string) => {
    const colorMap: { [key: string]: string } = {
      'naver': '#03c75a',
      'coupang': '#ff6b6b',
      'naver-flights': '#03c75a',
    };
    return colorMap[platform] || '#0463e7';
  };

  // 2026-05-08: 상태별 색도 공통 함수로 관리해 탐색 중은 초록점, 대기 중은 주황점으로 일관되게 표시한다.
  const getMonitoringStatusColor = (status: DashboardMonitoringItem['status'], statusLabel?: string) => {
    if (status === 'waiting' || statusLabel?.trim() === '대기 중') {
      return '#f97316';
    }

    if (status === 'exploring' || statusLabel?.trim() === '탐색 중') {
      return '#16a34a';
    }

    return '#6366F1';
  };

  // 파싱이 되었으면 파싱된 플랫폼명을, 아니면 미선택 표시를 한다.
  const getProductPlatformBadgeLabel = () => productDetailDraft.platform.trim() || '미선택';

  // 만료일 선택 옵션을 동적으로 생성하는 함수들
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, index) => String(currentYear + index));
  };

  const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => String(index + 1));

  const getDayOptions = () => {
    if (!productDetailDraft.expiryMonth) {
      return [];
    }

    const year = Number(productDetailDraft.expiryYear);
    const month = Number(productDetailDraft.expiryMonth);
    const maxDay = getDaysInMonth(year, month);

    return Array.from({ length: maxDay }, (_, index) => String(index + 1));
  };

  // 만료일의 연도/월이 변경될 때, 기존에 선택된 일이 유효한지 검증해서 유효하지 않으면 초기화한다.
  useEffect(() => {
    const year = Number(productDetailDraft.expiryYear);
    const month = Number(productDetailDraft.expiryMonth);
    const maxDay = getDaysInMonth(year, month);
    const currentDay = Number(productDetailDraft.expiryDay);

    if (currentDay > maxDay) {
      setProductDetailDraft((prev) => ({
        ...prev,
        expiryDay: String(maxDay),
      }));
    }
  }, [productDetailDraft.expiryYear, productDetailDraft.expiryMonth, productDetailDraft.expiryDay]);

  // 서버가 내려준 파싱 결과를 화면용 배지 데이터로 정규화한다.
  const getParsedConditionBadges = (parsedData: DashboardCommandParsedData) => {
    const badges: DashboardParsedConditionChip[] = [];

    if (parsedData.platform) {
      badges.push({ label: '플랫폼', value: parsedData.platform });
    }

    if (parsedData.route) {
      badges.push({ label: '경로', value: parsedData.route });
    }

    if (parsedData.maxPrice != null) {
      badges.push({ label: '최대가', value: `₩${Number(parsedData.maxPrice).toLocaleString()}` });
    }

    if (parsedData.mode) {
      badges.push({ label: '결제 모드', value: parsedData.mode === 'AUTO_PAYMENT' ? '자동 결제' : '알람' });
    }

    return badges;
  };

  // 검색어에 따라 필터링된 모니터링 항목 ('완료' 상태 제외)
  const filteredMonitoringItems = monitoringItems
    .filter((item) => item.status !== 'completed')
    .filter((item) => item.product.toLowerCase().includes(searchQuery.toLowerCase()));

  // 2026-05-08: 진행 중인 모니터링을 탐색 중/대기 중 상태별로 분리하고, 카드 배지와 섹션 분류 기준을 일치시킨다.
  const getMonitoringSectionKey = (item: DashboardMonitoringItem): 'exploring' | 'waiting' | 'other' => {
    const statusLabel = item.statusLabel?.trim();

    if (item.status === 'waiting' || statusLabel === '대기 중') {
      return 'waiting';
    }

    if (item.status === 'exploring' || statusLabel === '탐색 중') {
      return 'exploring';
    }

    return 'other';
  };

  const exploringMonitoringItems = filteredMonitoringItems.filter((item) => getMonitoringSectionKey(item) === 'exploring');
  const waitingMonitoringItems = filteredMonitoringItems.filter((item) => getMonitoringSectionKey(item) === 'waiting');

  // 2026-05-08: 상태별 내부 카드 크기를 더 줄여 각 섹션 안에서 한 행 2열 배치가 가능하도록 조정하고, 플랫폼 배지에는 플랫폼별 색상을 적용한다.
  const renderMonitoringCard = (item: DashboardMonitoringItem) => (
    <div
      key={item.conditionId}
      onClick={() => handleDetailClick(item)}
      className="w-full min-w-0 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl p-3 sm:p-4 hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-[0_4px_12px_rgb(15,23,42,0.06)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group relative"
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] dark:bg-slate-950 px-2 py-1 rounded border border-[#E2E8F0] dark:border-slate-700">
            <Circle
              className="w-1.5 h-1.5"
              style={{
                color: getMonitoringStatusColor(item.status, item.statusLabel),
                fill: getMonitoringStatusColor(item.status, item.statusLabel),
              }}
            />
            <span className="font-semibold text-[#0F172A] dark:text-slate-50 text-[11px] leading-none">{item.statusLabel}</span>
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
        <p className="text-[#0F172A] dark:text-slate-50 font-bold text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-[#0F172A] dark:group-hover:text-slate-50 transition-colors">{item.product}</p>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-[#F1F5F9] mt-auto">
        <div className="flex flex-col">
          <span className="text-[#475569] dark:text-slate-400 text-[11px] font-medium mb-0.5">목표가</span>
          <span className="text-[#0F172A] dark:text-slate-50 font-semibold text-[13px] sm:text-sm">{item.targetPrice}</span>
        </div>

        <div className="flex items-center justify-center text-[#E2E8F0] font-light text-xl px-2">/</div>

        <div className="flex flex-col items-end flex-1">
          <span className="text-[#0F172A] dark:text-slate-50 text-[11px] font-medium mb-0.5">현재가</span>
          <span className="text-[#0F172A] dark:text-slate-50 font-extrabold text-base sm:text-lg tracking-tight">{item.currentPrice}</span>
        </div>
      </div>
    </div>
  );

  // 2026-05-08: 상태별 섹션 박스는 동일한 폭을 사용해 좌우 2열로 안정적으로 배치한다.
  const renderMonitoringSection = (
    title: string,
    description: string,
    items: DashboardMonitoringItem[],
    countBadgeClassName: string,
  ) => (
    <div className="w-full min-w-0 self-start rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-700 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-[#0F172A] dark:text-slate-50">{title}</h4>
            <Badge className={countBadgeClassName}>{items.length}건</Badge>
          </div>
          <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">{description}</p>
        </div>
      </div>

      <div className="bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-5">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {items.map(renderMonitoringCard)}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">{title} 조건이 없습니다</p>
            <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">검색 조건을 바꾸거나 새 모니터링을 등록해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-screen font-sans text-[#0F172A] dark:text-slate-50">
      {/* 2026-05-08: Hero Section changed to Option 2 Premium Grayscale/Slate aesthetic */}
      <section className="bg-white dark:bg-slate-800 border-b border-[#E2E8F0] dark:border-slate-700 w-full pt-16 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A] dark:text-slate-50 mb-4">
            원하는 가격, <span className="relative inline-block"><span className="relative z-10 text-[#6366F1] dark:text-indigo-400">알아서 척척</span><span className="absolute bottom-1 left-0 w-full h-3 bg-[#C7D2FE] dark:bg-indigo-500/30 -z-10 rounded-sm skew-x-[-10deg]"></span></span> 찾아드려요.
          </h1>
          {/* 2026-05-08: 카테고리 애니메이션 영역이 현재 텍스트 길이에 맞춰 동적으로 너비를 갖도록 조정한다. */}
          <div className="mb-10 flex h-8 items-center text-lg font-medium text-[#475569] dark:text-slate-400 md:text-xl">
            <span className="relative inline-grid h-8 items-center overflow-hidden text-[#6366F1] dark:text-indigo-400 transition-[width] duration-300">
              <span className="invisible whitespace-nowrap font-bold">
                {rotatingCommandMessages[rotatingMessageIndex]}
              </span>
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap font-bold transition-all duration-300 ${
                  isRotatingMessageVisible ? 'translate-y-[-50%] opacity-100' : 'translate-y-[-70%] opacity-0'
                }`}
              >
                {rotatingCommandMessages[rotatingMessageIndex]}
              </span>
            </span>
            <span>&nbsp;찾고 계신가요?</span>
          </div>

          <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-[2rem] p-4 shadow-[0_8px_32px_rgb(15,23,42,0.06)] border border-[#E2E8F0] dark:border-slate-700">
            <div className="flex flex-col gap-3">
              {/* 2026-05-08: 자연어 입력 영역은 평소엔 화이트, 포커스 시 보조 배경으로 반전되고 클릭 요소엔 손가락 커서를 명시한다. */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 ring-1 ring-[#E2E8F0] focus-within:bg-[#F1F5F9] dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-[#6366F1]/30 dark:focus-within:ring-indigo-400/30 transition-all duration-300">
                <textarea
                  rows={1}
                  placeholder="예: 쿠팡에서 탐사수 7000원 밑으로 알림"
                  value={naturalLanguageInput}
                  onFocus={() => setIsCommandInputFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsCommandInputFocused(false), 150);
                  }}
                  onChange={(e) => {
                    setNaturalLanguageInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  className="w-full bg-transparent border-none px-4 py-3 text-[#0F172A] dark:text-slate-50 text-lg placeholder:text-[#475569] dark:placeholder:text-slate-400 focus:outline-none resize-none min-h-[60px] font-medium"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {parsedConditionBadges.length > 0 ? (
                    parsedConditionBadges.map((badge) => (
                      <Badge
                        key={`${badge.label}-${badge.value}`}
                        variant="secondary"
                        className="bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 border border-[#6366F1]/20 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                      >
                        <span className="opacity-80 mr-1 text-[#0F172A] dark:text-slate-50">{badge.label}</span>
                        {badge.value}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[#475569] dark:text-slate-400 text-xs">문장을 분석하여 조건 배지가 이곳에 나타납니다.</span>
                  )}
                </div>
                <Button 
                  className="bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 hover:-translate-y-0.5 rounded-xl h-12 px-8 text-base font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 w-full sm:w-auto group border-none cursor-pointer"
                  onClick={handleExecuteClick}
                >
                  <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  모니터링 시작하기
                </Button>
              </div>

              {(isCommandInputFocused || naturalLanguageInput.trim().length > 0) && (
                <div className="mx-2 mt-2 rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 p-5 text-left shadow-inner">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-1">이렇게 입력해 보세요!</h3>
                      <p className="text-xs text-[#475569] dark:text-slate-400 mb-3">원하는 문장을 클릭해 자연어 쇼핑 명령을 빠르게 입력할 수 있어요.</p>
                      <div className="flex flex-col gap-2">
                        {shoppingCommandExamples.map((text, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setNaturalLanguageInput(text);
                            }}
                            className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-[#0F172A] dark:text-slate-50 transition hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-[0_2px_8px_rgb(99,102,241,0.08)] hover:bg-[#EEF2FF] dark:hover:bg-indigo-500/10 hover:text-[#6366F1] dark:hover:text-indigo-400 hover:-translate-y-0.5 cursor-pointer"
                          >
                            "{text}"
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 border-t md:border-t-0 md:border-l border-[#E2E8F0] dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
                      <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-xl bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 flex items-center justify-center text-xs shadow-sm border border-[#6366F1]/10">💡</span>
                        이런 것도 알아들어요
                      </h4>
                      <div className="text-sm text-[#475569] dark:text-slate-400 space-y-3 font-medium">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/50 mt-1.5 flex-shrink-0"></div>
                          <p><strong className="text-[#0F172A] dark:text-slate-50">플랫폼:</strong> 네이버 쇼핑, 네이버 항공, 쿠팡, 알리익스프레스 등</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/50 mt-1.5 flex-shrink-0"></div>
                          <p><strong className="text-[#0F172A] dark:text-slate-50">상품 정보:</strong> 브랜드명, 정확한 모델명, 사이즈, 색상 등</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/50 mt-1.5 flex-shrink-0"></div>
                          <p><strong className="text-[#0F172A] dark:text-slate-50">조건 액션:</strong> 얼마 이하, 즉시 결제, 알림만, 대기 등</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Value/Steps Section (New) */}
      {/* 2026-05-08: 3단계 설명 카드의 컬러 시스템을 프리미엄 모노톤(Option 2)으로 통일 */}
      <section className="py-20 px-4 md:px-8 bg-[#F8FAFC] dark:bg-slate-950 border-b border-[#E2E8F0] dark:border-slate-700">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-12 text-[#0F172A] dark:text-slate-50">사용 방법은 아주 간단해요!</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div className="flex flex-col items-center rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-8 shadow-[0_2px_12px_rgb(15,23,42,0.04)] transition-all hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 flex items-center gap-3 self-start rounded-full border border-[#EEF2FF] dark:border-indigo-500/20 bg-[#EEF2FF] dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-[#6366F1] dark:text-indigo-400">
                STEP 1
              </div>
              <div className="w-16 h-16 bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#6366F1]/10"><MessageSquare className="w-8 h-8 text-[#6366F1] dark:text-indigo-400" /></div>
              <h3 className="text-xl font-bold mb-3 text-[#0F172A] dark:text-slate-50">말하듯 입력하기</h3>
              <p className="text-[#475569] dark:text-slate-400 leading-relaxed break-keep font-medium">
                원하는 상품과 가격을<br />
                평소 말하는 것처럼 편하게 적어주세요.
              </p>
            </div>
            <div className="flex flex-col items-center rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-8 shadow-[0_2px_12px_rgb(15,23,42,0.04)] transition-all hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 flex items-center gap-3 self-start rounded-full border border-[#EEF2FF] dark:border-indigo-500/20 bg-[#EEF2FF] dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-[#6366F1] dark:text-indigo-400">
                STEP 2
              </div>
              <div className="w-16 h-16 bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#6366F1]/10"><Bot className="w-8 h-8 text-[#6366F1] dark:text-indigo-400" /></div>
              <h3 className="text-xl font-bold mb-3 text-[#0F172A] dark:text-slate-50">AI가 조건 분석</h3>
              <p className="text-[#475569] dark:text-slate-400 leading-relaxed break-keep font-medium">
                찰떡같이 알아듣고 플랫폼, 가격 등<br />
                정확하게 분석하여 모니터링을 준비해요.
              </p>
            </div>
            <div className="flex flex-col items-center rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-8 shadow-[0_2px_12px_rgb(15,23,42,0.04)] transition-all hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-5 flex items-center gap-3 self-start rounded-full border border-[#EEF2FF] dark:border-indigo-500/20 bg-[#EEF2FF] dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-[#6366F1] dark:text-indigo-400">
                STEP 3
              </div>
              <div className="w-16 h-16 bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#6366F1]/10"><Sparkles className="w-8 h-8 text-[#6366F1] dark:text-indigo-400" /></div>
              <h3 className="text-xl font-bold mb-3 text-[#0F172A] dark:text-slate-50">알림 및 자동결제</h3>
              <p className="text-[#475569] dark:text-slate-400 leading-relaxed break-keep font-medium">
                원하는 가격이 되면 즉시 알려주거나,<br />
                놓치지 않게 알아서 결제까지 완료해요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <section className="py-16 px-4 md:px-8 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] dark:text-slate-50">나의 모니터링 현황</h2>
            <p className="text-[#475569] dark:text-slate-400 mt-2 font-medium">지금까지 AI가 얼마나 절약해 주었는지 확인해보세요.</p>
          </div>

          {loading && (
            <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 dark:bg-slate-700 px-6 py-4 text-sm text-gray-800 shadow-sm font-medium">
              대시보드 데이터를 열심히 불러오는 중입니다...
            </div>
          )}
          {error && (
            <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-800 shadow-sm font-medium">
              {error}
            </div>
          )}

          {/* 핵심 통계 그리드 (가로 4칸) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const cardStyles = [
                "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700", 
                "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700", 
                "bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700", 
                "bg-gradient-to-br from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 border-transparent text-white"
              ];
              const labelColors = ['text-[#475569] dark:text-slate-400', 'text-[#475569] dark:text-slate-400', 'text-[#475569] dark:text-slate-400', 'text-[#E0E7FF]'];
              const valueColors = ['text-[#0F172A] dark:text-slate-50', 'text-[#0F172A] dark:text-slate-50', 'text-[#0F172A] dark:text-slate-50', 'text-white'];
              const iconColors = ['text-[#6366F1] dark:text-indigo-400', 'text-[#6366F1] dark:text-indigo-400', 'text-[#6366F1] dark:text-indigo-400', 'text-white'];
              const iconBgs = ['bg-[#EEF2FF] dark:bg-indigo-500/10', 'bg-[#EEF2FF] dark:bg-indigo-500/10', 'bg-[#EEF2FF] dark:bg-indigo-500/10', 'bg-white/20'];
              
              return (
                <div key={index} className={`border rounded-[1.5rem] p-6 flex flex-col justify-center shadow-[0_2px_12px_rgb(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-lg hover:border-[#6366F1]/40 dark:hover:border-indigo-400/50 transition-all duration-300 ${cardStyles[index % 4]}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${iconBgs[index % 4]} flex items-center justify-center border-none`}>
                      <Icon className={`w-5 h-5 ${iconColors[index % 4]}`} />
                    </div>
                    <div className={`text-[13px] font-bold ${labelColors[index % 4]}`}>{stat.label}</div>
                  </div>
                  <div className={`text-[28px] font-extrabold tracking-tight text-center ${valueColors[index % 4]}`}>{stat.value}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            {/* 2026-05-08: 진행 중인 모니터링 래퍼를 제거하고 상태별 섹션을 직접 노출한다. */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="flex items-center gap-2.5 text-xl font-extrabold text-[#0F172A] dark:text-slate-50 md:text-2xl">
                진행 중인 모니터링
                </h3>
                <Badge variant="secondary" className="bg-[#F1F5F9] dark:bg-slate-900 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900 border-none font-semibold rounded-md px-2 py-0.5 text-xs">
                  총 {filteredMonitoringItems.length}건
                </Badge>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-slate-400" />
                <Input
                  type="text"
                  placeholder="상품명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-sm focus-visible:ring-1 focus-visible:ring-[#6366F1]/40 dark:focus-visible:ring-indigo-400/40 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 rounded-lg h-10 transition-all placeholder:text-[#475569] dark:placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 2026-05-08: 상태별 섹션을 더 이른 화면 크기부터 동일 폭의 좌우 2열로 배치한다. */}
            {filteredMonitoringItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {renderMonitoringSection(
                  '탐색 중인 조건',
                  'AI가 실시간으로 가격과 조건 충족 여부를 추적하고 있습니다.',
                  exploringMonitoringItems,
                  'bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-50 border border-[#F8FAFC] font-semibold rounded-md px-2 py-0.5 text-xs',
                )}
                {renderMonitoringSection(
                  '대기 중인 조건',
                  '조건은 등록되었고, 다음 이벤트나 가격 변화를 기다리고 있습니다.',
                  waitingMonitoringItems,
                  'bg-[#F8FAFC] dark:bg-slate-950 text-[#334155] dark:text-slate-300 border border-[#F8FAFC] font-semibold rounded-md px-2 py-0.5 text-xs',
                )}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center bg-[#F8FAFC] dark:bg-slate-950 rounded-[1.5rem] border-2 border-dashed border-[#E2E8F0] dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-[#F1F5F9] dark:bg-slate-900 flex items-center justify-center mb-4 text-[#475569] dark:text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="text-[15px] font-bold text-[#0F172A] dark:text-slate-50 mb-1">모니터링 중인 상품이 없습니다</h4>
                <p className="text-[#475569] dark:text-slate-400 text-sm">상단 입력창을 통해 원하는 상품을 등록해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 확인 다이얼로그 */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open: boolean) => {
          setShowConfirmDialog(open);
          if (!open) {
            setProductDetailDraft(createProductDetailDraft());
            setPlatformIsLocked(false);
            setPendingPreviewResponse(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-0 overflow-hidden">
          <AlertDialogHeader className="px-6 pt-6">
            <AlertDialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">상품 상세 정보 입력</AlertDialogTitle>
            <AlertDialogDescription className="text-[#475569] dark:text-slate-400">
              파싱된 값은 그대로 사용하고, 필요한 항목만 수정하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-5 px-6 pb-2 mt-4">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-[#475569] dark:text-slate-400 text-sm">
                상품명
              </Label>
              <Input
                id="product-name"
                value={productDetailDraft.productName}
                readOnly
                className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#475569] dark:text-slate-400 text-sm">플랫폼</Label>
              {platformIsLocked ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-900 px-3 py-2">
                  <Badge
                    variant="outline"
                    className="border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-50"
                    style={{
                      borderColor: `${getPlatformColor(productDetailDraft.platform)}40`,
                      color: getPlatformColor(productDetailDraft.platform),
                    }}
                  >
                    {getProductPlatformBadgeLabel()}
                  </Badge>
                  <span className="text-xs text-[#475569] dark:text-slate-400">파싱된 플랫폼을 그대로 사용</span>
                </div>
              ) : (
                <Input
                  id="platform"
                  value={productDetailDraft.platform}
                  onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, platform: e.target.value }))}
                  placeholder="예: 네이버 쇼핑, 쿠팡"
                  className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-detail" className="text-[#475569] dark:text-slate-400 text-sm">
                상품 디테일
              </Label>
              <Input
                id="product-detail"
                value={productDetailDraft.options}
                onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, options: e.target.value }))}
                placeholder="예: 블랙 색상, 270mm, 정품"
                className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-price" className="text-[#475569] dark:text-slate-400 text-sm">
                목표가
              </Label>
              <Input
                id="target-price"
                value={productDetailDraft.targetPrice}
                onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, targetPrice: e.target.value }))}
                placeholder="예: 250000"
                className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#475569] dark:placeholder:text-slate-400 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monitoring-registered-at" className="text-[#475569] dark:text-slate-400 text-sm">
                모니터링 등록일
              </Label>
              <Input
                id="monitoring-registered-at"
                value={productDetailDraft.monitoringRegisteredAt}
                readOnly
                className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#475569] dark:text-slate-400 text-sm">결제 모드</Label>
              {/* 2026-05-08: 상품 상세 정보 입력에서 자동 결제 선택 시 초록색 강조로 구분한다. */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDetailDraft((prev) => ({ ...prev, paymentMode: 'ALERT_ONLY' }))}
                  className={
                    productDetailDraft.paymentMode === 'ALERT_ONLY'
                      ? 'border-[#475569]/30 bg-[#FFFBF0] dark:bg-amber-900/20 text-[#334155] dark:text-amber-200 hover:bg-[#FFFBF0]/80 dark:hover:bg-amber-900/40 shadow-sm'
                      : 'border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900'
                  }
                >
                  알람
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDetailDraft((prev) => ({ ...prev, paymentMode: 'AUTO_PAYMENT' }))}
                  className={
                    productDetailDraft.paymentMode === 'AUTO_PAYMENT'
                      ? 'border-[#16a34a]/30 dark:border-green-500/30 bg-[#F0FDF4] dark:bg-green-900/20 text-[#166534] dark:text-green-200 hover:bg-[#F0FDF4]/80 dark:hover:bg-green-900/30 shadow-sm'
                      : 'border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 hover:bg-[#F1F5F9] dark:hover:bg-slate-900'
                  }
                >
                  자동 결제
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#475569] dark:text-slate-400 text-sm">모니터링 만료 날짜</Label>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={productDetailDraft.expiryYear}
                  onValueChange={(value: string) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryYear: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30">
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
                  value={productDetailDraft.expiryMonth}
                  onValueChange={(value: string) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryMonth: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30">
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
                  value={productDetailDraft.expiryDay}
                  onValueChange={(value: string) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryDay: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus:ring-[#6366F1]/30 dark:focus:ring-indigo-400/30">
                    <SelectValue placeholder="일" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDayOptions().map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 mt-2 border-t border-[#E2E8F0] dark:border-slate-700">
            <AlertDialogCancel className="rounded-xl px-6 py-2 bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmMonitoring}
              className="rounded-xl px-6 py-2 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 shadow-[0_4px_10px_rgba(99,102,241,0.25)] border-none"
            >
              모니터링 시작
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800 p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">모니터링 상세 정보</DialogTitle>
            <DialogDescription className="text-[#475569] dark:text-slate-400">
              현재 모니터링 중인 항목의 상세 정보입니다
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="grid gap-5 py-4 px-6">
              {/* 상품명 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">상품명</Label>
                <div className="p-3 bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl">
                  <p className="text-[#0F172A] dark:text-slate-50 font-medium">{selectedItem.product}</p>
                </div>
              </div>

              {/* 플랫폼 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">플랫폼</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3 rounded-lg"
                    style={{
                      backgroundColor: `${getPlatformColor(selectedItem.platform)}15`,
                      borderColor: `${getPlatformColor(selectedItem.platform)}40`,
                      color: getPlatformColor(selectedItem.platform),
                    }}
                  >
                    {getPlatformName(selectedItem.platform)}
                  </Badge>
                </div>
              </div>

              {/* 현재 수집 가격 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">현재 수집 가격</Label>
                <div className="p-3 bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl">
                  <p className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">{selectedItem.currentPrice}</p>
                </div>
              </div>

              {/* 목표 가격 (최대가) */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">목표 가격 (최대가)</Label>
                <div className="p-3 bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl">
                  <p className="text-[#0F172A] dark:text-slate-50 text-xl font-bold">{selectedItem.targetPrice}</p>
                </div>
              </div>

              {/* 가격 차이 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">가격 차이</Label>
                <div className="p-3 bg-[#F1F5F9] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl">
                  <p className="text-[#0F172A] dark:text-slate-50 font-medium">
                    {calculatePriceDifference(selectedItem.currentPrice, selectedItem.targetPrice)}
                  </p>
                </div>
              </div>

              {/* 모니터링 상태 */}
              <div className="space-y-2">
                <Label className="text-[#475569] dark:text-slate-400 text-sm">모니터링 상태</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3 rounded-lg"
                    style={{
                      backgroundColor: `${selectedItem.statusColor}15`,
                      borderColor: `${selectedItem.statusColor}40`,
                      color: selectedItem.statusColor,
                    }}
                  >
                    {selectedItem.statusLabel}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-[#F1F5F9] dark:bg-slate-900 px-6 py-4 border-t border-[#E2E8F0] dark:border-slate-700">
            <Button 
              onClick={() => setShowDetailDialog(false)}
              className="bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 w-full rounded-xl py-6 text-base font-bold shadow-[0_4px_10px_rgba(99,102,241,0.25)] border-none"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
