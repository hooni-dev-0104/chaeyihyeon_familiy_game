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
    
    // 실시간 구독 설정
    const roomChannel = supabase
      .channel(`room-${roomId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          console.log('Room changed:', payload);
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log('Players changed:', payload);
          fetchPlayers();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    // 폴링을 추가로 구현 (Realtime이 느릴 경우 대비)
    const pollingInterval = setInterval(() => {
      fetchPlayers();
      fetchRoom();
    }, 3000); // 3초마다 새로고침

    return () => {
      clearInterval(pollingInterval);
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
      console.log('Fetching players for room:', roomId);
      
      // room_players 데이터 가져오기
      const { data: roomPlayersData, error: roomPlayersError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      console.log('Room players data:', roomPlayersData, 'Error:', roomPlayersError);

      if (roomPlayersError) throw roomPlayersError;

      if (!roomPlayersData || roomPlayersData.length === 0) {
        console.log('No players found in room');
        setPlayers([]);
        return;
      }

      // 각 플레이어의 프로필 정보 가져오기
      const playersList = await Promise.all(
        roomPlayersData.map(async (rp) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', rp.user_id)
            .single();

          return {
            id: rp.user_id,
            nickname: profileData?.nickname || 'Unknown',
            is_ready: rp.is_ready,
            room_id: rp.room_id,
            user_id: rp.user_id,
            joined_at: rp.joined_at,
          };
        })
      );

      console.log('Processed players list:', playersList);

      setPlayers(playersList);
      
      if (user) {
        const me = playersList.find(p => p.user_id === user.id);
        setMyPlayer(me || null);
        console.log('My player:', me);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const joinRoom = async (userId: string) => {
    try {
      console.log('Attempting to join room:', roomId, 'User:', userId);
      
      const { data: existing, error: checkError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      console.log('Existing player check:', existing, 'Error:', checkError);

      if (!existing) {
        console.log('Player not found, inserting...');
        const { data: insertData, error: insertError } = await supabase
          .from('room_players')
          .insert({
            room_id: roomId,
            user_id: userId,
            is_ready: false,
          })
          .select();
        
        console.log('Insert result:', insertData, 'Error:', insertError);
        
        if (insertError) {
          console.error('Failed to insert player:', insertError);
        } else {
          console.log('Player joined successfully!');
          await fetchPlayers();
        }
      } else {
        console.log('Player already in room');
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
      // 플레이어 삭제
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      // 남은 플레이어 수 확인
      const { data: remainingPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);

      // 마지막 사람이 나갔으면 방 삭제
      if (!remainingPlayers || remainingPlayers.length === 0) {
        await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);
      } else if (isHost) {
        // 방장이 나갔지만 다른 사람이 있으면 첫 번째 사람을 새 방장으로
        await supabase
          .from('rooms')
          .update({ host_id: remainingPlayers[0].user_id })
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner"></div>
          <p className="text-gray-600 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="layout-container layout-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>😢</div>
          <p className="text-gray-900 text-lg font-bold" style={{ marginBottom: '16px' }}>방을 찾을 수 없습니다</p>
          <button onClick={() => router.push('/games')} className="btn btn-primary" style={{ width: 'auto', padding: '0 32px' }}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const allReady = players.every(p => p.is_ready);
  const canStart = allReady && players.length >= 3;

  return (
    <div className="layout-container safe-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
            <h1 className="text-xl font-bold text-gray-900" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</h1>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
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
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
            style={{ marginRight: '-8px', flexShrink: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* 플레이어 목록 */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingBottom: '128px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {players.map((player) => (
              <div
                key={player.user_id}
                className={`card transition-all ${
                  player.is_ready 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-white'
                }`}
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
                  <div className={`${
                    player.is_ready 
                      ? 'bg-line-green text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {player.nickname.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <div className="font-bold text-gray-900" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{player.nickname}</div>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {room.host_id === player.user_id && (
                        <span className="badge badge-yellow" style={{ fontSize: '10px' }}>
                          방장
                        </span>
                      )}
                      {player.user_id === user?.id && (
                        <span className="badge badge-blue" style={{ fontSize: '10px' }}>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
            {isHost && (
              <div className="bg-gray-50" style={{ textAlign: 'center', padding: '8px 16px', borderRadius: '12px' }}>
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
                className={`btn ${
                  myPlayer?.is_ready ? 'btn-secondary' : 'btn-success'
                }`}
                style={{ width: '100%' }}
              >
                {myPlayer?.is_ready ? '준비 취소' : '준비'}
              </button>
            ) : (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`btn ${
                  canStart ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ width: '100%', opacity: canStart ? 1 : 0.5 }}
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
