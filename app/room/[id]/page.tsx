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
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="text-[#e94560] text-xl">로딩 중...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="text-[#a0aec0]">방을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const allReady = players.every(p => p.is_ready);
  const canStart = allReady && players.length >= 3;

  return (
    <div className="min-h-screen bg-[#0f0f23] bg-pattern">
      {/* 헤더 */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              room.game_type === 'liar' ? 'bg-blue-500/20' : 'bg-purple-500/20'
            }`}>
              {room.game_type === 'liar' ? (
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="font-bold text-white">{room.name}</h1>
              <span className={`badge ${room.game_type === 'liar' ? 'badge-liar' : 'badge-mafia'}`}>
                {room.game_type === 'liar' ? '라이어 게임' : '마피아 게임'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="text-[#e94560] hover:bg-[#e94560]/10 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            나가기
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {/* 게임 설명 */}
        <div className="game-card rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-white mb-2">게임 설명</h3>
          {room.game_type === 'liar' ? (
            <p className="text-sm text-[#a0aec0] leading-relaxed">
              한 명의 라이어를 제외한 모든 플레이어에게 같은 제시어가 주어집니다. 
              라이어는 카테고리만 알 수 있습니다. 각자 돌아가며 힌트를 제시하고, 
              투표로 라이어를 찾아내세요!
            </p>
          ) : (
            <p className="text-sm text-[#a0aec0] leading-relaxed">
              AI 사회자가 진행하는 마피아 게임입니다. 마피아는 밤에 시민을 제거하고, 
              시민들은 낮에 토론하여 마피아를 찾아내야 합니다.
            </p>
          )}
        </div>

        {/* 플레이어 목록 */}
        <div className="game-card rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#e94560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              참가자
            </h3>
            <span className="text-sm text-[#a0aec0]">{players.length}/{room.max_players}명</span>
          </div>

          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.user_id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  player.is_ready 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    player.is_ready ? 'bg-green-500/20' : 'bg-white/10'
                  }`}>
                    <span className="text-lg font-bold text-white">
                      {player.nickname.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-white">{player.nickname}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.host_id === player.user_id && (
                        <span className="text-xs text-yellow-400 font-medium">호스트</span>
                      )}
                      {player.user_id === user?.id && (
                        <span className="text-xs text-[#e94560] font-medium">나</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  player.is_ready ? 'text-green-400' : 'text-[#a0aec0]'
                }`}>
                  {player.is_ready ? '준비 완료' : '대기중'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {!isHost ? (
            <button
              onClick={handleReady}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                myPlayer?.is_ready
                  ? 'bg-white/10 text-white border-2 border-white/20'
                  : 'btn-primary glow-green'
              }`}
            >
              {myPlayer?.is_ready ? '준비 취소' : '준비하기'}
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                canStart
                  ? 'btn-primary animate-pulse-glow'
                  : 'bg-white/10 text-[#a0aec0] cursor-not-allowed'
              }`}
            >
              게임 시작
            </button>
          )}
        </div>

        {isHost && (
          <p className="text-center text-sm text-[#a0aec0] mt-3">
            {!allReady && '모든 플레이어가 준비해야 시작할 수 있습니다.'}
            {allReady && players.length < 3 && '최소 3명이 필요합니다.'}
            {canStart && '게임을 시작할 수 있습니다!'}
          </p>
        )}
      </main>
    </div>
  );
}
