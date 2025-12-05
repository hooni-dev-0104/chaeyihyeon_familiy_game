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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">게임 로비</h1>
            <p className="text-sm text-gray-600">{profile?.nickname}님 환영합니다!</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            나가기
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 방 만들기 버튼 */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary w-full py-5 mb-6 text-lg"
        >
          + 새 게임 방 만들기
        </button>

        {/* 방 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">활성 방 목록</h2>

          {rooms.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-600 mb-2">열린 방이 없습니다</p>
              <p className="text-sm text-gray-500">첫 번째 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div key={room.id} className="card p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-800">{room.name}</h3>
                        <span className={`badge ${room.game_type === 'liar' ? 'badge-blue' : 'badge-purple'}`}>
                          {room.game_type === 'liar' ? '라이어' : '마피아'}
                        </span>
                        <span className={`badge ${room.status === 'waiting' ? 'badge-green' : 'badge-yellow'}`}>
                          {room.status === 'waiting' ? '대기중' : '게임중'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {(room as any).room_players?.[0]?.count || 0} / {room.max_players}명
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.status === 'playing'}
                      className={`btn px-6 py-3 ${
                        room.status === 'waiting' ? 'btn-primary' : 'btn-secondary opacity-50'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">새 게임 방</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방 이름
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="input w-full"
              placeholder="우리 가족 게임방"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              게임 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGameType('liar')}
                className={`p-4 rounded-lg border-2 text-center ${
                  gameType === 'liar'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-3xl mb-2">🎭</div>
                <div className="font-bold text-gray-800">라이어</div>
              </button>
              <button
                type="button"
                onClick={() => setGameType('mafia')}
                className={`p-4 rounded-lg border-2 text-center ${
                  gameType === 'mafia'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-3xl mb-2">🔪</div>
                <div className="font-bold text-gray-800">마피아</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              최대 인원: <span className="text-indigo-600 font-bold">{maxPlayers}명</span>
            </label>
            <input
              type="range"
              min="4"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>4명</span>
              <span>12명</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1 py-3"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 py-3 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '방 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
