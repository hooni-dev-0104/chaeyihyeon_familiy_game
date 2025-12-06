'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { MafiaGameState, Player } from '@/types/game.types';
import {
  initializeMafiaGame,
  setNightAction,
  resolveNight,
  submitVote,
  resolveVote,
  checkGameEnd,
  getRoleDescription,
  getRoleEmoji,
  getRoleDisplayName,
} from '@/lib/game-logic/mafia';

export default function MafiaGamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<MafiaGameState | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    initializeGame();

    const gameChannel = supabase
      .channel(`game-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.new.game_state) {
            setGameState(payload.new.game_state as MafiaGameState);
          }
        }
      )
      .subscribe();

    // 폴링 추가
    const pollingInterval = setInterval(() => {
      fetchGameState();
    }, 3000);

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(gameChannel);
    };
  }, [roomId]);

  const fetchGameState = async () => {
    try {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('game_state')
        .eq('room_id', roomId)
        .single();

      if (session?.game_state) {
        setGameState(session.game_state as MafiaGameState);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };

  const initializeGame = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (room?.host_id === user.id) {
        setIsHost(true);
      }

      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (!session) {
        router.push(`/room/${roomId}`);
        return;
      }

      setSessionId(session.id);

      if (Object.keys(session.game_state as object).length === 0 && room?.host_id === user.id) {
        const { data: roomPlayers } = await supabase
          .from('room_players')
          .select('user_id')
          .eq('room_id', roomId);

        const players: Player[] = await Promise.all(
          (roomPlayers || []).map(async (rp) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nickname')
              .eq('id', rp.user_id)
              .single();

            return {
              id: rp.user_id,
              nickname: profileData?.nickname || 'Unknown',
              is_ready: true,
            };
          })
        );

        const initialState = initializeMafiaGame(players);
        
        await supabase
          .from('game_sessions')
          .update({ game_state: initialState })
          .eq('id', session.id);

        setGameState(initialState);
      } else {
        setGameState(session.game_state as MafiaGameState);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNightAction = async (targetId: string) => {
    if (!gameState || !user) return;

    const myInfo = gameState.players.find(p => p.id === user.id);
    if (!myInfo) return;

    let actionType: 'mafia_target' | 'doctor_target' | 'police_target' | null = null;

    if (myInfo.role === 'mafia') actionType = 'mafia_target';
    else if (myInfo.role === 'doctor') actionType = 'doctor_target';
    else if (myInfo.role === 'police') actionType = 'police_target';

    if (!actionType) return;

    try {
      const newState = setNightAction(gameState, actionType, targetId);

      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);

      setSelectedTarget(targetId);

      // 모든 역할이 행동했는지 확인 (호스트만)
      if (isHost) {
        checkAndResolveNight(newState);
      }
    } catch (error) {
      console.error('Error submitting night action:', error);
    }
  };

  const checkAndResolveNight = async (state: MafiaGameState) => {
    const mafia = state.players.filter(p => p.role === 'mafia' && p.is_alive);
    const doctor = state.players.find(p => p.role === 'doctor' && p.is_alive);
    const police = state.players.find(p => p.role === 'police' && p.is_alive);

    const hasMafiaAction = mafia.length > 0 ? !!state.night_actions.mafia_target : true;
    const hasDoctorAction = doctor ? !!state.night_actions.doctor_target : true;
    const hasPoliceAction = police ? !!state.night_actions.police_target : true;

    if (hasMafiaAction && hasDoctorAction && hasPoliceAction) {
      setTimeout(() => resolveNightPhase(), 2000);
    }
  };

  const resolveNightPhase = async () => {
    if (!gameState || !isHost) return;

    try {
      const { newState, killedPlayer } = resolveNight(gameState);

      await supabase
        .from('game_sessions')
        .update({ game_state: newState, current_phase: 'day' })
        .eq('id', sessionId);

      setSelectedTarget(null);
    } catch (error) {
      console.error('Error resolving night:', error);
    }
  };

  const handleVote = async (targetId: string) => {
    if (!gameState || !user) return;

    try {
      const newState = submitVote(gameState, user.id, targetId);

      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);

      const alivePlayers = newState.players.filter(p => p.is_alive);
      if (Object.keys(newState.votes).length === alivePlayers.length && isHost) {
        setTimeout(() => resolveVotePhase(), 2000);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  const resolveVotePhase = async () => {
    if (!gameState || !isHost) return;

    try {
      const { newState } = resolveVote(gameState);
      const gameEnd = checkGameEnd(newState);

      if (gameEnd.isEnded) {
        await supabase
          .from('game_sessions')
          .update({ 
            game_state: { ...newState, phase: 'result' },
            current_phase: 'result'
          })
          .eq('id', sessionId);
      } else {
        await supabase
          .from('game_sessions')
          .update({ game_state: newState, current_phase: 'night' })
          .eq('id', sessionId);
      }
    } catch (error) {
      console.error('Error resolving vote:', error);
    }
  };

  const handleBackToLobby = async () => {
    if (isHost) {
      await supabase
        .from('rooms')
        .update({ status: 'finished' })
        .eq('id', roomId);
    }
    router.push('/games');
  };

  if (loading) {
    return (
      <div className="layout-container layout-center">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner"></div>
          <p className="text-gray-600 text-sm">게임 준비 중...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="layout-container layout-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>😢</div>
          <p className="text-gray-900 text-lg font-bold" style={{ marginBottom: '16px' }}>게임을 불러올 수 없습니다</p>
          <button onClick={() => router.push('/games')} className="btn btn-primary">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const myInfo = gameState.players.find(p => p.id === user?.id);
  if (!myInfo) return null;

  const alivePlayers = gameState.players.filter(p => p.is_alive);
  const hasVoted = gameState.votes[user?.id];
  const myNightAction = myInfo.role === 'mafia' ? gameState.night_actions.mafia_target : 
                       myInfo.role === 'doctor' ? gameState.night_actions.doctor_target :
                       myInfo.role === 'police' ? gameState.night_actions.police_target : null;

  return (
    <div className="layout-container safe-area" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '16px', paddingBottom: '16px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 헤더 */}
        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>🔪 마피아 게임</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
              {gameState.phase === 'night' && '🌙 밤'}
              {gameState.phase === 'day' && '☀️ 낮'}
              {gameState.phase === 'vote' && '🗳️ 투표'}
              {gameState.phase === 'result' && '🎉 결과'}
            </div>
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
              Day {gameState.day_count}
            </div>
          </div>
        </div>

        {/* 내 역할 카드 */}
        {myInfo.is_alive && (
          <div className="card" style={{ 
            padding: '20px', 
            background: myInfo.role === 'mafia' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 
                       myInfo.role === 'doctor' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                       myInfo.role === 'police' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' :
                       'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
              {getRoleEmoji(myInfo.role)} {getRoleDisplayName(myInfo.role)}
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>{getRoleDescription(myInfo.role)}</p>
            </div>
          </div>
        )}

        {!myInfo.is_alive && (
          <div className="card" style={{ padding: '20px', background: '#f3f4f6' }}>
            <p style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#6b7280' }}>
              💀 당신은 사망했습니다
            </p>
          </div>
        )}

        {/* 밤 단계 */}
        {gameState.phase === 'night' && myInfo.is_alive && myInfo.role !== 'citizen' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              {myInfo.role === 'mafia' && '🎯 제거할 대상을 선택하세요'}
              {myInfo.role === 'doctor' && '💊 보호할 대상을 선택하세요'}
              {myInfo.role === 'police' && '🔍 조사할 대상을 선택하세요'}
            </h3>

            {!myNightAction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alivePlayers
                  .filter(p => myInfo.role === 'mafia' ? p.role !== 'mafia' : true)
                  .filter(p => p.id !== user.id)
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleNightAction(player.id)}
                      className="card card-interactive"
                      style={{
                        padding: '16px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#111827'
                      }}
                    >
                      {player.nickname}
                      {myInfo.role === 'mafia' && player.role === 'mafia' && ' (마피아)'}
                    </button>
                  ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                  선택 완료!
                </p>
                <p className="text-gray-600">다른 플레이어의 선택을 기다리는 중...</p>
              </div>
            )}
          </div>
        )}

        {gameState.phase === 'night' && myInfo.is_alive && myInfo.role === 'citizen' && (
          <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '18px', color: '#6b7280' }}>🌙 밤이 되었습니다. 아침을 기다리는 중...</p>
          </div>
        )}

        {/* 낮 단계 */}
        {gameState.phase === 'day' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>☀️ 아침이 밝았습니다</h3>
            
            {gameState.dead_players.length > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>어젯밤 사망자:</p>
                {gameState.dead_players.slice(-1).map(deadId => {
                  const deadPlayer = gameState.players.find(p => p.id === deadId);
                  return (
                    <p key={deadId} style={{ fontSize: '16px', color: '#7f1d1d' }}>
                      💀 {deadPlayer?.nickname}
                    </p>
                  );
                })}
              </div>
            )}

            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p className="text-gray-600">자유롭게 토론하세요. 곧 투표가 시작됩니다...</p>
              {isHost && (
                <button
                  onClick={() => {
                    supabase
                      .from('game_sessions')
                      .update({ game_state: { ...gameState, phase: 'vote' }, current_phase: 'vote' })
                      .eq('id', sessionId);
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: '20px' }}
                >
                  투표 시작
                </button>
              )}
            </div>
          </div>
        )}

        {/* 투표 단계 */}
        {gameState.phase === 'vote' && myInfo.is_alive && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              🗳️ 마피아로 의심되는 사람을 투표하세요
            </h3>

            {!hasVoted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alivePlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleVote(player.id)}
                    disabled={player.id === user?.id}
                    className="card card-interactive"
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#111827',
                      opacity: player.id === user?.id ? 0.5 : 1,
                      cursor: player.id === user?.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {player.nickname} {player.id === user?.id && '(나)'}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                  투표 완료!
                </p>
                <p className="text-gray-600" style={{ marginBottom: '16px' }}>다른 플레이어들의 투표를 기다리는 중...</p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                  {Object.keys(gameState.votes).length} / {alivePlayers.length}명 투표 완료
                </p>
              </div>
            )}
          </div>
        )}

        {/* 생존자 목록 */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            생존자 ({alivePlayers.length}명)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className="card"
                style={{
                  padding: '16px',
                  opacity: player.is_alive ? 1 : 0.4,
                  background: player.is_alive ? '#fff' : '#f3f4f6'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>
                    {player.is_alive ? '👤' : '💀'}
                  </p>
                  <p style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>
                    {player.nickname}
                  </p>
                  {player.id === myInfo.id && (
                    <p style={{ fontSize: '12px', color: '#667eea', marginTop: '4px' }}>(나)</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 단계 */}
        {gameState.phase === 'result' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', textAlign: 'center' }}>
              🎉 게임 종료
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                borderRadius: '12px', 
                padding: '24px', 
                textAlign: 'center',
                background: checkGameEnd(gameState).winner === 'mafia'
                  ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                marginBottom: '16px'
              }}>
                <p style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {checkGameEnd(gameState).winner === 'mafia' ? '🔪 마피아 승리!' : '✨ 시민 승리!'}
                </p>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
                  {checkGameEnd(gameState).winner === 'mafia' 
                    ? '마피아가 게임을 지배했습니다!'
                    : '모든 마피아를 제거했습니다!'}
                </p>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>역할 공개:</p>
                {gameState.players.map((player) => (
                  <div key={player.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#111827' }}>{player.nickname}</span>
                    <span>{getRoleEmoji(player.role)} {getRoleDisplayName(player.role)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleBackToLobby}
              className="btn btn-primary"
            >
              게임 선택으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
