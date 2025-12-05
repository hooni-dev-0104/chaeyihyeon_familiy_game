'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
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
    
    // Realtime 구독
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

      // 프로필 가져오기
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

  const handleCreateRoom = () => {
    setShowCreateModal(true);
  };

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-indigo-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-10 right-10 text-5xl animate-float opacity-10">🎪</div>
      <div className="absolute bottom-10 left-10 text-5xl animate-float opacity-10" style={{ animationDelay: '1s' }}>🎮</div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl animate-bounce-subtle">🎉</div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  게임 로비
                </h1>
                <p className="text-white/90 font-medium">
                  환영합니다, <span className="font-bold text-yellow-300">{profile?.nickname}</span>님! 👋
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 font-bold rounded-xl transition-all border-2 border-white/30"
            >
              나가기 🚪
            </button>
          </div>
        </div>

        {/* 방 생성 버튼 */}
        <div className="mb-6">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white py-6 px-8 rounded-3xl font-bold text-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-4 border-white btn-pulse"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-3xl">➕</span>
              <span>새 게임 방 만들기</span>
              <span className="text-3xl">🎮</span>
            </span>
          </button>
        </div>

        {/* 활성 방 목록 */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 border-4 border-indigo-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🏠</span>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              활성 방 목록
            </h2>
          </div>
          
          {rooms.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
              <div className="text-6xl mb-4 animate-bounce-subtle">🎪</div>
              <p className="text-gray-600 text-xl font-bold mb-2">아직 열린 방이 없어요!</p>
              <p className="text-gray-500">첫 번째 방을 만들어보세요! ✨</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-5 border-3 border-indigo-200 hover:border-indigo-400 transition-all shadow-lg hover:shadow-xl game-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {room.game_type === 'liar' ? '🎭' : '🔪'}
                        </span>
                        <h3 className="text-xl font-bold text-gray-800">{room.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                          room.game_type === 'liar' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-purple-500 text-white'
                        }`}>
                          {room.game_type === 'liar' ? '🎭 라이어 게임' : '🔪 마피아 게임'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                          room.status === 'waiting' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {room.status === 'waiting' ? '✨ 대기 중' : '🎮 게임 중'}
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-gray-700 shadow-md">
                          👥 {(room as any).room_players?.[0]?.count || 0} / {room.max_players}명
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.status === 'playing'}
                      className={`px-6 py-3 rounded-xl font-bold text-lg shadow-lg transform transition-all ${
                        room.status === 'waiting'
                          ? 'bg-gradient-to-r from-green-400 to-green-500 text-white hover:scale-105 hover:shadow-xl'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {room.status === 'waiting' ? '입장 🚪' : '게임 중 🎮'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      // 방장도 참가자로 추가
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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border-4 border-indigo-200 transform scale-100 animate-bounce-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce-subtle">🎪</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            새 게임 방 만들기
          </h2>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <span>🏷️</span>
              <span>방 이름</span>
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none font-medium text-lg transition-all"
              placeholder="재미있는 게임방 💫"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🎮</span>
              <span>게임 유형</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`py-4 px-4 rounded-2xl font-bold transition-all transform hover:scale-105 border-3 ${
                  gameType === 'liar'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl scale-105 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                <div className="text-3xl mb-1">🎭</div>
                <div>라이어 게임</div>
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                className={`py-4 px-4 rounded-2xl font-bold transition-all transform hover:scale-105 border-3 ${
                  gameType === 'mafia'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl scale-105 border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                <div className="text-3xl mb-1">🔪</div>
                <div>마피아 게임</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>👥</span>
              <span>최대 인원: <span className="text-indigo-600 text-xl">{maxPlayers}명</span></span>
            </label>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((maxPlayers - 4) / 8) * 100}%, #e5e7eb ${((maxPlayers - 4) / 8) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 font-medium">
              <span>4명</span>
              <span>12명</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all transform hover:scale-105"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? '✨ 생성 중...' : '🎉 방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

