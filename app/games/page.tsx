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
          <p className="text-white text-sm drop-shadow">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container safe-area animate-fade-in">
      <div className="flex-1 flex flex-col content-gap">
        {/* 헤더 */}
        <div className="flex items-center justify-between py-3 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">게임 선택</h1>
            <p className="text-base text-white/90 mt-2 drop-shadow">오늘 어떤 게임을 할까요?</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 mb-2">
              <span className="block text-sm font-bold text-white drop-shadow">{profile?.nickname}님</span>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-xs text-white/80 font-semibold hover:text-white transition-colors drop-shadow px-2 py-1 hover:bg-white/10 rounded-lg"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 게임 목록 */}
        <div className="flex-1 flex flex-col justify-center gap-6 pb-8">
          <Link 
            href="/lobby?game=liar" 
            className="card card-liar p-8 flex items-center gap-6 card-interactive animate-slide-up animate-delay-1"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-5xl shadow-lg animate-wiggle">
              🎭
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">라이어 게임</h3>
              <p className="text-base text-gray-600 font-medium">거짓말쟁이를 찾아내세요!</p>
              <div className="mt-3 flex gap-2">
                <span className="badge badge-blue text-[10px]">추리</span>
                <span className="badge badge-green text-[10px]">3-8명</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              →
            </div>
          </Link>

          <Link 
            href="/lobby?game=mafia" 
            className="card card-mafia p-8 flex items-center gap-6 card-interactive animate-slide-up animate-delay-2"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-red-500 flex items-center justify-center text-5xl shadow-lg animate-wiggle">
              🔪
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">마피아 게임</h3>
              <p className="text-base text-gray-600 font-medium">AI 사회자와 함께하는 추리</p>
              <div className="mt-3 flex gap-2">
                <span className="badge badge-purple text-[10px]">AI</span>
                <span className="badge badge-red text-[10px]">4-12명</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-red-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              →
            </div>
          </Link>
        </div>

        {/* 하단 메시지 */}
        <div className="text-center py-6 text-sm text-white/80 border-t-2 border-white/20 backdrop-blur-sm rounded-t-3xl bg-white/10 animate-slide-up animate-delay-3">
          <div className="text-2xl mb-2">👥</div>
          <p className="font-semibold drop-shadow">3명 이상 모여서 플레이하세요</p>
        </div>
      </div>
    </div>
  );
}
