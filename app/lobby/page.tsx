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
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
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
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_players(count)
        `)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleBackToGames = () => {
    router.push('/games');
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

  const filteredRooms = selectedGameType 
    ? rooms.filter(r => r.game_type === selectedGameType)
    : rooms;

  const gameEmoji = selectedGameType === 'liar' ? '🎭' : selectedGameType === 'mafia' ? '🔪' : '🎮';
  const gameTitle = selectedGameType === 'liar' ? '라이어 게임' : 
                   selectedGameType === 'mafia' ? '마피아 게임' : '게임 로비';

  return (
    <div className="layout-container safe-area animate-fade-in">
      <div className="content-gap h-full flex flex-col py-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={handleBackToGames} 
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{gameEmoji} {gameTitle}</h1>
        </div>

        {/* 방 목록 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-24">
            {filteredRooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6 card">
                <div className="text-6xl mb-4">🎪</div>
                <p className="text-gray-900 text-lg font-bold mb-2">아직 방이 없어요</p>
                <p className="text-sm text-gray-600">첫 번째 방을 만들어보세요!</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div 
                  key={room.id} 
                  className="card p-5 flex items-center justify-between gap-4 card-interactive"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate mb-2">{room.name}</h3>
                    <div className="flex items-center gap-2">
                      {room.status === 'waiting' ? (
                        <span className="badge badge-green">대기중</span>
                      ) : (
                        <span className="badge badge-gray">진행중</span>
                      )}
                      <span className="text-sm text-gray-600 font-semibold">
                        {(room as any).room_players?.[0]?.count || 0} / {room.max_players}명
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
                    disabled={room.status === 'playing'}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      room.status === 'waiting' 
                        ? 'bg-kakao-yellow text-kakao-brown hover:bg-yellow-400' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {room.status === 'waiting' ? '입장' : '진행중'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 버튼 (고정) */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-sm border-t border-gray-200 safe-area">
          <div className="max-w-[460px] mx-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary w-full"
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
        <div className="flex flex-col items-center gap-4">
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 safe-area animate-fade-in">
      <div className="bg-white w-full max-w-[460px] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">방 만들기</h2>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
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
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              게임 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  gameType === 'liar'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">🎭</div>
                <div className={`font-bold text-sm ${gameType === 'liar' ? 'text-blue-600' : 'text-gray-600'}`}>
                  라이어 게임
                </div>
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  gameType === 'mafia'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">🔪</div>
                <div className={`font-bold text-sm ${gameType === 'mafia' ? 'text-purple-600' : 'text-gray-600'}`}>
                  마피아 게임
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-gray-700">최대 인원</label>
              <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                {maxPlayers}명
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{accentColor: '#FEE500'}}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>4명</span>
              <span>12명</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
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
