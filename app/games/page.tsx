'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GamesPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="layout-container layout-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <p className="text-gray-600 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container safe-area animate-fade-in">
      <div className="flex-1 flex flex-col content-gap py-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">게임 선택</h1>
            <p className="text-sm text-gray-600 mt-1">{profile?.nickname}님, 환영합니다</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors px-3 py-2"
          >
            로그아웃
          </button>
        </div>

        {/* 게임 목록 */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          <Link 
            href="/lobby?game=liar" 
            className="card p-6 flex items-center gap-5 card-interactive"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-4xl">
              🎭
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">라이어 게임</h3>
              <p className="text-sm text-gray-600">거짓말쟁이를 찾아내세요</p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>

          <Link 
            href="/lobby?game=mafia" 
            className="card p-6 flex items-center gap-5 card-interactive"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-4xl">
              🔪
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">마피아 게임</h3>
              <p className="text-sm text-gray-600">AI 사회자와 함께하는 추리</p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-gray-600">3명 이상 모여서 플레이하세요</p>
        </div>
      </div>
    </div>
  );
}
