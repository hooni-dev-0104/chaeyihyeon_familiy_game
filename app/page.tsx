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
      <div className="content-gap max-w-md mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="text-center py-8">
          <div className="text-7xl mb-6">🎮</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">가족 게임방</h1>
          <p className="text-gray-600 text-base">이현이네 × 채이네 가족 게임</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
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

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-2"
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
        </form>

        <div className="text-center text-sm text-gray-500 mt-6">
          가족과 함께 즐거운 시간을 보내세요
        </div>
      </div>
    </div>
  );
}
