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
    <div className="layout-container safe-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '20px', paddingBottom: '20px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 className="text-2xl font-bold text-gray-900">게임 선택</h1>
          <button 
            onClick={handleLogout} 
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px', fontWeight: '500' }}
          >
            로그아웃
          </button>
        </div>

        {/* 환영 메시지 카드 */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', background: 'linear-gradient(135deg, #FEE500 0%, #FFEB3B 100%)' }}>
          <p className="font-bold" style={{ color: '#3C1E1E', fontSize: '16px' }}>
            👋 {profile?.nickname}님, 환영합니다!
          </p>
        </div>

        {/* 게임 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <Link 
            href="/lobby?game=liar" 
            className="card card-interactive"
            style={{ padding: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>
              🎭
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="font-bold text-gray-900" style={{ fontSize: '18px', marginBottom: '4px' }}>라이어 게임</h3>
              <p className="text-gray-600" style={{ fontSize: '13px' }}>거짓말쟁이를 찾아내세요</p>
            </div>
            <svg style={{ width: '20px', height: '20px', color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>

          <Link 
            href="/lobby?game=mafia" 
            className="card card-interactive"
            style={{ padding: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#F5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>
              🔪
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="font-bold text-gray-900" style={{ fontSize: '18px', marginBottom: '4px' }}>마피아 게임</h3>
              <p className="text-gray-600" style={{ fontSize: '13px' }}>AI 사회자와 함께하는 추리</p>
            </div>
            <svg style={{ width: '20px', height: '20px', color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* 하단 안내 */}
        <div className="card" style={{ marginTop: 'auto', padding: '16px', textAlign: 'center', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg style={{ width: '16px', height: '16px', color: '#6B7280' }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
            <p className="text-gray-600 font-medium" style={{ fontSize: '13px' }}>3명 이상 모여서 플레이하세요</p>
          </div>
        </div>
      </div>
    </div>
  );
}
