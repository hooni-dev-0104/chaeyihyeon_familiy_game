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
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const filteredRooms = selectedGameType 
    ? rooms.filter(r => r.game_type === selectedGameType)
    : rooms;

  const gameTitle = selectedGameType === 'liar' ? '라이어 게임' : 
                   selectedGameType === 'mafia' ? '마피아 게임' : '게임 로비';

  return (
    <div className="layout-container safe-area">
      <div className="section-gap h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between py-4">
          <button onClick={handleBackToGames} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">{gameTitle}</h1>
          <div className="w-10"></div> {/* 공간 균형용 */}
        </div>

        {/* 방 목록 */}
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-800">
              대기 중인 방 ({filteredRooms.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-24">
            {filteredRooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-4xl mb-3">🎪</div>
                <p className="text-gray-900 font-medium mb-1">아직 방이 없어요</p>
                <p className="text-sm text-gray-500">첫 번째 방을 만들어보세요!</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div key={room.id} className="card p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate mb-1">{room.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${room.status === 'waiting' ? 'badge-green' : 'badge-yellow'}`}>
                        {room.status === 'waiting' ? '대기중' : '진행중'}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        {(room as any).room_players?.[0]?.count || 0} / {room.max_players}명
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
                    disabled={room.status === 'playing'}
                    className={`btn px-5 h-10 text-sm flex-shrink-0 w-auto ${
                      room.status === 'waiting' ? 'btn-primary' : 'btn-secondary opacity-50'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    {room.status === 'waiting' ? '입장' : '관전'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 버튼 (고정) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 safe-area">
          <div className="max-w-[400px] mx-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary w-full shadow-lg"
            >
              + 새 방 만들기
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
        <div className="text-center text-gray-500">로딩 중...</div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 safe-area">
      <div className="bg-white w-full max-w-[400px] rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">새 게임 방 만들기</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="form-gap">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 ml-1">
              방 이름
            </label>
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
            <label className="block text-xs font-semibold text-gray-700 mb-3 ml-1">
              게임 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  gameType === 'liar'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 ring-offset-0'
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
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  gameType === 'mafia'
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20 ring-offset-0'
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
            <div className="flex justify-between items-center mb-3 ml-1">
              <label className="text-xs font-semibold text-gray-700">최대 인원</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                {maxPlayers}명
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
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
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
