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

    // 필수 필드 검증
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (!confirmPassword) {
      setError('비밀번호 확인을 입력해주세요.');
      return;
    }

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
    <div className="layout-container layout-center safe-area animate-fade-in">
      <div className="content-gap max-w-md mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center py-6 relative w-full">
          <Link 
            href="/" 
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSignup} className="flex flex-col w-full">
          <div className="input-container" style={{ marginBottom: '48px' }}>
            <div className="input-group">
              <label className="input-label">닉네임 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="input"
                placeholder="게임에서 사용할 이름 (필수)"
                autoComplete="nickname"
              />
            </div>

            <div className="input-group">
              <label className="input-label">이메일 <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="이메일을 입력하세요 (필수)"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">비밀번호 <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="최소 6자 이상 (필수)"
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label className="input-label">비밀번호 확인 <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input"
                placeholder="비밀번호를 다시 입력하세요 (필수)"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-semibold" style={{ marginBottom: '32px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="spinner-small"></div>
                <span>가입 중...</span>
              </div>
            ) : (
              '가입하기'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400" style={{ marginTop: '24px' }}>
          <span className="text-red-500">*</span> 표시는 필수 입력 항목입니다
        </div>
      </div>
    </div>
  );
}
