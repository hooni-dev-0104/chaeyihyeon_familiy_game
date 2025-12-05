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
    <div className="layout-container layout-center safe-area">
      <div className="section-gap">
        {/* 헤더 섹션 */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">가족 게임방</h1>
          <p className="text-gray-500">이현이네 × 채이네 가족을 위한<br/>즐거운 게임 공간 🎮</p>
        </div>

        {/* 로그인 카드 */}
        <div className="card p-6">
          <form onSubmit={handleLogin} className="form-gap">
            <div className="content-gap">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  이메일
                </label>
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  비밀번호
                </label>
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
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-2"
            >
              {loading ? '로그인 중...' : '로그인하기'}
            </button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">아직 계정이 없으신가요?</p>
          <Link href="/auth/signup" className="btn btn-secondary">
            새 계정 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}
