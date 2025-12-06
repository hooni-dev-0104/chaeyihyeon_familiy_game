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
        router.push('/');
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
      router.push('/games');
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

      router.push('/games');
    } catch (error) {
      console.error('Error leaving room:', error);
    }
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

  if (!room) {
    return (
      <div className="layout-container layout-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-gray-900 text-lg font-bold mb-4">방을 찾을 수 없습니다</p>
          <button onClick={() => router.push('/games')} className="btn btn-primary w-auto px-8">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const allReady = players.every(p => p.is_ready);
  const canStart = allReady && players.length >= 3;

  return (
    <div className="layout-container safe-area animate-fade-in">
      <div className="content-gap flex-1 flex flex-col py-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-xl font-bold text-gray-900 truncate">{room.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${room.game_type === 'liar' ? 'badge-blue' : 'badge-purple'}`}>
                {room.game_type === 'liar' ? '라이어' : '마피아'}
              </span>
              <span className="text-sm text-gray-600 font-semibold">
                {players.length} / {room.max_players}명
              </span>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="p-2 -mr-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 플레이어 목록 */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <div className="grid grid-cols-2 gap-3">
            {players.map((player) => (
              <div
                key={player.user_id}
                className={`card p-4 transition-all ${
                  player.is_ready 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-white'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                    player.is_ready 
                      ? 'bg-line-green text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {player.nickname.charAt(0)}
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="font-bold text-gray-900 truncate mb-1.5">{player.nickname}</div>
                    <div className="flex justify-center gap-1 flex-wrap mb-2">
                      {room.host_id === player.user_id && (
                        <span className="badge badge-yellow text-[10px]">
                          방장
                        </span>
                      )}
                      {player.user_id === user?.id && (
                        <span className="badge badge-blue text-[10px]">
                          나
                        </span>
                      )}
                    </div>
                    <div className={`text-xs font-bold ${
                      player.is_ready ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {player.is_ready ? '준비완료' : '대기중'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 컨트롤 바 (고정) */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 backdrop-blur-sm border-t border-gray-200 safe-area">
          <div className="max-w-[460px] mx-auto flex flex-col gap-3">
            {isHost && (
              <div className="text-center py-2 px-4 bg-gray-50 rounded-xl">
                <p className="text-sm font-semibold text-gray-700">
                  {!allReady ? '모든 플레이어가 준비해야 합니다' : 
                   players.length < 3 ? '최소 3명이 필요합니다' : 
                   '게임을 시작할 수 있습니다'}
                </p>
              </div>
            )}
            
            {!isHost ? (
              <button
                onClick={handleReady}
                className={`btn w-full ${
                  myPlayer?.is_ready ? 'btn-secondary' : 'btn-success'
                }`}
              >
                {myPlayer?.is_ready ? '준비 취소' : '준비'}
              </button>
            ) : (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`btn w-full ${
                  canStart ? 'btn-primary' : 'btn-secondary opacity-50'
                }`}
              >
                게임 시작
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
