'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Room, Player } from '@/types/game.types';

interface RoomPlayer extends Player {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [myPlayer, setMyPlayer] = useState<RoomPlayer | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUserAndJoin();
    
    // Realtime 구독
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  const checkUserAndJoin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      await fetchRoom();
      await fetchPlayers();
      await joinRoom(user.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoom(data);
      
      if (user && data.host_id === user.id) {
        setIsHost(true);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
      router.push('/lobby');
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select(`
          *,
          profiles:user_id (nickname)
        `)
        .eq('room_id', roomId);

      if (error) throw error;

      const playersList = (data || []).map(p => ({
        id: p.user_id,
        nickname: (p.profiles as any)?.nickname || 'Unknown',
        is_ready: p.is_ready,
        room_id: p.room_id,
        user_id: p.user_id,
        joined_at: p.joined_at,
      }));

      setPlayers(playersList);
      
      if (user) {
        const me = playersList.find(p => p.user_id === user.id);
        setMyPlayer(me || null);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const joinRoom = async (userId: string) => {
    try {
      // 이미 참가했는지 확인
      const { data: existing } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (!existing) {
        await supabase.from('room_players').insert({
          room_id: roomId,
          user_id: userId,
          is_ready: false,
        });
        await fetchPlayers();
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleReady = async () => {
    if (!user || !myPlayer) return;

    try {
      await supabase
        .from('room_players')
        .update({ is_ready: !myPlayer.is_ready })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      await fetchPlayers();
    } catch (error) {
      console.error('Error updating ready status:', error);
    }
  };

  const handleStartGame = async () => {
    if (!isHost || !room) return;

    // 모든 플레이어가 준비되었는지 확인
    const allReady = players.every(p => p.is_ready);
    if (!allReady) {
      alert('모든 플레이어가 준비해야 게임을 시작할 수 있습니다.');
      return;
    }

    if (players.length < 3) {
      alert('게임을 시작하려면 최소 3명이 필요합니다.');
      return;
    }

    try {
      // 방 상태를 playing으로 변경
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);

      // 게임 세션 생성
      const { data: session } = await supabase
        .from('game_sessions')
        .insert({
          room_id: roomId,
          game_type: room.game_type,
          current_phase: room.game_type === 'liar' ? 'hint' : 'night',
          game_state: {},
        })
        .select()
        .single();

      // 게임 페이지로 이동
      router.push(`/game/${room.game_type}/${roomId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('게임 시작에 실패했습니다.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!user) return;

    try {
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      // 방장이 나가면 방 삭제
      if (isHost) {
        await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);
      }

      router.push('/lobby');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-indigo-600">로딩 중...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">방을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        {/* 방 정보 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{room.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  room.game_type === 'liar' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {room.game_type === 'liar' ? '라이어 게임' : '마피아 게임'}
                </span>
                <span className="text-gray-600">
                  {players.length} / {room.max_players}명
                </span>
              </div>
            </div>
            <Button
              onClick={handleLeaveRoom}
              variant="danger"
              size="md"
            >
              나가기
            </Button>
          </div>

          {/* 게임 설명 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-gray-800 mb-2">게임 설명</h3>
            {room.game_type === 'liar' ? (
              <p className="text-sm text-gray-600">
                한 명의 라이어를 제외한 모든 플레이어에게 같은 제시어가 주어집니다. 
                라이어는 카테고리만 알 수 있습니다. 각자 돌아가며 힌트를 제시하고, 
                투표로 라이어를 찾아내세요!
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                AI 사회자가 진행하는 마피아 게임입니다. 마피아는 밤에 시민을 제거하고, 
                시민들은 낮에 토론하여 마피아를 찾아내야 합니다. 의사와 경찰의 특수 능력을 
                활용하세요!
              </p>
            )}
          </div>
        </div>

        {/* 플레이어 목록 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">참가자</h2>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.user_id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  player.is_ready 
                    ? 'bg-green-50 border-2 border-green-300' 
                    : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    player.is_ready ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-semibold text-gray-800">
                    {player.nickname}
                  </span>
                  {room.host_id === player.user_id && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                      방장
                    </span>
                  )}
                  {player.user_id === user?.id && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      나
                    </span>
                  )}
                </div>
                <span className={`font-semibold ${
                  player.is_ready ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {player.is_ready ? '준비 완료' : '대기 중'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {!isHost ? (
            <Button
              onClick={handleReady}
              className="w-full"
              size="lg"
              variant={myPlayer?.is_ready ? 'secondary' : 'primary'}
            >
              {myPlayer?.is_ready ? '준비 취소' : '준비'}
            </Button>
          ) : (
            <Button
              onClick={handleStartGame}
              className="w-full"
              size="lg"
              disabled={!players.every(p => p.is_ready) || players.length < 3}
            >
              게임 시작
            </Button>
          )}
        </div>

        {isHost && (
          <p className="text-center text-sm text-gray-600 mt-3">
            {players.every(p => p.is_ready) 
              ? players.length < 3 
                ? '최소 3명이 필요합니다.' 
                : '게임을 시작할 수 있습니다!'
              : '모든 플레이어가 준비해야 시작할 수 있습니다.'}
          </p>
        )}
      </div>
    </div>
  );
}

