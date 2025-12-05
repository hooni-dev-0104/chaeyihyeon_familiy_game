'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Room } from '@/types/game.types';

interface Profile {
  id: string;
  nickname: string;
}

export default function LobbyPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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
        router.push('/auth/login');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="text-[#e94560] text-xl">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23] bg-pattern">
      {/* 헤더 */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e94560]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-white">게임 로비</h1>
              <p className="text-sm text-[#a0aec0]">{profile?.nickname}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#a0aec0] hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            나가기
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {/* 방 만들기 버튼 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full game-card rounded-2xl p-6 mb-6 flex items-center justify-center gap-3 hover:border-[#e94560]/50 group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#e94560]/20 flex items-center justify-center group-hover:bg-[#e94560]/30 transition-colors">
            <svg className="w-6 h-6 text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">새 게임 방 만들기</span>
        </button>

        {/* 방 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            활성 방 목록
          </h2>

          {rooms.length === 0 ? (
            <div className="game-card rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#a0aec0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-[#a0aec0] font-medium">열린 방이 없습니다</p>
              <p className="text-sm text-[#a0aec0]/70 mt-1">첫 번째 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div key={room.id} className="game-card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        room.game_type === 'liar' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                      }`}>
                        {room.game_type === 'liar' ? (
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{room.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`badge ${room.game_type === 'liar' ? 'badge-liar' : 'badge-mafia'}`}>
                            {room.game_type === 'liar' ? '라이어' : '마피아'}
                          </span>
                          <span className={`badge ${room.status === 'waiting' ? 'badge-waiting' : 'badge-playing'}`}>
                            {room.status === 'waiting' ? '대기중' : '게임중'}
                          </span>
                          <span className="text-sm text-[#a0aec0]">
                            {(room as any).room_players?.[0]?.count || 0}/{room.max_players}명
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.status === 'playing'}
                      className={`px-5 py-2.5 rounded-xl font-bold transition-all flex-shrink-0 ${
                        room.status === 'waiting'
                          ? 'btn-primary'
                          : 'bg-white/10 text-[#a0aec0] cursor-not-allowed'
                      }`}
                    >
                      {room.status === 'waiting' ? '입장' : '진행중'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          userId={user?.id}
          onRoomCreated={(roomId) => {
            setShowCreateModal(false);
            router.push(`/room/${roomId}`);
          }}
        />
      )}
    </div>
  );
}

interface CreateRoomModalProps {
  onClose: () => void;
  userId: string;
  onRoomCreated: (roomId: string) => void;
}

function CreateRoomModal({ onClose, userId, onRoomCreated }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState<'liar' | 'mafia'>('liar');
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="game-card rounded-2xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">새 게임 방</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-[#a0aec0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#a0aec0] mb-2">
              방 이름
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="input-dark w-full px-4 py-3 rounded-xl"
              placeholder="우리 가족 게임방"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0aec0] mb-3">
              게임 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  gameType === 'liar'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <svg className={`w-8 h-8 mx-auto mb-2 ${gameType === 'liar' ? 'text-blue-400' : 'text-[#a0aec0]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`font-bold ${gameType === 'liar' ? 'text-white' : 'text-[#a0aec0]'}`}>라이어</span>
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  gameType === 'mafia'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <svg className={`w-8 h-8 mx-auto mb-2 ${gameType === 'mafia' ? 'text-purple-400' : 'text-[#a0aec0]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className={`font-bold ${gameType === 'mafia' ? 'text-white' : 'text-[#a0aec0]'}`}>마피아</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0aec0] mb-3">
              최대 인원: <span className="text-white font-bold">{maxPlayers}명</span>
            </label>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e94560]"
            />
            <div className="flex justify-between text-xs text-[#a0aec0] mt-1">
              <span>4명</span>
              <span>12명</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3 rounded-xl"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
