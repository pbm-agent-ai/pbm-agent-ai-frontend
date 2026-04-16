import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { TrendingUp, CheckCircle, Clock, DollarSign, Send, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';

type ModeType = 'AUTO_PAYMENT' | 'ALERT_ONLY';

type ParsedCommand = {
  platform: string;
  product: string;
  productDetail: string;
  maxPrice: string;
  mode: ModeType | '';
  expireDate: string;
};

type MonitoringItem = {
  id: number;
  platform: string;
  statusLabel: string;
  statusColor: string;
  product: string;
  currentPrice: string;
  targetPrice: string;
};

type PlatformInfo = {
  key: string;
  aliases: string[];
};

const PLATFORM_CONFIG: PlatformInfo[] = [
  {
    key: 'coupang',
    aliases: ['coupang', '쿠팡'],
  },
  {
    key: '11st',
    aliases: ['11st', '11번가'],
  },
  {
    key: 'naver-flights',
    aliases: ['naver flights', 'naver-flights', '네이버 항공', '네이버항공'],
  },
  {
    key: 'gmarket',
    aliases: ['gmarket', '지마켓'],
  },
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PLATFORM_REGEX_BY_KEY = PLATFORM_CONFIG.reduce<Record<string, RegExp>>((acc, platform) => {
  acc[platform.key] = new RegExp(platform.aliases.map(escapeRegex).join('|'), 'i');
  return acc;
  }, {}); // 영어 한글 구분없이 플랫폼으로 인식
  

const normalizePriceToWonText = (rawText: string) => {
  const sanitized = rawText.replace(/[,\s원]/g, '');
  if (!sanitized) return '';

  if (sanitized.endsWith('만')) {
    const base = Number(sanitized.replace('만', ''));
    if (Number.isNaN(base)) return '';
    return `₩${(base * 10000).toLocaleString()}`;
  }

  const value = Number(sanitized);
  if (Number.isNaN(value)) return '';
  return `₩${value.toLocaleString()}`;
}; // 가격 문자열 원화 표시 


const detectModeFromText = (command: string): ModeType | '' => {
  const autoPaymentKeywordRegex = /(자동\s*결제|바로\s*결제|즉시\s*결제|auto\s*payment)/i;
  const alertKeywordRegex = /(알림|알람|alert)/i;
  if (autoPaymentKeywordRegex.test(command)) return 'AUTO_PAYMENT';
  if (alertKeywordRegex.test(command)) return 'ALERT_ONLY';
  return '';
}; // 모드 인식


const extractExpireDateFromText = (command: string) => {
  const dateMatch = command.match(/(20\d{2})[-./년\s](\d{1,2})[-./월\s](\d{1,2})/);
  if (!dateMatch) return '';

  const year = dateMatch[1];
  const month = dateMatch[2].padStart(2, '0');
  const day = dateMatch[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
}; //날짜

const findPlatformByText = (text: string) => {
  return PLATFORM_CONFIG.find((platform) => PLATFORM_REGEX_BY_KEY[platform.key].test(text));
}; //플랫폼 찾기

const extractProductDetailFromText = (command: string) => {
  const detailMatch = command.match(/(?:제품\s*상세|상세|옵션)\s*[:：]?\s*([^\n,]+)/i);
  return detailMatch?.[1]?.trim() ?? '';
}; //함수 안 단어들(?:제품\s*상세|상세|옵션) 뒤에 오는 내용 추출

const parseCommand = (command: string): ParsedCommand => {
  const compactText = command.trim();
  const normalizedCommand = compactText.toLowerCase();

  const selectedPlatform = findPlatformByText(normalizedCommand);

  const maxPriceMatch = compactText.match(/(\d{1,3}(?:[,\s]\d{3})*\s*원|\d+\s*만원|\d+\s*만)/i);
  const priceText = maxPriceMatch ? normalizePriceToWonText(maxPriceMatch[0]) : '';
  const expireDate = extractExpireDateFromText(compactText);
  const productDetail = extractProductDetailFromText(compactText);

  const productCandidate = compactText
    .replace(maxPriceMatch?.[0] ?? '', '')
    .replace(expireDate, '')
    .replace(productDetail, '')
    .replace(/(자동\s*결제|바로\s*결제|즉시\s*결제|알림|알람|해줘|등록|요청|이면|이하|이상|까지|만료일|만료|플랫폼|제품명|목표가|최대가|모드|상세|옵션)/gi, '')
    .trim();

  return {
    platform: selectedPlatform?.key ?? '',
    product: productCandidate,
    productDetail,
    maxPrice: priceText,
    mode: detectModeFromText(compactText),
    expireDate,
  };
}; //명령어 파싱 미리보기

const parseWon = (priceText: string) => {
  return Number(priceText.replace(/[₩,\s]/g, ''));
}; //원화 문자열을 숫자로 변환 -> 가격 차이

const getPlatformName = (platform: string) => {
  const platformInfo = PLATFORM_CONFIG.find((info) => info.key === platform);
  return platformInfo?.aliases[1] ?? platform;
}; //플랫폼 이름 얻기

const getPlatformColor = (platform: string) => {
  const colorMap: Record<string, string> = {
    coupang: '#ef4444',
    '11st': '#f97316',
    'naver-flights': '#22c55e',
    gmarket: '#3b82f6',
  };

  return colorMap[platform] ?? '#64748b';
}; //플랫폼 뱃지 색

const calculatePriceDifference = (currentPrice: string, targetPrice: string) => {
  const diff = parseWon(currentPrice) - parseWon(targetPrice);
  const diffText = Math.abs(diff).toLocaleString();

  if (diff < 0) {
    return `목표가보다 ${diffText}원 낮음`;
  }

  if (diff > 0) {
    return `목표가보다 ${diffText}원 높음`;
  }

  return '목표가와 동일';
}; //가격 차이

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}; //날짜 반환

const isPastDate = (dateText: string) => {
  const today = formatDateForInput(new Date());
  return dateText < today;
}; //과거 날짜인지 확인

const validateParsedCommandForMockServer = (parsed: ParsedCommand) => {
  const missingKeys: string[] = [];
  const invalidKeys: string[] = [];
  const availablePlatforms = PLATFORM_CONFIG.map((platform) => platform.key);

  // [수정] 서버 검증을 UI에서 미리 보기 위해 필수 키 누락 검사(mock)
  if (!parsed.platform) missingKeys.push('platform');
  if (!parsed.product) missingKeys.push('product');
  if (!parsed.productDetail) missingKeys.push('product-detail');
  if (!parsed.maxPrice) missingKeys.push('max-price');
  if (!parsed.mode) missingKeys.push('mode');
  if (!parsed.expireDate) missingKeys.push('expire-date');

  // [수정] 값 형식/도메인 유효성 검사(mock)
  if (parsed.platform && !availablePlatforms.includes(parsed.platform)) invalidKeys.push('platform');
  if (parsed.maxPrice && Number.isNaN(parseWon(parsed.maxPrice))) invalidKeys.push('max-price');
  if (parsed.mode && parsed.mode !== 'ALERT_ONLY' && parsed.mode !== 'AUTO_PAYMENT') invalidKeys.push('mode');
  if (parsed.expireDate && Number.isNaN(new Date(parsed.expireDate).getTime())) invalidKeys.push('expire-date');

  return { missingKeys, invalidKeys };
};

export default function Dashboard() {
  const [shoppingCommand, setShoppingCommand] = useState('');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MonitoringItem | null>(null);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand>({
    platform: 'naver-flights',
    product: '인천-오사카',
    productDetail: '왕복 · 위탁수하물 포함',
    maxPrice: '₩250,000',
    mode: 'AUTO_PAYMENT',
    expireDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });

  const stats = [
    { label: '모니터링 중', value: '12', color: 'text-[#5bf0c0]', icon: TrendingUp },
    { label: '완료된 결제', value: '47', color: 'text-[#8ab0d0]', icon: CheckCircle },
    { label: '조건 대기 중', value: '5', color: 'text-[#f0a040]', icon: Clock },
    { label: '총 절약 금액', value: '₩1,240,000', color: 'text-[#5bf0c0]', icon: DollarSign },
  ];

  const monitoringItems: MonitoringItem[] = [
    {
      id: 1,
      platform: 'naver-flights',
      statusLabel: '탐색 중',
      statusColor: '#5bf0c0',
      product: '인천-오사카 왕복 항공권',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    },
    {
      id: 2,
      platform: 'coupang',
      statusLabel: '조건 충족',
      statusColor: '#4a90e2',
      product: 'Apple AirPods Pro 2세대',
      currentPrice: '₩298,000',
      targetPrice: '₩300,000',
    },
    {
      id: 3,
      platform: '11st',
      statusLabel: '대기 중',
      statusColor: '#f0a040',
      product: 'LG 그램 17인치 노트북',
      currentPrice: '₩1,890,000',
      targetPrice: '₩1,750,000',
    },
    {
      id: 4,
      platform: 'gmarket',
      statusLabel: '완료',
      statusColor: '#6b7280',
      product: '나이키 에어맥스 270',
      currentPrice: '₩149,000',
      targetPrice: '₩150,000',
    },
    {
      id: 5,
      platform: 'naver-flights',
      statusLabel: '탐색 중',
      statusColor: '#5bf0c0',
      product: '서울-제주 왕복 항공권',
      currentPrice: '₩87,000',
      targetPrice: '₩80,000',
    },
  ];

  const parsedConditions = useMemo(
    () => [
      { label: 'platform', value: parsedCommand.platform || '(누락)', color: '#4a90e2' },
      { label: 'product', value: parsedCommand.product || '(누락)', color: '#9b59b6' },
      { label: 'product-detail', value: parsedCommand.productDetail || '(누락)', color: '#a855f7' },
      { label: 'max-price', value: parsedCommand.maxPrice || '(누락)', color: '#5bf0c0' },
      { label: 'mode', value: parsedCommand.mode || '(누락)', color: '#f0a040' },
      { label: 'expire-date', value: parsedCommand.expireDate || '(누락)', color: '#64748b' },
    ],
    [parsedCommand],
  );

  const realtimeMonitoringItems = useMemo(
    () => monitoringItems.filter((item) => item.statusLabel !== '완료'),
    [monitoringItems],
  );

  const showMonitoringDetail = (item: MonitoringItem) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const handleRunCommand = async () => {
    if (!shoppingCommand.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '입력 필요',
        text: '자연어 쇼핑 명령을 먼저 입력하세요.',
        confirmButtonText: '확인',
      });
      return;
    }

    // [수정] 자연어를 GPT가 키값으로 파싱한 결과를 먼저 화면에 반영(UI 미리보기)
    const parsed = parseCommand(shoppingCommand);
    setParsedCommand(parsed);

    // [수정] 서버 검증 실패 창을 삭제하고, 누락/오류 키마다 모달 입력을 받아 보완
    const completedParsed: ParsedCommand = { ...parsed };
    let validationResult = validateParsedCommandForMockServer(completedParsed);

    if (validationResult.missingKeys.includes('platform') || validationResult.invalidKeys.includes('platform')) {
      const platformResult = await Swal.fire({
        icon: 'warning',
        title: '어느 플랫폼에서 모니터링을 진행하시겠습니까?',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">누락된 플랫폼을 입력해 주세요.</p>
            <input id="missing-platform" class="swal2-input" placeholder="예: 쿠팡, 11번가, 네이버 항공" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        preConfirm: () => {
          const platformInput = (document.getElementById('missing-platform') as HTMLInputElement | null)?.value.trim() ?? '';
          if (!platformInput) {
            Swal.showValidationMessage('플랫폼을 입력해 주세요.');
            return null;
          }
          const matchedPlatform = findPlatformByText(platformInput.toLowerCase());
          return matchedPlatform?.key ?? platformInput.toLowerCase().replace(/\s+/g, '-');
        },
      });
      if (!platformResult.isConfirmed || !platformResult.value) return;
      completedParsed.platform = platformResult.value;
    }

    if (validationResult.missingKeys.includes('product') || validationResult.invalidKeys.includes('product')) {
      const productResult = await Swal.fire({
        icon: 'warning',
        title: '어떤 제품을 모니터링 하시겠습니까?',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">누락된 제품명을 입력해 주세요.</p>
            <input id="missing-product" class="swal2-input" placeholder="예: Apple AirPods Pro 2세대" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        preConfirm: () => {
          const productInput = (document.getElementById('missing-product') as HTMLInputElement | null)?.value.trim() ?? '';
          if (!productInput) {
            Swal.showValidationMessage('제품명을 입력해 주세요.');
            return null;
          }
          return productInput;
        },
      });
      if (!productResult.isConfirmed || !productResult.value) return;
      completedParsed.product = productResult.value;
    }

    if (validationResult.missingKeys.includes('product-detail') || validationResult.invalidKeys.includes('product-detail')) {
      const detailResult = await Swal.fire({
        icon: 'warning',
        title: '어떤 제품 상세를 모니터링 하시겠습니까?',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">누락된 제품 상세를 입력해 주세요.</p>
            <input id="missing-product-detail" class="swal2-input" placeholder="예: 블랙 / 270mm / 1개" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        preConfirm: () => {
          const detailInput = (document.getElementById('missing-product-detail') as HTMLInputElement | null)?.value.trim() ?? '';
          if (!detailInput) {
            Swal.showValidationMessage('제품 상세를 입력해 주세요.');
            return null;
          }
          return detailInput;
        },
      });
      if (!detailResult.isConfirmed || !detailResult.value) return;
      completedParsed.productDetail = detailResult.value;
    }

    if (validationResult.missingKeys.includes('max-price') || validationResult.invalidKeys.includes('max-price')) {
      const maxPriceResult = await Swal.fire({
        icon: 'warning',
        title: '최대 목표가를 얼마로 설정하시겠습니까?',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">누락된 목표가를 입력해 주세요.</p>
            <input id="missing-max-price" class="swal2-input" placeholder="예: 25만원 또는 250000원" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        preConfirm: () => {
          const priceInput = (document.getElementById('missing-max-price') as HTMLInputElement | null)?.value ?? '';
          const normalizedPrice = normalizePriceToWonText(priceInput);
          if (!normalizedPrice) {
            Swal.showValidationMessage('최대 목표가 형식이 올바르지 않습니다.');
            return null;
          }
          return normalizedPrice;
        },
      });
      if (!maxPriceResult.isConfirmed || !maxPriceResult.value) return;
      completedParsed.maxPrice = maxPriceResult.value;
    }

    if (validationResult.missingKeys.includes('mode') || validationResult.invalidKeys.includes('mode')) {
      const modeResult = await Swal.fire({
        icon: 'warning',
        title: '조건이 충족되었을 시 모드를 선택해주세요.',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">아래 버튼을 눌러 모드를 선택해 주세요.</p>
            <div style="display:flex; gap:8px;">
              <button id="missing-mode-alert" type="button" class="swal2-confirm swal2-styled" style="background:#fff;color:#111;border:1px solid #d1d5db;box-shadow:none;">알림</button>
              <button id="missing-mode-auto" type="button" class="swal2-confirm swal2-styled" style="background:#fff;color:#111;border:1px solid #d1d5db;box-shadow:none;">자동 결제</button>
            </div>
            <input id="missing-mode" type="hidden" value="${completedParsed.mode}" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        didOpen: () => {
          const alertButton = document.getElementById('missing-mode-alert');
          const autoButton = document.getElementById('missing-mode-auto');
          const hiddenInput = document.getElementById('missing-mode') as HTMLInputElement | null;
          const setModeButtonStyle = (selectedMode: ModeType | '') => {
            if (alertButton instanceof HTMLButtonElement) {
              alertButton.style.background = selectedMode === 'ALERT_ONLY' ? '#f59e0b' : '#ffffff';
              alertButton.style.color = '#111111';
              alertButton.style.border = selectedMode === 'ALERT_ONLY' ? '1px solid #f59e0b' : '1px solid #d1d5db';
            }
            if (autoButton instanceof HTMLButtonElement) {
              autoButton.style.background = selectedMode === 'AUTO_PAYMENT' ? '#10b981' : '#ffffff';
              autoButton.style.color = '#111111';
              autoButton.style.border = selectedMode === 'AUTO_PAYMENT' ? '1px solid #10b981' : '1px solid #d1d5db';
            }
          };
          setModeButtonStyle((hiddenInput?.value as ModeType | '') ?? '');

          alertButton?.addEventListener('click', () => {
            if (hiddenInput) hiddenInput.value = 'ALERT_ONLY';
            setModeButtonStyle('ALERT_ONLY');
          });
          autoButton?.addEventListener('click', () => {
            if (hiddenInput) hiddenInput.value = 'AUTO_PAYMENT';
            setModeButtonStyle('AUTO_PAYMENT');
          });
        },
        preConfirm: () => {
          const selectedMode = (document.getElementById('missing-mode') as HTMLInputElement | null)?.value as ModeType | '';
          if (!selectedMode) {
            Swal.showValidationMessage('모드를 선택해 주세요.');
            return null;
          }
          return selectedMode;
        },
      });
      if (!modeResult.isConfirmed || !modeResult.value) return;
      completedParsed.mode = modeResult.value;
    }

    if (validationResult.missingKeys.includes('expire-date') || validationResult.invalidKeys.includes('expire-date')) {
      const expireDateResult = await Swal.fire({
        icon: 'warning',
        title: '모니터링 만료일을 설정해 주세요.',
        html: `
          <div style="text-align:left;">
            <p style="margin:0 0 8px; color:#64748b;">아래 입력란에서 만료일을 선택해 주세요.</p>
            <input id="missing-expire-date" type="date" class="swal2-input" value="${completedParsed.expireDate || formatDateForInput(new Date())}" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        preConfirm: () => {
          const expireDateInput = (document.getElementById('missing-expire-date') as HTMLInputElement | null)?.value ?? '';
          if (!expireDateInput) {
            Swal.showValidationMessage('만료일을 선택해 주세요.');
            return null;
          }
          if (isPastDate(expireDateInput)) {
            Swal.showValidationMessage('현재 날짜보다 이전 날짜는 선택할 수 없습니다.');
            return null;
          }
          return expireDateInput;
        },
      });
      if (!expireDateResult.isConfirmed || !expireDateResult.value) return;
      completedParsed.expireDate = expireDateResult.value;
    }

    // [수정] 누락 키 보완 후 mock 서버 검증 재실행
    validationResult = validateParsedCommandForMockServer(completedParsed);
    if (validationResult.missingKeys.length > 0 || validationResult.invalidKeys.length > 0) return;

    setParsedCommand(completedParsed);

    await Swal.fire({
      icon: 'success',
      title: '요청 등록 완료 (Mock)',
      html: `
        <p style="margin:0 0 6px;">플랫폼: ${getPlatformName(completedParsed.platform)}</p>
        <p style="margin:0 0 6px;">상품: ${completedParsed.product}</p>
        <p style="margin:0 0 6px;">제품 상세: ${completedParsed.productDetail}</p>
        <p style="margin:0 0 6px;">목표가: ${completedParsed.maxPrice}</p>
        <p style="margin:0 0 6px;">모드: ${completedParsed.mode === 'AUTO_PAYMENT' ? '자동 결제' : '알림'}</p>
        <p style="margin:0;">만료 날짜: ${completedParsed.expireDate}</p>
      `,
      confirmButtonText: '확인',
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-4">대시 보드</h1>
      <p className="text-muted-foreground">실시간 모니터 현황</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white border-[#e2e8f0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#64748b] text-sm">{stat.label}</span>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white border-[#e2e8f0] shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-[#0f172a]">자연어 쇼핑 명령</CardTitle>
          <CardDescription className="text-[#64748b]">원하는 조건을 자연어로 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Input
              type="text"
              value={shoppingCommand}
              onChange={(e) => setShoppingCommand(e.target.value)}
              placeholder="예: 쿠팡에서 나이키 에어맥스 20만원 이하 자동 결제"
              className="flex-1 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
            />
            <Button onClick={handleRunCommand} className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md">
              <Send className="w-4 h-4 mr-2" />
              실행
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#64748b] text-xs">GPT 파싱 결과:</span>
            {parsedConditions.map((condition, index) => (
              <Badge
                key={index}
                variant="outline"
                className="font-mono border"
                style={{
                  backgroundColor: `${condition.color}15`,
                  borderColor: `${condition.color}40`,
                  color: condition.color,
                }}
              >
                {condition.label}: {condition.value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader className="border-b border-[#e2e8f0]">
          <CardTitle className="text-[#0f172a]">실시간 모니터링 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e2e8f0]">
            {realtimeMonitoringItems.map((item) => {
              return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => showMonitoringDetail(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void showMonitoringDetail(item);
                  }
                }}
                className="p-5 flex items-center gap-4 hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                <Circle className="w-3 h-3 flex-shrink-0" fill={item.statusColor} color={item.statusColor} />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0f172a] font-medium truncate">{item.product}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#64748b] text-xs mb-0.5">현재가</p>
                  <p className="text-[#0f172a] font-semibold">{item.currentPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#64748b] text-xs mb-0.5">목표가</p>
                  <p className="text-[#94a3b8] font-semibold">{item.targetPrice}</p>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono"
                  style={{
                    backgroundColor: `${item.statusColor}15`,
                    borderColor: `${item.statusColor}40`,
                    color: item.statusColor,
                  }}
                >
                  {item.statusLabel}
                </Badge>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">모니터링 상세 정보</DialogTitle>
            <DialogDescription className="text-[#64748b]">
              현재 모니터링 중인 항목의 상세 정보입니다
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="grid gap-5 py-4">
              {/* 상품명 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">상품명</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] font-medium">{selectedItem.product}</p>
                </div>
              </div>

              {/* 플랫폼 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">플랫폼</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3"
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
                <Label className="text-[#64748b] text-sm">현재 수집 가격</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] text-xl font-bold">{selectedItem.currentPrice}</p>
                </div>
              </div>

              {/* 목표 가격 (최대가) */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">목표 가격 (최대가)</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#10b981] text-xl font-bold">{selectedItem.targetPrice}</p>
                </div>
              </div>

              {/* 가격 차이 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">가격 차이</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] font-medium">
                    {calculatePriceDifference(selectedItem.currentPrice, selectedItem.targetPrice)}
                  </p>
                </div>
              </div>

              {/* 모니터링 상태 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">모니터링 상태</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3"
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

          <DialogFooter>
            <Button
              onClick={() => setShowDetailDialog(false)}
              className="bg-[#10b981] text-white hover:bg-[#059669] w-full"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
