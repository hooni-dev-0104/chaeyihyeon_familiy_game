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
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="layout-container safe-area">
      <div className="flex-1 flex flex-col section-gap">
        {/* 헤더 */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">게임 선택</h1>
            <p className="text-sm text-gray-500 mt-1">오늘 어떤 게임을 할까요?</p>
          </div>
          <div className="text-right">
            <span className="block text-sm font-semibold text-gray-900">{profile?.nickname}님</span>
            <button onClick={handleLogout} className="text-xs text-red-500 font-medium hover:text-red-600 mt-1">
              로그아웃
            </button>
          </div>
        </div>

        {/* 게임 목록 */}
        <div className="flex-1 flex flex-col justify-center gap-4 pb-8">
          <Link href="/lobby?game=liar" className="card p-6 flex items-center gap-5 card-interactive">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl shadow-sm">
              🎭
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">라이어 게임</h3>
              <p className="text-sm text-gray-500">거짓말쟁이를 찾아내세요!</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              →
            </div>
          </Link>

          <Link href="/lobby?game=mafia" className="card p-6 flex items-center gap-5 card-interactive">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl shadow-sm">
              🔪
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">마피아 게임</h3>
              <p className="text-sm text-gray-500">AI 사회자와 함께하는 추리</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              →
            </div>
          </Link>
        </div>

        {/* 하단 메시지 */}
        <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
          3명 이상 모여서 플레이하세요
        </div>
      </div>
    </div>
  );
}
