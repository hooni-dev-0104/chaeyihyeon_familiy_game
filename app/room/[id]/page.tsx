'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);

      await supabase
        .from('game_sessions')
        .insert({
          room_id: roomId,
          game_type: room.game_type,
          current_phase: room.game_type === 'liar' ? 'hint' : 'night',
          game_state: {},
        })
        .select()
        .single();

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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center safe-top safe-bottom">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center safe-top safe-bottom">
        <div className="text-gray-600">방을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const allReady = players.every(p => p.is_ready);
  const canStart = allReady && players.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-top safe-bottom">
      {/* 헤더 - 고정 */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{room.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`badge ${room.game_type === 'liar' ? 'badge-blue' : 'badge-purple'}`}>
                {room.game_type === 'liar' ? '라이어 게임' : '마피아 게임'}
              </span>
              <span className="text-xs text-gray-500">{players.length}/{room.max_players}명</span>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-red-600 px-3 py-2 text-sm flex-shrink-0"
          >
            나가기
          </button>
        </div>
      </header>

      <main className="px-5 py-6 pb-8 safe-bottom scroll-container">
        {/* 게임 설명 */}
        <div className="card p-4 mb-4">
          <h3 className="font-bold text-gray-900 text-sm mb-2">게임 설명</h3>
          {room.game_type === 'liar' ? (
            <p className="text-xs text-gray-600 leading-relaxed">
              한 명의 라이어를 제외한 모든 플레이어에게 같은 제시어가 주어집니다. 
              라이어는 카테고리만 알 수 있습니다. 각자 돌아가며 힌트를 제시하고, 
              투표로 라이어를 찾아내세요!
            </p>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">
              AI 사회자가 진행하는 마피아 게임입니다. 마피아는 밤에 시민을 제거하고, 
              시민들은 낮에 토론하여 마피아를 찾아내야 합니다.
            </p>
          )}
        </div>

        {/* 플레이어 목록 */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">참가자</h3>
            <span className="text-xs text-gray-500">{players.length}/{room.max_players}명</span>
          </div>

          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.user_id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  player.is_ready 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${
                    player.is_ready ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {player.nickname.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 text-sm truncate">{player.nickname}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.host_id === player.user_id && (
                        <span className="text-xs text-yellow-600 font-medium">호스트</span>
                      )}
                      {player.user_id === user?.id && (
                        <span className="text-xs text-blue-600 font-medium">나</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${
                  player.is_ready ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {player.is_ready ? '✓ 준비' : '대기'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div>
          {!isHost ? (
            <button
              onClick={handleReady}
              className={`btn w-full no-select ${
                myPlayer?.is_ready ? 'btn-secondary' : 'btn-primary'
              }`}
            >
              {myPlayer?.is_ready ? '준비 취소' : '준비하기'}
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`btn w-full no-select ${
                canStart ? 'btn-primary' : 'btn-secondary opacity-50'
              }`}
            >
              게임 시작
            </button>
          )}
        </div>

        {isHost && (
          <p className="text-center text-xs text-gray-500 mt-4">
            {!allReady && '모든 플레이어가 준비해야 시작할 수 있습니다.'}
            {allReady && players.length < 3 && '최소 3명이 필요합니다.'}
            {canStart && '게임을 시작할 수 있습니다!'}
          </p>
        )}
      </main>
    </div>
  );
}
