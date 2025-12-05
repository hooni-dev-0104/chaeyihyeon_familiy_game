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
    <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                게임 로비
              </h1>
              <p className="text-gray-600 mt-1">
                환영합니다, <span className="font-semibold text-indigo-600">{profile?.nickname}</span>님!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 방 생성 버튼 */}
        <div className="mb-6">
          <Button
            onClick={handleCreateRoom}
            className="w-full"
            size="lg"
          >
            + 새 게임 방 만들기
          </Button>
        </div>

        {/* 활성 방 목록 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">활성 방 목록</h2>
          
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">현재 활성화된 방이 없습니다.</p>
              <p className="text-gray-400 mt-2">새로운 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-100 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-800">{room.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          room.game_type === 'liar' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {room.game_type === 'liar' ? '라이어 게임' : '마피아 게임'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          room.status === 'waiting' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {room.status === 'waiting' ? '대기 중' : '게임 중'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        참가자: {(room as any).room_players?.[0]?.count || 0} / {room.max_players}명
                      </p>
                    </div>
                    <Button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.status === 'playing'}
                      size="md"
                    >
                      {room.status === 'waiting' ? '입장' : '관전'}
                    </Button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">새 게임 방 만들기</h2>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방 이름
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="재미있는 게임방"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              게임 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  gameType === 'liar'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                라이어 게임
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  gameType === 'mafia'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                마피아 게임
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              최대 인원: {maxPlayers}명
            </label>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

