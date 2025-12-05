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
        router.push('/games');
        router.refresh();
      }
    } catch (error: any) {
      setError(error.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-container layout-center safe-area">
      <div className="section-gap">
        {/* 헤더 */}
        <div className="text-center py-4 relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
        </div>

        {/* 입력 폼 */}
        <div className="card p-6">
          <form onSubmit={handleSignup} className="form-gap">
            <div className="content-gap">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className="input"
                  placeholder="게임에서 사용할 이름"
                  autoComplete="nickname"
                />
              </div>

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
                  placeholder="email@example.com"
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
                  placeholder="최소 6자 이상"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input"
                  placeholder="비밀번호를 다시 입력하세요"
                  autoComplete="new-password"
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
              {loading ? '가입 중...' : '가입 완료하기'}
            </button>
          </form>
        </div>

        {/* 로그인 링크 */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">이미 계정이 있으신가요?</p>
          <Link href="/" className="btn btn-secondary">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
