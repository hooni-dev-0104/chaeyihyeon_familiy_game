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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center safe-top safe-bottom">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-top safe-bottom">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">게임 선택</h1>
            <p className="text-xs text-gray-600 mt-0.5">{profile?.nickname}님 환영합니다!</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 px-3 py-2 text-sm"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="px-5 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-sm space-y-natural-lg">
          {/* 게임 소개 */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/lobby?game=liar" className="card p-5 text-center no-select">
              <div className="text-3xl mb-2">🎭</div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">라이어 게임</h3>
              <p className="text-xs text-gray-500">숨은 라이어 찾기</p>
            </Link>
            <Link href="/lobby?game=mafia" className="card p-5 text-center no-select">
              <div className="text-3xl mb-2">🔪</div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">마피아 게임</h3>
              <p className="text-xs text-gray-500">AI 사회자와 함께</p>
            </Link>
          </div>

          {/* 하단 정보 */}
          <div className="text-center space-y-1 pt-2">
            <p className="text-xs text-gray-500">3-12명이 함께 즐기는 게임</p>
            <p className="text-xs text-gray-400">모바일에서도 편하게!</p>
          </div>
        </div>
      </main>
    </div>
  );
}

