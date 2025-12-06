'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
      <div className="section-gap">
        {/* 헤더 섹션 */}
        <div className="text-center py-4 animate-scale-in">
          <div className="text-6xl mb-4 animate-bounce-subtle">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">가족 게임방</h1>
          <p className="text-white/90 text-base drop-shadow">이현이네 × 채이네</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-5 w-full">
            <div className="input-group animate-slide-up animate-delay-1">
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

            <div className="input-group animate-slide-up animate-delay-2">
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

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-600 text-sm text-center font-bold w-full animate-shake">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full mt-2 animate-slide-up animate-delay-3">
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
                '로그인하기'
              )}
            </button>
            
            <Link href="/auth/signup" className="btn btn-secondary">
              새 계정 만들기
            </Link>
          </div>
        </form>

        <div className="text-center text-sm text-white/80 mt-2 drop-shadow animate-slide-up animate-delay-4">
          즐거운 가족 게임을 시작해보세요 🎉
        </div>
      </div>
    </div>
  );
}
