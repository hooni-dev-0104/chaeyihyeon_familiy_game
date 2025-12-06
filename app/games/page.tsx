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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner"></div>
          <p className="text-gray-600 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container safe-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">게임 선택</h1>
            <p className="text-sm text-gray-600" style={{ marginTop: '4px' }}>{profile?.nickname}님, 환영합니다</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
            style={{ padding: '8px 12px' }}
          >
            로그아웃
          </button>
        </div>

        {/* 게임 목록 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <Link 
            href="/lobby?game=liar" 
            className="card card-interactive"
            style={{ padding: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
              🎭
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="text-xl font-bold text-gray-900" style={{ marginBottom: '4px' }}>라이어 게임</h3>
              <p className="text-sm text-gray-600">거짓말쟁이를 찾아내세요</p>
            </div>
            <svg style={{ width: '24px', height: '24px', color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>

          <Link 
            href="/lobby?game=mafia" 
            className="card card-interactive"
            style={{ padding: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
              🔪
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="text-xl font-bold text-gray-900" style={{ marginBottom: '4px' }}>마피아 게임</h3>
              <p className="text-sm text-gray-600">AI 사회자와 함께하는 추리</p>
            </div>
            <svg style={{ width: '24px', height: '24px', color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* 하단 안내 */}
        <div className="bg-gray-50 rounded-xl text-center" style={{ marginTop: '24px', padding: '16px' }}>
          <p className="text-sm text-gray-600">3명 이상 모여서 플레이하세요</p>
        </div>
      </div>
    </div>
  );
}
