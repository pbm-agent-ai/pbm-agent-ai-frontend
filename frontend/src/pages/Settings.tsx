import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Wallet, Send, CreditCard, Mail, MessageSquare, Check, ChevronRight, ChevronDown, Settings as SettingsIcon, Eye, EyeOff, User, Shield, Moon, Plug, ExternalLink, RefreshCw } from 'lucide-react';
import { LogoIcon } from '../components/ui/LogoIcon';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { changeAuthPassword, fetchAuthMe, fetchPairingToken } from '../api/auth';
import DecorativeBackground from '../components/ui/DecorativeBackground';
import { fetchMyWallet, fetchMyWalletBalance, createMyWallet, subscribeToWalletCreation, chargeWallet, subscribeToChargeProgress, fetchTransactionHistory, type WalletResponse, type WalletBalanceResponse, type ProvisioningStep, type TokenTransactionResponse, type ChargeProgressEvent, type ChargeProgressStep } from '../api/wallet';

type ExtensionStatus = 'idle' | 'detecting' | 'not-installed' | 'pairing' | 'paired' | 'error';

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export default function Settings() {
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState('123456789');
  const [email, setEmail] = useState('leon.kim@example.com');
  const [monthlyLimit] = useState('5000000');
  // ── DND ──
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('07:00');
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  // ── 지갑 상태 (API 연동) ──
  const [wallet, setWallet]                            = useState<WalletResponse | null>(null);
  const [walletBalance, setWalletBalance]             = useState<WalletBalanceResponse | null>(null);
  const [isWalletLoading, setIsWalletLoading]         = useState(false);
  const [isCreatingWallet, setIsCreatingWallet]       = useState(false);
  const [provisioningSteps, setProvisioningSteps]     = useState<ProvisioningStep[]>([]);
  const [provisioningError, setProvisioningError]     = useState<string | null>(null);
  const [walletLimitInput, setWalletLimitInput]       = useState('400000');
  // ── 토큰 충전 상태 ──
  const [chargeAmountInput, setChargeAmountInput]     = useState('');
  const [isCharging, setIsCharging]                   = useState(false);
  const [chargeError, setChargeError]                 = useState<string | null>(null);
  const [chargeSuccess, setChargeSuccess]             = useState<string | null>(null);
  const [chargeSteps, setChargeSteps]                 = useState<ChargeProgressEvent[]>([]);
  const [transactions, setTransactions]               = useState<TokenTransactionResponse[]>([]);
  const [showTransactions, setShowTransactions]       = useState(false);

  // 충전 단계 메타 (라벨·아이콘)
  const STEP_META: Record<ChargeProgressStep, string> = {
    CONNECTED:            '스트림 연결',
    REQUEST_RECEIVED:     '충전 요청 수신',
    DB_SAVED:             '충전 내역 저장',
    TX_SENT:              '트랜잭션 전송',
    TX_CONFIRMED:         '트랜잭션 확정',
    CHARGE_COMPLETED:     'PBM 충전 완료',
    GAS_CALCULATED:       '가스비 계산',
    GAS_DEDUCT_STARTED:   '가스비 차감 시작',
    GAS_TX_SENT:          '차감 트랜잭션 전송',
    GAS_TX_CONFIRMED:     '차감 트랜잭션 확정',
    GAS_DEDUCT_COMPLETED: '가스비 차감 완료',
    GAS_DEDUCT_FAILED:    '가스비 차감 실패',
    DONE:                 '처리 완료',
    FAILED:               '실패',
  };
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'payment' | 'integration'>('account');
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('idle');
  const [extensionVersion, setExtensionVersion] = useState('');
  const [pairedDeviceId, setPairedDeviceId] = useState('');
  const [extensionError, setExtensionError] = useState('');

  // ── Provisioning Polling ──
  // 지갑 생성 SSE AbortController (언마운트 시 스트림 정리용)
  const walletSseRef = useRef<AbortController | null>(null);
  // 토큰 충전 SSE AbortController (언마운트 시 스트림 정리용)
  const chargeSseRef = useRef<AbortController | null>(null);

  const startWalletCreationStream = useCallback((walletLimitKrw: number) => {
    // 기존 스트림 정리
    walletSseRef.current?.abort();

    const controller = subscribeToWalletCreation(
      {
        onStep: (status) => {
          setProvisioningSteps(status.steps);
        },
        onDone: async () => {
          // 완료 → 지갑/잔액 재조회
          const [walletData, balanceData] = await Promise.all([
            fetchMyWallet(),
            fetchMyWalletBalance(),
          ]);
          if (walletData) {
            setWallet(walletData);
            setWalletLimitInput(String(walletData.walletLimit));
          }
          if (balanceData) setWalletBalance(balanceData);
          setIsCreatingWallet(false);
        },
        onFailed: (reason) => {
          setProvisioningError(reason || '지갑 생성에 실패했습니다.');
          setIsCreatingWallet(false);
        },
      },
      async () => {
        // CONNECTED → 지갑 생성 요청 전송
        try {
          const result = await createMyWallet(walletLimitKrw);
          // 이미 지갑이 있으면 즉시 반환되는 경우 (동기 완료)
          if (result?.walletAddress) {
            setWallet(result);
            setWalletLimitInput(String(result.walletLimit));
            const refreshedBalance = await fetchMyWalletBalance();
            setWalletBalance(refreshedBalance);
            setIsCreatingWallet(false);
            walletSseRef.current?.abort();
          }
        } catch (err) {
          setProvisioningError(err instanceof Error ? err.message : '지갑 생성에 실패했습니다.');
          setIsCreatingWallet(false);
        }
      },
    );

    walletSseRef.current = controller;
  }, []);

  // 언마운트 시 SSE 스트림 정리 (지갑 생성 + 토큰 충전)
  useEffect(() => {
    return () => {
      walletSseRef.current?.abort();
      chargeSseRef.current?.abort();
    };
  }, []);

  const tabs = [
    { id: 'account' as const, label: '계정', icon: User },
    { id: 'notifications' as const, label: '알림', icon: Bell },
    { id: 'payment' as const, label: '결제', icon: CreditCard },
    { id: 'integration' as const, label: '연동', icon: Plug },
  ];

  const isExtensionConnected = extensionStatus === 'paired';

  // ── Profile edit ──
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  // 2026-05-18 수정 8: 계정탭은 빈 문자열로 시작하고 auth/me 응답이 오면 닉네임과 이메일을 채운다.
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileWalletAddress, setProfileWalletAddress] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // ── Password change ──
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 2026-05-18 수정 12: 비밀번호 변경 요청 중에는 중복 제출을 막기 위해 로딩 상태를 둔다.
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [visiblePwd, setVisiblePwd] = useState<Record<string, boolean>>({});
  const [passwordError, setPasswordError] = useState('');
  // ── Delete account ──
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const deleteReasonOptions = [
    { value: 'hard-to-use', label: '사용이 불편해요' },
    { value: 'not-needed', label: '더 이상 필요하지 않아요' },
    { value: 'expensive', label: '수수료가 부담돼요' },
    { value: 'other-service', label: '다른 서비스로 갈아탈게요' },
    { value: 'etc', label: '기타' },
  ];

  const resetDeleteFields = () => {
    setDeletePassword('');
    setDeleteReason('');
  };

  // 2026-05-18 수정 5: 계정탭 진입 시 8081 /api/v1/auth/me를 호출해 닉네임과 이메일을 현재 로그인 사용자 값으로 갱신한다.
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);

      try {
        const profile = await fetchAuthMe();

        if (!isMounted || !profile) {
          return;
        }

        setProfileName(profile.name);
        setProfileEmail(profile.email);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(error);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const detectExtension = useCallback((): Promise<{ installed: boolean; version?: string }> => {
    return new Promise((resolve) => {
      let resolved = false;

      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (event.data?.type !== 'PBM_EXT_READY') return;
        if (resolved) return;
        resolved = true;
        window.removeEventListener('message', handler);
        resolve({ installed: true, version: event.data?.payload?.version });
      };

      window.addEventListener('message', handler);

      [0, 500, 1000].forEach((delay) => {
        window.setTimeout(() => {
          if (!resolved) {
            window.postMessage({ type: 'PBM_EXTENSION_PING' }, '*');
          }
        }, delay);
      });

      window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('message', handler);
          resolve({ installed: false });
        }
      }, 2000);
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'integration') return;
    if (extensionStatus !== 'idle') return;

    const run = async () => {
      setExtensionStatus('detecting');
      const result = await detectExtension();
      if (result.installed) {
        setExtensionVersion(result.version ?? '');
        const stored = localStorage.getItem('pbm-paired-device-id');
        if (stored) {
          setPairedDeviceId(stored);
          setExtensionStatus('paired');
        } else {
          setExtensionStatus('idle');
        }
      } else {
        setExtensionStatus('not-installed');
      }
    };

    void run();
  }, [activeTab, extensionStatus, detectExtension]);

  // ── 지갑 정보 로드 (payment/통합 탭에서 사용) ──
  useEffect(() => {
    let isMounted = true;

    const loadWallet = async () => {
      setIsWalletLoading(true);
      try {
        const [walletData, balanceData] = await Promise.all([
          fetchMyWallet(),
          fetchMyWalletBalance(),
        ]);
        if (!isMounted) return;
        if (walletData) {
          setWallet(walletData);
          setWalletLimitInput(String(walletData.walletLimit));
        }
        if (balanceData) {
          setWalletBalance(balanceData);
        }
      } catch {
        // 무시
      } finally {
        if (isMounted) setIsWalletLoading(false);
      }
    };

    void loadWallet();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteAccount = () => {
    // 비밀번호+사유 입력 완료 → 확인 다이얼로그로 이동
    setShowDeleteDialog(false);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    setShowConfirmDelete(false);
    resetDeleteFields();
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    resetDeleteFields();
  };

  const togglePwdVisibility = (field: string) => {
    setVisiblePwd((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const formatPrice = (price: string) => `₩${parseInt(price).toLocaleString()}`;
  const formatCurrencyAmount = (value?: number | string | null) => {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(numericValue)) {
      return '₩0';
    }
    return `₩${Math.floor(numericValue).toLocaleString()}`;
  };

  // 확장프로그램 연결하기 (Step 2) — pairing token 발급
  const handleConnect = async () => {
    setIsCheckingConnection(true);
    setExtensionStatus('pairing');
    setExtensionError('');
    try {
      const detected = await detectExtension();
      if (!detected.installed) {
        setExtensionStatus('not-installed');
        return;
      }
      setExtensionVersion(detected.version ?? '');

      const pairingToken = await fetchPairingToken();

      const result = await new Promise<{ ok: boolean; deviceId?: string; error?: string }>((resolve) => {
        const timeout = window.setTimeout(
          () => resolve({ ok: false, error: '확장 프로그램 응답 시간이 초과됐습니다.' }),
          10000,
        );

        const handler = (event: MessageEvent<{ type?: string; payload?: { ok: boolean; deviceId?: string; error?: string } }>) => {
          if (event.data?.type === 'PBM_EXTENSION_PAIR_RESULT') {
            window.clearTimeout(timeout);
            window.removeEventListener('message', handler);
            resolve(event.data.payload ?? { ok: false, error: '응답 없음' });
          }
        };

        window.addEventListener('message', handler);
        window.postMessage({ type: 'PBM_EXTENSION_PAIR_REQUEST', pairingToken }, '*');
      });

      if (result.ok && result.deviceId) {
        setPairedDeviceId(result.deviceId);
        localStorage.setItem('pbm-paired-device-id', result.deviceId);
        setExtensionStatus('paired');
      } else {
        setExtensionError(result.error ?? '페어링에 실패했습니다.');
        setExtensionStatus('error');
      }
    } catch (err) {
      console.error('[Settings] Pairing token 발급 실패', err);
      setExtensionError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setExtensionStatus('error');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleRedetect = useCallback(async () => {
    setExtensionStatus('detecting');
    const result = await detectExtension();
    if (result.installed) {
      setExtensionVersion(result.version ?? '');
      const stored = localStorage.getItem('pbm-paired-device-id');
      if (stored) {
        setPairedDeviceId(stored);
        setExtensionStatus('paired');
      } else {
        setExtensionStatus('idle');
      }
    } else {
      setExtensionStatus('not-installed');
    }
  }, [detectExtension]);

  const handleDisconnectExtension = () => {
    localStorage.removeItem('pbm-paired-device-id');
    setPairedDeviceId('');
    setExtensionStatus('idle');
    setExtensionError('');
  };

  const handleProfileSave = () => {
    setShowProfileSheet(false);
  };

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // 2026-05-18 수정 13: 비밀번호 변경은 auth 서버의 /api/v1/auth/password로 보내고 성공 시에만 다이얼로그를 닫는다.
  const handlePasswordSave = async () => {
    if (isPasswordSaving) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setPasswordError('');

    setIsPasswordSaving(true);

    try {
      await changeAuthPassword({
        currentPassword,
        newPassword,
      });

      setShowPasswordDialog(false);
      resetPasswordFields();
    } catch (error) {
      if (error instanceof Error) {
        setPasswordError(error.message);
      }
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    setPasswordError('');
    resetPasswordFields();
  };

  const handleNotificationsSave = () => {
    // 저장 로직은 API 연동 시 구현 예정
  };

  return (
    <div className="relative w-full bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-slate-50 overflow-x-hidden">
      <DecorativeBackground variant="minimal" />
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[820px] mx-auto space-y-6">

          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(30,77,140,0.5)] text-white shrink-0">
              <SettingsIcon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-50">설정</h1>
              <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium">계정 정보와 서비스 환경을 설정합니다</p>
            </div>
          </div>

          {/* ═══════════ Tab Bar ═══════════ */}
          <div className="relative">
            <div className="flex bg-white dark:bg-slate-800 rounded-t-[1.5rem]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'text-[#1E4D8C] dark:text-[#7BAEDA]'
                        : 'text-slate-400 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#1E4D8C] dark:text-[#7BAEDA]' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {/* Active underline */}
            <div className="relative h-0.5 bg-[#E2E8F0] dark:bg-slate-700">
              <div
                className="absolute bottom-0 h-0.5 bg-[#1E4D8C] dark:bg-[#7BAEDA] rounded-full transition-all duration-300"
                style={{
                  left: `${(tabs.findIndex(t => t.id === activeTab) / tabs.length) * 100 + 10 / tabs.length}%`,
                  width: `${80 / tabs.length}%`,
                }}
              />
            </div>
          </div>

          {/* ═══════════ Account Tab ═══════════ */}
          {activeTab === 'account' && (
            <>
              {/* ═══════════ Summary Stats ═══════════ */}
              <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">지갑 상태</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5 flex items-center justify-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${wallet ? 'bg-[#5bf0c0]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {isWalletLoading ? '확인 중' : wallet ? '연결됨' : '미연결'}
                    </p>
                  </div>
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">건당 한도</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                      {isWalletLoading ? '불러오는 중...' : formatCurrencyAmount(wallet?.walletLimit)}
                    </p>
                  </div>
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 tracking-wide">월간 한도</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50 mt-1.5">
                      {formatPrice(monthlyLimit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5">
                  <Avatar className="w-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                    <AvatarFallback className="bg-gradient-to-br from-[#1E4D8C] to-[#0F3460] text-white text-lg font-bold rounded-2xl">
                      {getInitials(profileName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                      {isProfileLoading ? '불러오는 중...' : profileName || '닉네임 없음'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-300 truncate">
                      {isProfileLoading ? '이메일을 불러오는 중...' : profileEmail || '이메일 없음'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileSheet(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 rounded-xl hover:bg-[#DBE2EF] dark:hover:bg-[#1E4D8C]/20 transition-colors shrink-0"
                  >
                    프로필 편집
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>

              {/* Security Card */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] gap-4">
                <CardHeader className="px-6 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#1E4D8C]" />
                    <CardTitle className="text-slate-900 dark:text-slate-50">보안</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-300">
                    계정 보안 설정을 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pt-0 pb-5 space-y-0">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                        <span className="text-sm">🔒</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">비밀번호</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordDialog(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 rounded-xl hover:bg-[#DBE2EF] dark:hover:bg-[#1E4D8C]/20 transition-colors"
                  >
                    변경
                    <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══════════ Delete Account ═══════════ */}
              <Card className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] overflow-hidden">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-500/20 shrink-0">
                      <span className="text-base">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#EF4444] dark:text-red-400">회원 탈퇴</p>
                      <p className="text-[12px] text-slate-400 dark:text-slate-400 mt-0.5">계정을 삭제하면 모든 데이터가 영구 소멸됩니다</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="shrink-0 px-4 h-9 text-xs font-bold text-[#EF4444] dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      탈퇴
                    </button>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ═══════════ Notifications Tab ═══════════ */}
          {activeTab === 'notifications' && (
            <>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#1E4D8C]" />
                  <CardTitle className="text-slate-900 dark:text-slate-50">알림 설정</CardTitle>
                </div>
                <CardDescription className="text-slate-500 dark:text-slate-300">
                  알림을 받을 채널을 설정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* ── Telegram ── */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                        <MessageSquare className="w-4 h-4 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">텔레그램</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400">Chat ID로 알림 수신</p>
                      </div>
                    </div>
                    <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                  </div>

                  {telegramEnabled && (
                    <div className="mt-3 ml-12 flex gap-2">
                      <Input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Chat ID"
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 dark:border-slate-700 text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 hover:bg-[#DBE2EF] dark:hover:bg-[#1E4D8C]/20 rounded-xl h-9 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1.5" />
                        테스트
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-700/50" />

                {/* ── Email ── */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                        <Mail className="w-4 h-4 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">이메일</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400">등록된 이메일로 알림 수신</p>
                      </div>
                    </div>
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                  </div>

                  {emailEnabled && (
                    <div className="mt-3 ml-12 flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 dark:border-slate-700 text-[#1E4D8C] dark:text-[#7BAEDA] bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 hover:bg-[#DBE2EF] dark:hover:bg-[#1E4D8C]/20 rounded-xl h-9 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1.5" />
                        테스트
                      </Button>
                    </div>
                  )}
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-700/50" />

              {/* ── DND ── */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F9F7F7] dark:bg-[#1E4D8C]/10 flex items-center justify-center border border-[#1E4D8C]/10">
                      <Moon className="w-4 h-4 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-50">방해 금지</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400">설정된 시간 동안 알림을 차단합니다</p>
                    </div>
                  </div>
                  <Switch checked={dndEnabled} onCheckedChange={setDndEnabled} />
                </div>

                {dndEnabled && (
                  <div className="mt-3 ml-12 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-300 mb-1 block">시작 시간</label>
                      <Input
                        type="time"
                        value={dndStart}
                        onChange={(e) => setDndStart(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                    <span className="text-slate-400 dark:text-slate-400 pb-2 text-sm">~</span>
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-slate-500 dark:text-slate-300 mb-1 block">종료 시간</label>
                      <Input
                        type="time"
                        value={dndEnd}
                        onChange={(e) => setDndEnd(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* ── Save Button (tab bottom) ── */}
          <Button
            onClick={handleNotificationsSave}
            className="w-full bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] hover:-translate-y-0.5 rounded-xl h-12 text-base font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)] transition-all duration-300 border-none"
          >
            저장
          </Button>
            </>
          )}

          {/* ═══════════ Payment Tab ═══════════ */}
          {activeTab === 'payment' && (
            <>
              {/* PBM Wallet */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">PBM 지갑 설정</CardTitle>
                  </div>
                  <CardDescription className="text-[#64748b] dark:text-slate-400">
                    지갑을 생성하고 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isWalletLoading ? (
                    /* ── 로딩 중 ── */
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-8 h-8 border-2 border-[#1E4D8C] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">지갑 정보를 불러오는 중...</p>
                    </div>
                  ) : wallet ? (
                    /* ── 지갑 있음: 주소 + 잔액 + 한도 ── */
                    <>
                      {/* 지갑 주소 (읽기 전용) */}
                      <div className="mb-4">
                        <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 mb-1.5 block">지갑 주소</label>
                        <Input
                          type="text"
                          value={wallet.walletAddress}
                          readOnly
                          className="bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 font-mono text-sm rounded-xl"
                        />
                        <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-1">생성된 PBM 지갑 주소입니다</p>
                      </div>

                      <Separator className="my-5 bg-slate-100 dark:bg-slate-700/50" />

                      {/* ── 지갑 잔액 ── */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">지갑 잔액</p>
                        <div className="rounded-xl bg-gradient-to-br from-[#1E4D8C]/10 to-[#0F3460]/5 dark:from-[#1E4D8C]/20 dark:to-[#0F3460]/10 border border-[#1E4D8C]/20 dark:border-[#1E4D8C]/30 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-2xl font-extrabold text-[#1E4D8C] dark:text-[#7BAEDA]">
                                {formatCurrencyAmount(walletBalance?.pbmBalance)}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">사용 가능한 잔액</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#1E4D8C]/10 dark:bg-[#1E4D8C]/20 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-5 bg-slate-100 dark:bg-slate-700/50" />

                      {/* ── 토큰 충전 ── */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">PBM 토큰 충전</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 font-medium text-sm">PBM</span>
                            <Input
                              type="text"
                              value={chargeAmountInput}
                              onChange={(e) => {
                                setChargeAmountInput(e.target.value.replace(/[^0-9]/g, ''));
                                setChargeError(null);
                                setChargeSuccess(null);
                                if (!isCharging) setChargeSteps([]);
                              }}
                              placeholder="충전 수량"
                              disabled={isCharging}
                              className="pl-12 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] font-medium text-sm rounded-xl disabled:opacity-50"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              const amount = parseInt(chargeAmountInput, 10);
                              if (isNaN(amount) || amount < 10000) {
                                setChargeError('최소 충전 금액은 10,000 PBM입니다.');
                                return;
                              }
                              setIsCharging(true);
                              setChargeError(null);
                              setChargeSuccess(null);
                              setChargeSteps([]);

                              // 기존 충전 SSE 정리 후 새 SSE 구독
                              chargeSseRef.current?.abort();
                              chargeSseRef.current = subscribeToChargeProgress(
                                {
                                  onStep: (event) => {
                                    setChargeSteps((prev) => [...prev, event]);
                                  },
                                  onDone: async () => {
                                    chargeSseRef.current = null;
                                    setIsCharging(false);
                                    setChargeSuccess(`${amount.toLocaleString()} PBM 충전이 완료되었습니다.`);
                                    setChargeAmountInput('');
                                    const refreshed = await fetchMyWalletBalance();
                                    if (refreshed) setWalletBalance(refreshed);
                                  },
                                  onFailed: (reason) => {
                                    chargeSseRef.current = null;
                                    setIsCharging(false);
                                    setChargeError(reason ?? '충전에 실패했습니다.');
                                  },
                                },
                                async () => {
                                  // CONNECTED → 충전 요청 전송
                                  try {
                                    await chargeWallet(amount);
                                  } catch (err) {
                                    // HTTP 요청 실패 시 서버 FAILED 이벤트가 오지 않으므로 직접 SSE 종료
                                    chargeSseRef.current?.abort();
                                    chargeSseRef.current = null;
                                    setIsCharging(false);
                                    setChargeError(err instanceof Error ? err.message : '충전에 실패했습니다.');
                                  }
                                },
                              );
                            }}
                            disabled={!chargeAmountInput || parseInt(chargeAmountInput, 10) < 10000 || isCharging}
                            className="shrink-0 bg-gradient-to-r from-[#1E4D8C] to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] rounded-xl h-10 px-5 text-sm font-bold shadow-[0_4px_10px_-4px_rgba(30,77,140,0.3)] transition-all duration-300 border-none"
                          >
                            {isCharging ? '충전 중...' : '충전하기'}
                          </Button>
                        </div>

                        {/* 충전 진행 단계 */}
                        {chargeSteps.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {chargeSteps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                </span>
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {STEP_META[step.step] ?? step.step}
                                  </span>
                                  {step.detail && (
                                    <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                                      {step.detail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isCharging && (
                              <div className="flex items-center gap-2 text-xs text-[#1E4D8C] dark:text-[#7BAEDA]">
                                <div className="w-4 h-4 border-2 border-[#1E4D8C] border-t-transparent rounded-full animate-spin shrink-0" />
                                <span>처리 중...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {chargeError && (
                          <p className="text-xs text-rose-500 mt-1.5">{chargeError}</p>
                        )}
                        {chargeSuccess && (
                          <p className="text-xs text-emerald-500 mt-1.5">{chargeSuccess}</p>
                        )}
                        {!isCharging && chargeSteps.length === 0 && (
                          <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-1">최소 10,000 PBM 이상 충전 가능 · 블록체인 처리로 수십 초 소요될 수 있습니다</p>
                        )}
                      </div>

                      <Separator className="my-5 bg-slate-100 dark:bg-slate-700/50" />

                      {/* ── 거래 내역 ── */}
                      <div className="mb-4">
                        <button
                          type="button"
                          className="flex items-center justify-between w-full text-xs font-medium text-slate-500 dark:text-slate-400 mb-2"
                          onClick={async () => {
                            if (!showTransactions) {
                              const list = await fetchTransactionHistory();
                              setTransactions(list);
                            }
                            setShowTransactions((v) => !v);
                          }}
                        >
                          <span>거래 내역</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showTransactions ? 'rotate-180' : ''}`} />
                        </button>
                        {showTransactions && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {transactions.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">거래 내역이 없습니다.</p>
                            ) : (
                              transactions.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                      tx.type === 'CHARGE' ? 'bg-emerald-400' :
                                      tx.type === 'DEDUCT' ? 'bg-rose-400' : 'bg-amber-400'
                                    }`} />
                                    <div>
                                      <p className="font-medium text-slate-700 dark:text-slate-200">
                                        {tx.type === 'CHARGE' ? '충전' : tx.type === 'DEDUCT' ? '결제 차감' : '수수료'}
                                      </p>
                                      <p className="text-slate-400 dark:text-slate-500 text-[10px]">
                                        {new Date(tx.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-bold ${
                                      tx.type === 'CHARGE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                                    }`}>
                                      {tx.type === 'CHARGE' ? '+' : '-'}{Number(tx.amountPbm).toLocaleString()} PBM
                                    </p>
                                    <p className={`text-[10px] ${
                                      tx.status === 'SUCCESS' ? 'text-slate-400' :
                                      tx.status === 'PENDING' ? 'text-amber-400' : 'text-rose-400'
                                    }`}>
                                      {tx.status === 'SUCCESS' ? '완료' : tx.status === 'PENDING' ? '처리중' : '실패'}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <Separator className="my-5 bg-slate-100 dark:bg-slate-700/50" />

                      {/* ── 결제 한도 (읽기 전용) ── */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">결제 한도</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 font-medium text-sm">₩</span>
                          <Input
                            type="text"
                            value={String(wallet.walletLimit)}
                            readOnly
                            className="pl-7 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-xl h-9 text-sm"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">지갑 생성 시 등록된 한도입니다</p>
                      </div>
                    </>
                  ) : (
                    /* ── 지갑 없음: 경고 + 생성 폼 ── */
                    <>
                      {/* 경고 배너 */}
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 mb-5">
                        <div className="flex items-start gap-3">
                          <span className="text-lg shrink-0 leading-none">⚠️</span>
                          <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">PBM 지갑이 없습니다</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">자동 결제를 사용하려면 PBM 지갑을 생성해주세요.</p>
                          </div>
                        </div>
                      </div>

                      {/* ── 프로비저닝 진행 상황 ── */}
                      {isCreatingWallet && provisioningSteps.length > 0 && (
                        <div className="mb-5">
                          <div className="relative">
                            <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
                            <div className="space-y-6">
                              {provisioningSteps.map((step, index) => (
                                <div key={step.name} className="relative flex items-start gap-4">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 shadow-sm ${
                                      step.status === 'completed'
                                        ? 'bg-emerald-500 text-white'
                                        : step.status === 'in_progress'
                                          ? 'bg-[#1E4D8C] text-white'
                                          : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-300'
                                    }`}
                                  >
                                    {step.status === 'completed' ? (
                                      <Check className="w-4 h-4" />
                                    ) : step.status === 'in_progress' ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      index + 1
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pt-1">
                                    <p
                                      className={`text-sm font-bold ${
                                        step.status === 'completed'
                                          ? 'text-slate-900 dark:text-slate-50'
                                          : step.status === 'in_progress'
                                            ? 'text-[#1E4D8C] dark:text-[#7BAEDA]'
                                            : 'text-slate-400 dark:text-slate-500'
                                      }`}
                                    >
                                      {step.label}
                                    </p>
                                    <p
                                      className={`text-xs mt-0.5 ${
                                        step.status === 'completed'
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : step.status === 'in_progress'
                                            ? 'text-[#1E4D8C] dark:text-[#7BAEDA]'
                                            : 'text-slate-400 dark:text-slate-500'
                                      }`}
                                    >
                                      {step.status === 'completed' && '완료'}
                                      {step.status === 'in_progress' && '진행 중...'}
                                      {step.status === 'pending' && '대기 중'}
                                      {step.status === 'failed' && '실패'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── 프로비저닝 실패 에러 ── */}
                      {provisioningError && (
                        <div className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                          {provisioningError}
                        </div>
                      )}

                      {/* 한도 입력 + 생성 버튼 */}
                      <div>
                        <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50 mb-1.5 block">결제 한도 설정</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 font-medium text-sm">₩</span>
                            <Input
                              type="text"
                              value={walletLimitInput}
                              onChange={(e) => setWalletLimitInput(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="한도를 입력하세요"
                              className="pl-7 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] font-medium text-sm rounded-xl"
                            />
                          </div>
                          <Button
                            onClick={async () => {
                              const limit = parseInt(walletLimitInput, 10);
                              if (isNaN(limit) || limit <= 0) return;
                              setIsCreatingWallet(true);
                              setProvisioningSteps([]);
                              setProvisioningError(null);
                              try {
                                // SSE 구독 시작 → CONNECTED 수신 후 createMyWallet() 자동 호출
                                startWalletCreationStream(limit);
                              } catch (err) {
                                console.error('[Settings] 지갑 생성 실패', err);
                                setProvisioningError(err instanceof Error ? err.message : '지갑 생성에 실패했습니다.');
                                setIsCreatingWallet(false);
                              }
                            }}
                            disabled={!walletLimitInput || parseInt(walletLimitInput, 10) <= 0 || isCreatingWallet}
                            className="shrink-0 bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] rounded-xl h-10 px-5 text-sm font-bold shadow-[0_4px_10px_-4px_rgba(30,77,140,0.3)] transition-all duration-300 border-none"
                          >
                            {isCreatingWallet ? '생성 중...' : '지갑 생성하기'}
                          </Button>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-2">설정된 한도로 PBM 스마트 지갑이 생성됩니다</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

            </>
          )}

          {/* ═══════════ Integration Tab ═══════════ */}
          {activeTab === 'integration' && (
            <>
              {/* ── 연결 상태 + 액션 (항상 표시) ── */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isExtensionConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <CardTitle className="text-slate-900 dark:text-slate-50">연결 상태</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-300">
                    {isExtensionConnected
                      ? '확장프로그램이 정상적으로 연결되어 있습니다'
                      : extensionStatus === 'not-installed'
                        ? '확장프로그램이 설치되지 않았습니다'
                        : extensionStatus === 'pairing'
                          ? '확장프로그램과 연결하는 중입니다'
                          : extensionStatus === 'error'
                            ? '확장프로그램 연결 중 오류가 발생했습니다'
                            : '확장프로그램이 연결되지 않았습니다'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isExtensionConnected ? (
                    <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-50">정상 작동 중</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            연결된 디바이스: {pairedDeviceId || '알 수 없음'}
                          </p>
                        </div>
                        <span className="ml-auto text-xs text-slate-400">{extensionVersion ? `Chrome 확장 v${extensionVersion}` : '확장 버전 확인됨'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Plug className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-500 dark:text-slate-400">
                            {extensionStatus === 'not-installed' ? '설치되지 않음' : '연결되지 않음'}
                          </p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                            {extensionStatus === 'not-installed'
                              ? '확장프로그램 설치 후 다시 감지해주세요'
                              : extensionError || '아래 가이드에 따라 설치 후 연결해주세요'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    {!isExtensionConnected && (
                      <Button variant="outline" onClick={() => void handleRedetect()} className="rounded-xl h-10 px-5 text-sm font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        다시 감지
                      </Button>
                    )}
                    {isExtensionConnected && (
                      <Button variant="outline" onClick={handleDisconnectExtension} className="rounded-xl h-10 px-5 text-sm font-bold border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                        연결 끊기
                      </Button>
                    )}
                  </div>

                  {extensionError && extensionStatus === 'error' && (
                    <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                      {extensionError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 가이드: 설치 → 연결 → 완료 (항상 표시) ── */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Plug className="w-5 h-5 text-[#1E4D8C] dark:text-[#7BAEDA]" />
                    <CardTitle className="text-slate-900 dark:text-slate-50">확장프로그램 설치 가이드</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-300">
                    자동 결제를 위해 브라우저 확장프로그램을 설치하고 연결하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-[15px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-6">
                      {/* Step 1 */}
                      <div className="relative flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 shadow-sm ${extensionStatus === 'not-installed' ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' : 'bg-[#0F3460] text-white'}`}>
                          {extensionStatus === 'not-installed' ? '1' : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className={`text-sm font-bold ${extensionStatus === 'not-installed' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-50'}`}>확장프로그램 설치 {extensionStatus === 'not-installed' ? '' : '(완료)'}</p>
                          <p className={`text-xs mt-0.5 ${extensionStatus === 'not-installed' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>Chrome 웹스토어에서 확장프로그램을 설치하세요.</p>
                          <Button onClick={() => {}} className="mt-2 rounded-xl bg-[#1E4D8C] text-white hover:bg-[#0F3460] px-4 py-1.5 text-xs font-bold border-none h-8">
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            스토어에서 설치
                          </Button>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 shadow-sm ${isExtensionConnected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                          {isExtensionConnected ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : '2'}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className={`text-sm font-bold ${isExtensionConnected ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`}>확장프로그램 연결</p>
                          <p className={`text-xs mt-0.5 ${isExtensionConnected ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>Chrome 확장프로그램을 계정에 연결하세요.</p>
                          {!isExtensionConnected ? (
                            <Button
                              onClick={handleConnect}
                              disabled={isCheckingConnection}
                              className={`mt-2 rounded-xl px-4 py-1.5 text-xs font-bold border-none h-8 ${isCheckingConnection ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-[#1E4D8C] text-white hover:bg-[#0F3460]'}`}
                            >
                              {isCheckingConnection ? (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  연결 중...
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">🔗 연결</span>
                              )}
                            </Button>
                          ) : (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              연결 완료
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 shadow-sm ${isExtensionConnected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                          {isExtensionConnected ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : '3'}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className={`text-sm font-bold ${isExtensionConnected ? 'text-slate-900 dark:text-slate-50' : 'text-slate-300 dark:text-slate-600'}`}>자동 결제 가능</p>
                          <p className={`text-xs mt-0.5 ${isExtensionConnected ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {isExtensionConnected ? '확장프로그램이 연결되었습니다. 자동 결제를 사용할 수 있습니다.' : '연결 완료 시 자동 결제를 사용할 수 있습니다.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </section>

      {/* ═══════════ Profile Edit Dialog ═══════════ */}
      <Dialog open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">프로필 편집</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">이름과 이메일을 변경할 수 있습니다</p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">닉네임</label>
              <Input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">PBM 지갑 주소</label>
              <Input
                type="text"
                value={profileWalletAddress}
                onChange={(e) => setProfileWalletAddress(e.target.value)}
                placeholder="지갑 주소를 입력하세요"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowProfileSheet(false)}
              className="flex-1 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handleProfileSave}
              className="flex-1 bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)] transition-all duration-300"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Password Change Dialog ═══════════ */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => { setShowPasswordDialog(open); if (!open) { setPasswordError(''); } }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">비밀번호 변경</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">안전한 비밀번호로 정기적으로 변경해주세요</p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">현재 비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['current'] ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['current'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">새 비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['new'] ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상, 영문/숫자/특수문자 포함"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">새 비밀번호 확인</label>
              <div className="relative">
                <Input
                  type={visiblePwd['confirm'] ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['confirm'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {passwordError && (
            <div className="px-6 pb-2">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                {passwordError}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={handlePasswordCancel}
              disabled={isPasswordSaving}
              className="flex-1 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handlePasswordSave}
              disabled={isPasswordSaving}
              className="flex-1 bg-gradient-to-r from-[#1E4D8C] dark:from-[#1E4D8C] to-[#0F3460] dark:to-[#0F3460] text-white hover:from-[#0F3460] hover:to-[#0F3460] rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(30,77,140,0.25)] hover:shadow-[0_6px_20px_rgba(30,77,140,0.4)] transition-all duration-300"
            >
              {isPasswordSaving ? '변경 중...' : '변경'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Confirm Delete Dialog ═══════════ */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          <div className="py-8 px-6 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-2xl flex items-center justify-center border border-red-200 dark:border-red-500/30">
              <LogoIcon crying className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">정말로 탈퇴 하시겠습니까?</p>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">모든 결제 내역과 설정 정보가 영구 삭제되며, 복구할 수 없습니다.</p>
            </div>
            <div className="flex gap-3 mt-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 h-11 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                아니요
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white font-bold"
              >
                예, 탈퇴할게요
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Delete Account Dialog ═══════════ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-[#EF4444] dark:text-red-400 flex items-center gap-2">
              ⚠️ 회원 탈퇴
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
              삭제된 계정은 <span className="font-bold text-[#EF4444] dark:text-red-400">복구할 수 없으며</span>, 모든 결제 내역과 설정 정보가 영구적으로 소멸됩니다.
            </p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['delete'] ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus-visible:border-[#1E4D8C] focus-visible:ring-[#1E4D8C]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('delete')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['delete'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-50">탈퇴 사유</label>
              <div className="relative">
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 rounded-xl text-sm appearance-none focus:outline-none focus:border-[#1E4D8C] focus:ring-1 focus:ring-[#1E4D8C]/50"
                >
                  <option value="" disabled>탈퇴 사유를 선택하세요</option>
                  {deleteReasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="flex-1 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={!deletePassword || !deleteReason}
              className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] disabled:bg-[#FCA5A5] disabled:cursor-not-allowed rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] transition-all duration-300 border-none"
            >
              탈퇴하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
