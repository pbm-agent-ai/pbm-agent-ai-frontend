import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
  };

  const goToSignup = () => {
    setMode('signup');
    resetForm();
  };

  const goToLogin = () => {
    setMode('login');
    resetForm();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    alert('회원가입이 완료되었습니다.');
    goToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] flex items-center justify-center font-['Inter',sans-serif] p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#10b981] rounded-2xl mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a] mb-2">PBM Agent AI</h1>
          <p className="text-[#64748b] text-sm">AI 기반 스마트 자동 결제 시스템</p>
        </div>

        <Card className="bg-white border-[#e2e8f0] shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#0f172a]">{mode === 'login' ? '로그인' : '회원가입'}</CardTitle>
            <CardDescription className="text-[#64748b]">
              {mode === 'login' ? '계정 정보를 입력하세요' : '가입 정보를 입력하세요'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#10b981] text-white hover:bg-[#059669] font-semibold shadow-md"
                >
                  로그인
                </Button>

                <Button
                  type="button"
                  onClick={goToSignup}
                  className="w-full border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] hover:border-[#cbd5e1]"
                >
                  회원가입
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">이름</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#334155]">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#10b981] text-white hover:bg-[#059669] font-semibold shadow-md"
                >
                  회원가입 완료
                </Button>

                <Button
                  type="button"
                  onClick={goToLogin}
                  className="w-full border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] hover:border-[#cbd5e1]"
                >
                  로그인으로 돌아가기
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[#94a3b8] text-xs mt-4">PBM 지갑 주소는 가입 후 설정에서 등록하세요</p>
      </div>
    </div>
  );
}
