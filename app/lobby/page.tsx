'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Room } from '@/types/game.types';

interface Profile {
  id: string;
  nickname: string;
}

function LobbyContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<'liar' | 'mafia' | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const gameParam = searchParams.get('game');
    if (gameParam === 'liar' || gameParam === 'mafia') {
      setSelectedGameType(gameParam);
    }
    checkUser();
    fetchRooms();
    
    const roomsChannel = supabase
      .channel('rooms-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          console.log('Room changes detected');
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        () => {
          console.log('Room players changed');
          fetchRooms();
        }
      )
      .subscribe();

    // 폴링 추가
    const pollingInterval = setInterval(() => {
      console.log('Polling rooms...');
      fetchRooms();
    }, 5000); // 5초마다

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(roomsChannel);
    };
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

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms...');
      
      // 방 목록 가져오기
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      console.log('Rooms data:', roomsData, 'Error:', roomsError);

      if (roomsError) throw roomsError;

      // 각 방의 플레이어 수 가져오기
      const roomsWithPlayers = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { data: playersData, error: playersError } = await supabase
            .from('room_players')
            .select('user_id')
            .eq('room_id', room.id);

          if (playersError) {
            console.error('Error fetching players for room:', room.id, playersError);
            return { ...room, player_count: 0 };
          }

          const playerCount = playersData?.length || 0;
          console.log(`Room ${room.name}: ${playerCount} players`);
          return { ...room, player_count: playerCount };
        })
      );
      
      console.log('Final rooms with players:', roomsWithPlayers);
      setRooms(roomsWithPlayers);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered');
    await fetchRooms();
    setTimeout(() => setRefreshing(false), 500); // 최소 0.5초 표시
  };

  const handleBackToGames = () => {
    router.push('/games');
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

  const filteredRooms = selectedGameType 
    ? rooms.filter(r => r.game_type === selectedGameType)
    : rooms;

  const gameEmoji = selectedGameType === 'liar' ? '🎭' : selectedGameType === 'mafia' ? '🔪' : '🎮';
  const gameTitle = selectedGameType === 'liar' ? '라이어 게임' : 
                   selectedGameType === 'mafia' ? '마피아 게임' : '게임 로비';

  return (
    <div className="layout-container safe-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleBackToGames} 
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              style={{ marginLeft: '-8px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{gameEmoji} {gameTitle}</h1>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            style={{ marginRight: '-8px' }}
            title="새로고침"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                transformOrigin: 'center'
              }}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>

        {/* 방 목록 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '96px' }}>
            {filteredRooms.length === 0 ? (
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎪</div>
                <p className="text-gray-900 text-lg font-bold" style={{ marginBottom: '8px' }}>아직 방이 없어요</p>
                <p className="text-sm text-gray-600">첫 번째 방을 만들어보세요!</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div 
                  key={room.id} 
                  className="card card-interactive"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="text-lg font-bold text-gray-900" style={{ marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {room.status === 'waiting' ? (
                        <span className="badge badge-green">대기중</span>
                      ) : (
                        <span className="badge badge-gray">진행중</span>
                      )}
                      <span className="text-sm text-gray-600 font-semibold">
                        {(room as any).player_count || 0} / {room.max_players}명
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
                    disabled={room.status === 'playing'}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      border: 'none',
                      cursor: room.status === 'playing' ? 'not-allowed' : 'pointer',
                      background: room.status === 'waiting' ? '#FEE500' : '#e5e7eb',
                      color: room.status === 'waiting' ? '#3C1E1E' : '#9ca3af',
                      flexShrink: 0
                    }}
                  >
                    {room.status === 'waiting' ? '입장' : '진행중'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 버튼 (고정) */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: '460px', margin: '0 auto', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              방 만들기
            </button>
          </div>
        </div>
      </div>

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          userId={user?.id}
          defaultGameType={selectedGameType}
          onRoomCreated={(roomId) => {
            setShowCreateModal(false);
            router.push(`/room/${roomId}`);
          }}
        />
      )}
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="layout-container layout-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner"></div>
          <p className="text-gray-600 text-sm">로딩 중...</p>
        </div>
      </div>
    }>
      <LobbyContent />
    </Suspense>
  );
}

interface CreateRoomModalProps {
  onClose: () => void;
  userId: string;
  defaultGameType?: 'liar' | 'mafia' | null;
  onRoomCreated: (roomId: string) => void;
}

function CreateRoomModal({ onClose, userId, defaultGameType, onRoomCreated }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState<'liar' | 'mafia'>(
    defaultGameType || 'liar'
  );
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          host_id: userId,
          game_type: gameType,
          max_players: maxPlayers,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: userId,
        is_ready: true,
      });

      onRoomCreated(room.id);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} className="animate-fade-in">
      <div className="bg-white animate-slide-up" style={{ width: '100%', maxWidth: '460px', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 className="text-xl font-bold text-gray-900">방 만들기</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            style={{ marginRight: '-8px' }}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="input-group">
            <label className="input-label">방 이름</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="input"
              placeholder="예: 우리 가족 게임방"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700" style={{ display: 'block', marginBottom: '12px' }}>
              게임 선택
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setGameType('liar')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: gameType === 'liar' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  background: gameType === 'liar' ? '#dbeafe' : 'white',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎭</div>
                <div className={`font-bold text-sm ${gameType === 'liar' ? 'text-blue-600' : 'text-gray-600'}`}>
                  라이어 게임
                </div>
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: gameType === 'mafia' ? '2px solid #a855f7' : '2px solid #e5e7eb',
                  background: gameType === 'mafia' ? '#f3e8ff' : 'white',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔪</div>
                <div className={`font-bold text-sm ${gameType === 'mafia' ? 'text-purple-600' : 'text-gray-600'}`}>
                  마피아 게임
                </div>
              </button>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="text-sm font-semibold text-gray-700">최대 인원</label>
              <span className="text-sm font-bold text-gray-900 bg-gray-100" style={{ padding: '4px 12px', borderRadius: '8px' }}>
                {maxPlayers}명
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '8px', appearance: 'none', cursor: 'pointer', accentColor: '#FEE500' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }} className="text-xs text-gray-400">
              <span>4명</span>
              <span>12명</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner-small"></div>
                  <span>생성 중...</span>
                </div>
              ) : (
                '만들기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
