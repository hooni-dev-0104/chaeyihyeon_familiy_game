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
        <div className="text-center py-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1.5">가족 게임방</h1>
          <p className="text-gray-500 text-sm">이현이네 × 채이네</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-3 w-full">
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs text-center font-medium w-full">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full mt-1">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '로그인 중...' : '로그인하기'}
            </button>
            
            <Link href="/auth/signup" className="btn btn-secondary">
              새 계정 만들기
            </Link>
          </div>
        </form>

        <div className="text-center text-xs text-gray-400 mt-1">
          즐거운 가족 게임을 시작해보세요 🎮
        </div>

        {/* 디버깅용: 환경 변수 확인 (배포 후 삭제 예정) */}
        <div className="text-[10px] text-gray-300 text-center break-all px-4">
          DEBUG: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20)}...
        </div>
      </div>
    </div>
  );
}
