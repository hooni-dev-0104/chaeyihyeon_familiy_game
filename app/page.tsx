'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // 페이지 로드 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 이메일 기억하기 설정 저장
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      if (data.user) {
        router.push('/games');
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-container layout-center safe-area animate-fade-in">
      <div className="content-gap max-w-md mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="text-center py-8">
          <div className="text-7xl mb-6">🎮</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">가족 게임방</h1>
          <p className="text-gray-600 text-base">이현이네 × 채이네 가족 게임</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col w-full">
          <div className="input-container" style={{ marginBottom: '24px' }}>
            <div className="input-group">
              <label className="input-label">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="이메일을 입력하세요"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* 이메일 기억하기 체크박스 */}
          <div className="flex items-center gap-2 px-1" style={{ marginBottom: '32px' }}>
            <input
              type="checkbox"
              id="rememberEmail"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-kakao-yellow focus:ring-kakao-yellow cursor-pointer"
              style={{ accentColor: '#FEE500' }}
            />
            <label htmlFor="rememberEmail" className="text-sm text-gray-600 cursor-pointer select-none">
              이메일 기억하기
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-semibold" style={{ marginBottom: '32px' }}>
              {error}
            </div>
          )}

          <div className="flex flex-col" style={{ gap: '20px' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="spinner-small"></div>
                  <span>로그인 중...</span>
                </div>
              ) : (
                '로그인'
              )}
            </button>
            
            <Link href="/auth/signup" className="btn btn-secondary">
              회원가입
            </Link>
          </div>
        </form>

        <div className="text-center text-sm text-gray-500" style={{ marginTop: '48px' }}>
          가족과 함께 즐거운 시간을 보내세요
        </div>
      </div>
    </div>
  );
}
