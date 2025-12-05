'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (nickname.trim().length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname: nickname.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        router.push('/lobby');
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message || '회원가입에 실패했습니다.');
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
            <div className="inline-block p-3 rounded-xl bg-purple-500/20 mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">회원가입</h1>
            <p className="text-[#a0aec0]">가족 게임에 참여하세요</p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a0aec0] mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="input-dark w-full px-4 py-3 rounded-xl"
                placeholder="게임에서 사용할 이름"
              />
            </div>

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
                placeholder="최소 6자 이상"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a0aec0] mb-2">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-dark w-full px-4 py-3 rounded-xl"
                placeholder="비밀번호 재입력"
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
              className="btn-primary w-full py-4 rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <span className="text-[#a0aec0]">이미 계정이 있으신가요? </span>
            <Link href="/auth/login" className="text-[#e94560] hover:underline font-medium">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
