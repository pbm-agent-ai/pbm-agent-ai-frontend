import axios from 'axios';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import apiClient from '../api/axios';
import { useAuthStore } from '../store/authStore';

type FieldErrors = {
  form?: string;
};

// 응답 형식이 고정되어 있으므로 타입도 그대로 맞춘다.
interface LoginSuccessResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  };
  message: string;
}

interface SignupSuccessResponse {
  success: true;
  data: {
    userId: number;
    email: string;
    name: string;
  };
  message: string;
}

interface AuthLockDetail {
  lockedUntil?: string;
}

// 실패 응답은 code/message/detail 구조로 고정한다.
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    detail: unknown;
  };
}

type LoginResponse = LoginSuccessResponse | ApiErrorResponse;
type SignupResponse = SignupSuccessResponse | ApiErrorResponse;

export default function Login() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const authErrorMessage = useAuthStore((state) => state.authErrorMessage);
  const setAuthErrorMessage = useAuthStore((state) => state.setAuthErrorMessage);

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 필드별/폼 전체 에러를 한 곳에서 관리한다.
  const [errors, setErrors] = useState<FieldErrors>({});
  // 중복 제출을 막고 버튼 상태를 제어한다.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 회원가입 후 로그인 화면으로 돌릴 때 안내 메시지를 보여준다.
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // 2026-04-29 수정: AUTH003 응답의 lockedUntil 시각까지 로그인 UI를 잠금 처리
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  // 2026-04-29 수정: 서버 잠금 남은 시간을 1초마다 갱신해 로그인 버튼 문구에 반영
  const [lockRemainingText, setLockRemainingText] = useState('');

  // 2026-04-29 수정: AUTH003 응답의 lockedUntil 문자열을 읽어 로그인 잠금 상태 여부를 계산
  const isLoginLocked =
    mode === 'login' && Boolean(lockedUntil) && new Date(lockedUntil as string).getTime() > Date.now();

  // 2026-04-29 수정: 서버가 내려준 lockedUntil 기준으로 남은 잠금 시간을 mm:ss 형식으로 표시
  const formatLockRemaining = (target: string): string => {
    const remainingMs = new Date(target).getTime() - Date.now();

    if (remainingMs <= 0) {
      return '';
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!lockedUntil) {
      setLockRemainingText('');
      return undefined;
    }

    const syncLockState = () => {
      const nextRemainingText = formatLockRemaining(lockedUntil);

      if (!nextRemainingText) {
        setLockedUntil(null);
        setLockRemainingText('');
        return;
      }

      setLockRemainingText(nextRemainingText);
    };

    // 2026-04-29 수정: 로그인 잠금 남은 시간을 1초 간격으로 갱신하고 만료 시 자동 해제
    syncLockState();
    const intervalId = window.setInterval(syncLockState, 1000);

    return () => window.clearInterval(intervalId);
  }, [lockedUntil]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage('');
    setAuthErrorMessage(null);
  };

  const goToSignup = () => {
    setMode('signup');
    resetForm();
    clearMessages();
  };

  const goToLogin = () => {
    setMode('login');
    resetForm();
    clearMessages();
  };

  // 2026-04-29 수정: 서버 에러를 모두 form 공통 에러로 표시하므로 입력 변경 시 form 에러만 초기화
  const clearFormError = () => {
    setErrors((prev) => ({
      ...prev,
      form: undefined,
    }));
    setAuthErrorMessage(null);
  };

  useEffect(() => {
    if (!authErrorMessage) {
      return;
    }

    // 2026-04-30 수정: 재발급 실패 후 로그인 화면으로 돌아오면 AUTH005/AUTH006 서버 메시지를 form 공통 에러로 즉시 노출한다.
    setErrors({ form: authErrorMessage });
  }, [authErrorMessage]);

  // 2026-04-30 수정: 로그인 API는 에러코드로 부가 동작만 분기하고, 사용자 메시지는 서버가 내려준 message를 그대로 form에 표시
  const handleLoginErrorResponse = (
    responseData: ApiErrorResponse | undefined,
    fallback: string,
  ): FieldErrors => {
    const errorCode = responseData?.error.code;
    const errorMessage = responseData?.error.message ?? fallback;
    const detail = responseData?.error.detail as AuthLockDetail | null | undefined;

    // 2026-04-30 수정: 로그인 AUTH003은 계정 잠금 상태이므로 lockedUntil 기준으로 로그인 UI를 함께 잠금 처리
    if (errorCode === 'AUTH003' && detail?.lockedUntil) {
      setLockedUntil(detail.lockedUntil);
    } else {
      setLockedUntil(null);
    }

    return { form: errorMessage };
  };

  // 2026-04-30 수정: 회원가입 API는 동일한 에러코드가 와도 별도 부가 동작 없이 서버 message를 그대로 form에 표시
  const handleSignupErrorResponse = (
    responseData: ApiErrorResponse | undefined,
    fallback: string,
  ): FieldErrors => {
    const errorMessage = responseData?.error.message ?? fallback;

    return { form: errorMessage };
  };

  // 2026-04-29 수정: 로그인 화면의 이메일/비밀번호 검증을 백엔드에 위임
  const validateLogin = (): FieldErrors => {
    return {};
  };

  // 2026-04-29 수정: 회원가입의 이름/비밀번호 확인 검증 메시지도 form 공통 에러로 표시
  const validateSignup = (): FieldErrors => {
    if (!name.trim()) {
      return { form: '이름을 입력해 주세요.' };
    }

    if (!confirmPassword) {
      return { form: '비밀번호 확인을 입력해 주세요.' };
    }

    if (password !== confirmPassword) {
      return { form: '비밀번호가 일치하지 않습니다.' };
    }

    return {};
  };

  // 2026-04-30 수정: 로그인 예외 응답도 로그인 API 에러코드 처리문을 재사용
  const getLoginApiErrorFieldsFromUnknown = (error: unknown, fallback: string): FieldErrors => {
    if (!axios.isAxiosError(error)) {
      return { form: error instanceof Error && error.message ? error.message : fallback };
    }

    const responseData = error.response?.data as ApiErrorResponse | undefined;
    return handleLoginErrorResponse(responseData, fallback);
  };

  // 2026-04-30 수정: 회원가입 예외 응답도 회원가입 API 에러코드 처리문을 재사용
  const getSignupApiErrorFieldsFromUnknown = (error: unknown, fallback: string): FieldErrors => {
    if (!axios.isAxiosError(error)) {
      return { form: error instanceof Error && error.message ? error.message : fallback };
    }

    const responseData = error.response?.data as ApiErrorResponse | undefined;
    return handleSignupErrorResponse(responseData, fallback);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting || isLoginLocked) {
      return;
    }

    // 제출 전 프론트 검증을 먼저 수행한다.
    const nextErrors = validateLogin();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // 로그인 성공 응답의 accessToken을 메모리에만 저장하고, refresh는 쿠키로 처리한다.
      const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
        email: email.trim(),
        password,
      });

      // 2026-04-29 수정: 로그인 실패 시 로그인 API 에러코드 처리문으로 부가 동작과 공통 에러 표시를 함께 처리
      if (!data.success) {
        setErrors(handleLoginErrorResponse(data, '로그인에 실패했습니다.'));
        return;
      }

      const { accessToken, refreshToken, tokenType, expiresIn } = data.data;
      // 2026-04-30 수정: 로그인 성공 시 accessToken과 tokenType을 함께 메모리에 저장하고, refreshToken/expiresIn은 현재 스펙 반영용으로만 수신한다.
      void refreshToken;
      void expiresIn;
      setAccessToken(accessToken, tokenType);
      setLockedUntil(null);

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrors(getLoginApiErrorFieldsFromUnknown(error, '로그인에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    // 회원가입은 입력 항목이 많아서 먼저 모두 검증한다.
    const nextErrors = validateSignup();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // 회원가입은 계정 생성까지만 처리하고, 로그인은 별도 단계로 분리한다.
      const { data } = await apiClient.post<SignupResponse>('/api/v1/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // 2026-04-29 수정: 회원가입 실패 시 회원가입 API 에러코드 처리문으로 공통 에러를 표시
      if (!data.success) {
        setErrors(handleSignupErrorResponse(data, '회원가입에 실패했습니다.'));
        return;
      }

      // 회원가입은 사용자 생성까지만 하고, 로그인은 별도 화면에서 진행한다.
      setMode('login');
      resetForm();
      setErrors({});
      setSuccessMessage(data.message ?? '회원가입이 완료되었습니다. 로그인해 주세요.');
    } catch (error) {
      setErrors(getSignupApiErrorFieldsFromUnknown(error, '회원가입에 실패했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Subtle Background Glow for Depth (Option 2 signature) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6366F1]/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-[14px] flex items-center justify-center shadow-md mb-4 border border-white/10">
            <Zap className="w-[22px] h-[22px] text-white fill-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-slate-50">나의 구매 비서</h1>
          <p className="text-[#64748B] dark:text-slate-400 text-sm font-medium mt-1.5">AI 기반 스마트 자동 결제 시스템</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[1.5rem] shadow-[0_8px_32px_rgb(15,23,42,0.06)] overflow-hidden transition-all">
          
          <div className="px-6 sm:px-8 pt-8 pb-4">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-50">
              {mode === 'login' ? '로그인' : '회원가입'}
            </h2>
            <p className="text-[#475569] dark:text-slate-400 text-sm font-medium mt-1.5">
              {mode === 'login' ? '계정 정보를 입력하세요' : '가입 정보를 입력하세요'}
            </p>
          </div>

          <div className="px-6 sm:px-8 pb-8 pt-2">
            {successMessage ? (
              <div className="mb-5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {successMessage}
              </div>
            ) : null}

            {errors.form ? (
              <div className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                {errors.form}
              </div>
            ) : null}

            {mode === 'login' && isLoginLocked && lockRemainingText ? (
              <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                {/* 2026-04-29 수정: AUTH003 잠금 상태일 때 남은 로그인 제한 시간을 사용자에게 표시 */}
                {`로그인 제한 해제까지 ${lockRemainingText} 남았습니다.`}
              </div>
            ) : null}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFormError();
                      }}
                      placeholder="your@email.com"
                      className="pl-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="email"
                      disabled={isSubmitting || isLoginLocked}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFormError();
                      }}
                      placeholder="••••••••"
                      className="pl-10 pr-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="current-password"
                      disabled={isSubmitting || isLoginLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] dark:hover:text-slate-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 hover:-translate-y-0.5 font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 border-none flex items-center justify-center"
                    disabled={isSubmitting || isLoginLocked}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        처리 중...
                      </>
                    ) : isLoginLocked ? (
                      `로그인 제한 (${lockRemainingText})`
                    ) : (
                      '로그인'
                    )}
                  </Button>
                </div>
                
                <div className="mt-6 text-center text-sm text-[#475569] dark:text-slate-400">
                  아직 계정이 없으신가요?{' '}
                  <button
                    type="button"
                    onClick={goToSignup}
                    className="text-[#6366F1] dark:text-indigo-400 font-bold hover:underline ml-1"
                    disabled={isSubmitting}
                  >
                    회원가입
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">이름</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFormError();
                      }}
                      placeholder="홍길동"
                      className="pl-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="name"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFormError();
                      }}
                      placeholder="your@email.com"
                      className="pl-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFormError();
                      }}
                      placeholder="••••••••"
                      className="pl-10 pr-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] dark:hover:text-slate-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#475569] dark:text-slate-300">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] dark:text-slate-500" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFormError();
                      }}
                      placeholder="••••••••"
                      className="pl-10 pr-10 text-[16px] md:text-sm h-12 rounded-xl bg-[#F1F5F9] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#6366F1]/30 dark:focus-visible:ring-indigo-400/30 focus-visible:border-[#6366F1]/40 dark:focus-visible:border-indigo-400/50 transition-colors"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] dark:hover:text-slate-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] dark:hover:from-indigo-400 hover:to-[#4338CA] dark:hover:to-indigo-500 hover:-translate-y-0.5 font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 border-none flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      '회원가입 완료'
                    )}
                  </Button>
                </div>

                <div className="mt-6 text-center text-sm text-[#475569] dark:text-slate-400">
                  이미 계정이 있으신가요?{' '}
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="text-[#6366F1] dark:text-indigo-400 font-bold hover:underline ml-1"
                    disabled={isSubmitting}
                  >
                    로그인
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 2026-04-30 수정: 지갑 주소 안내 문구를 배너 대신 한 줄 강조 텍스트형으로 조정 */}
        <p className="mt-6 text-center text-sm font-semibold text-[#475569] dark:text-slate-400 tracking-wide">
          PBM 지갑 주소는 <span className="text-[#6366F1] dark:text-indigo-400">설정</span>에서 등록하세요
        </p>
      </div>
    </div>
  );
}
