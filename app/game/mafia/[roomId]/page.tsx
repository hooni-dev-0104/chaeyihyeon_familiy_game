'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { MafiaGameState, MafiaPhase } from '@/types/game.types';
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
  const [aiMessage, setAiMessage] = useState('');
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
            const newState = payload.new.game_state as MafiaGameState;
            setGameState(newState);
            if (newState.ai_message) {
              setAiMessage(newState.ai_message);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [roomId]);

  const initializeGame = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
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
          .select(`
            user_id,
            profiles:user_id (nickname)
          `)
          .eq('room_id', roomId);

        const players = (roomPlayers || []).map(p => ({
          id: p.user_id,
          nickname: (p.profiles as any)?.nickname || 'Unknown',
          is_ready: true,
        }));

        const initialState = initializeMafiaGame(players);
        
        // AI 메시지 생성
        const aiMsg = await generateAIMessage(initialState, 'night_start');
        initialState.ai_message = aiMsg;

        await supabase
          .from('game_sessions')
          .update({ game_state: initialState })
          .eq('id', session.id);

        setGameState(initialState);
        setAiMessage(aiMsg);
      } else {
        const state = session.game_state as MafiaGameState;
        setGameState(state);
        if (state.ai_message) {
          setAiMessage(state.ai_message);
        }
      }
    } catch (error) {
      console.error('Error initializing game:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIMessage = async (
    state: MafiaGameState,
    eventType: string,
    eventData?: any
  ): Promise<string> => {
    try {
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState: state, eventType, eventData }),
      });
      const data = await response.json();
      return data.message || '게임이 진행 중입니다.';
    } catch (error) {
      console.error('Error generating AI message:', error);
      return '게임이 진행 중입니다.';
    }
  };

  const handleNightAction = async (targetId: string) => {
    if (!gameState || !user || gameState.phase !== 'night') return;

    const myPlayer = gameState.players.find(p => p.id === user.id);
    if (!myPlayer || !myPlayer.is_alive) return;

    let actionType: 'mafia_target' | 'doctor_target' | 'police_target' | null = null;
    
    if (myPlayer.role === 'mafia') actionType = 'mafia_target';
    else if (myPlayer.role === 'doctor') actionType = 'doctor_target';
    else if (myPlayer.role === 'police') actionType = 'police_target';

    if (!actionType) return;

    try {
      const newState = setNightAction(gameState, actionType, targetId);
      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error submitting night action:', error);
    }
  };

  const handleResolveNight = async () => {
    if (!gameState || !isHost || gameState.phase !== 'night') return;

    try {
      const { newState, killedPlayer, policeResult } = resolveNight(gameState);
      
      // AI 메시지 생성
      const aiMsg = await generateAIMessage(newState, 'day_start', { killedPlayer });
      newState.ai_message = aiMsg;

      // 게임 종료 확인
      const gameEnd = checkGameEnd(newState);
      if (gameEnd.isEnded) {
        const endMsg = await generateAIMessage(newState, 'game_end', { winner: gameEnd.winner });
        newState.ai_message = endMsg;
        newState.phase = 'result';
      }

      await supabase
        .from('game_sessions')
        .update({ 
          game_state: newState,
          current_phase: newState.phase 
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error resolving night:', error);
    }
  };

  const handleVote = async (votedPlayerId: string) => {
    if (!gameState || !user || gameState.phase !== 'day') return;

    const myPlayer = gameState.players.find(p => p.id === user.id);
    if (!myPlayer || !myPlayer.is_alive) return;

    try {
      const newState = submitVote(gameState, user.id, votedPlayerId);
      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);

      // 모든 살아있는 플레이어가 투표했는지 확인
      const alivePlayers = newState.players.filter(p => p.is_alive);
      const voteCount = Object.keys(newState.votes).length;
      
      if (voteCount >= alivePlayers.length && isHost) {
        // 투표 결과 처리
        setTimeout(() => handleResolveVote(), 1000);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  const handleResolveVote = async () => {
    if (!gameState || !isHost || gameState.phase !== 'day') return;

    try {
      const { newState, executedPlayer } = resolveVote(gameState);
      
      // AI 메시지 생성
      const aiMsg = await generateAIMessage(newState, 'vote_result', { executedPlayer });
      newState.ai_message = aiMsg;

      // 게임 종료 확인
      const gameEnd = checkGameEnd(newState);
      if (gameEnd.isEnded) {
        const endMsg = await generateAIMessage(newState, 'game_end', { winner: gameEnd.winner });
        newState.ai_message = endMsg;
        newState.phase = 'result';
      } else {
        // 다음 밤으로
        const nightMsg = await generateAIMessage(newState, 'night_start');
        newState.ai_message = nightMsg;
      }

      await supabase
        .from('game_sessions')
        .update({ 
          game_state: newState,
          current_phase: newState.phase 
        })
        .eq('id', sessionId);
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
    router.push('/lobby');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-indigo-600">게임 준비 중...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">게임을 불러올 수 없습니다.</div>
      </div>
    );
  }

  const myPlayer = gameState.players.find(p => p.id === user?.id);
  const alivePlayers = gameState.players.filter(p => p.is_alive);
  const otherAlivePlayers = alivePlayers.filter(p => p.id !== user?.id);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-purple-600 mb-2">마피아 게임</h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              {gameState.phase === 'night' && '밤'}
              {gameState.phase === 'day' && '낮'}
              {gameState.phase === 'vote' && '투표'}
              {gameState.phase === 'result' && '결과'}
            </span>
            <span className="text-gray-600">{gameState.day_count}일차</span>
          </div>
        </div>

        {/* AI 사회자 메시지 */}
        {aiMessage && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🎭</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">AI 사회자</h3>
                <p className="text-white opacity-95">{aiMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 내 역할 카드 */}
        {myPlayer && (
          <div className={`rounded-2xl shadow-lg p-6 mb-6 ${
            myPlayer.role === 'mafia' 
              ? 'bg-gradient-to-r from-red-600 to-pink-600' 
              : myPlayer.role === 'doctor'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600'
              : myPlayer.role === 'police'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
              : 'bg-gradient-to-r from-gray-600 to-slate-600'
          } text-white`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{getRoleEmoji(myPlayer.role)}</span>
              <div>
                <h2 className="text-2xl font-bold">{getRoleDisplayName(myPlayer.role)}</h2>
                {!myPlayer.is_alive && (
                  <span className="text-sm opacity-75">당신은 죽었습니다</span>
                )}
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm">{getRoleDescription(myPlayer.role)}</p>
              {myPlayer.role === 'mafia' && (
                <div className="mt-2">
                  <p className="font-semibold">동료 마피아:</p>
                  <p>
                    {gameState.players
                      .filter(p => p.role === 'mafia' && p.id !== user?.id)
                      .map(p => p.nickname)
                      .join(', ') || '없음'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 밤 단계 */}
        {gameState.phase === 'night' && myPlayer?.is_alive && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {myPlayer.role === 'mafia' && '제거할 대상을 선택하세요'}
              {myPlayer.role === 'doctor' && '보호할 대상을 선택하세요'}
              {myPlayer.role === 'police' && '조사할 대상을 선택하세요'}
              {myPlayer.role === 'citizen' && '밤이 지나가기를 기다리세요...'}
            </h3>

            {myPlayer.role !== 'citizen' && (
              <div className="space-y-3">
                {otherAlivePlayers.map((player) => {
                  const alreadySelected = 
                    (myPlayer.role === 'mafia' && gameState.night_actions.mafia_target === player.id) ||
                    (myPlayer.role === 'doctor' && gameState.night_actions.doctor_target === player.id) ||
                    (myPlayer.role === 'police' && gameState.night_actions.police_target === player.id);

                  return (
                    <button
                      key={player.id}
                      onClick={() => handleNightAction(player.id)}
                      disabled={alreadySelected}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        alreadySelected
                          ? 'bg-purple-100 border-purple-400 text-purple-700'
                          : 'bg-gray-50 border-gray-200 hover:border-purple-400 text-gray-800'
                      } disabled:cursor-not-allowed`}
                    >
                      <span className="font-semibold">{player.nickname}</span>
                      {alreadySelected && <span className="ml-2 text-sm">✓ 선택됨</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {isHost && (
              <div className="mt-6">
                <Button
                  onClick={handleResolveNight}
                  className="w-full"
                  size="lg"
                >
                  밤 종료하기
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 낮 단계 - 투표 */}
        {gameState.phase === 'day' && myPlayer?.is_alive && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              마피아로 의심되는 사람을 투표하세요
            </h3>

            {!gameState.votes[user?.id] ? (
              <div className="space-y-3">
                {otherAlivePlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleVote(player.id)}
                    className="w-full p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all text-left font-semibold text-gray-800"
                  >
                    {player.nickname}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-purple-600">투표 완료!</p>
                <p className="text-gray-600 mt-2">다른 플레이어들의 투표를 기다리는 중...</p>
                <p className="text-sm text-gray-500 mt-4">
                  {Object.keys(gameState.votes).length} / {alivePlayers.length}명 투표 완료
                </p>
              </div>
            )}
          </div>
        )}

        {/* 플레이어 목록 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">플레이어</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.is_alive
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-100 border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">
                    {player.nickname}
                    {player.id === user?.id && ' (나)'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    player.is_alive ? 'bg-green-200 text-green-700' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {player.is_alive ? '생존' : '사망'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결과 단계 */}
        {gameState.phase === 'result' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">게임 결과</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">역할 공개:</h4>
                {gameState.players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between py-2 border-b border-purple-100 last:border-0">
                    <span className="font-medium">{player.nickname}</span>
                    <span className="flex items-center gap-2">
                      {getRoleEmoji(player.role)}
                      <span className="font-semibold">{getRoleDisplayName(player.role)}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className={`rounded-lg p-6 text-center ${
                checkGameEnd(gameState).winner === 'mafia'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              } text-white`}>
                <p className="text-3xl font-bold mb-2">
                  {checkGameEnd(gameState).winner === 'mafia' ? '🔪 마피아 승리!' : '✨ 시민 승리!'}
                </p>
              </div>
            </div>

            <Button
              onClick={handleBackToLobby}
              className="w-full"
              size="lg"
            >
              로비로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

