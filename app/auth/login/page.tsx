'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
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
        router.push('/lobby');
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] bg-pattern flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* 뒤로가기 */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#a0aec0] hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>돌아가기</span>
        </Link>

        {/* 카드 */}
        <div className="game-card rounded-2xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-xl bg-[#e94560]/20 mb-4">
              <svg className="w-8 h-8 text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">로그인</h1>
            <p className="text-[#a0aec0]">게임에 참여하세요</p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#a0aec0] mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-dark w-full px-4 py-3 rounded-xl"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0aec0] mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-dark w-full px-4 py-3 rounded-xl"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <span className="text-[#a0aec0]">계정이 없으신가요? </span>
            <Link href="/auth/signup" className="text-[#e94560] hover:underline font-medium">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
