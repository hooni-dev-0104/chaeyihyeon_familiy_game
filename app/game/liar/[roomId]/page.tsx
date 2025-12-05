'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { LiarGameState, Player } from '@/types/game.types';
import { 
  initializeLiarGame, 
  submitHint, 
  nextTurn, 
  submitVote, 
  calculateVoteResult,
  checkLiarGuess,
  determineWinner 
} from '@/lib/game-logic/liar';

export default function LiarGamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<LiarGameState | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [myHint, setMyHint] = useState('');
  const [liarGuess, setLiarGuess] = useState('');
  const [isHost, setIsHost] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    initializeGame();

    // Realtime 구독
    const gameChannel = supabase
      .channel(`game-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.new.game_state) {
            setGameState(payload.new.game_state as LiarGameState);
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

      // 방 정보 가져오기
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (room?.host_id === user.id) {
        setIsHost(true);
      }

      // 게임 세션 가져오기
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

      // 게임 상태가 비어있으면 초기화 (호스트만)
      if (Object.keys(session.game_state as object).length === 0 && room?.host_id === user.id) {
        // 플레이어 목록 가져오기
        const { data: roomPlayers } = await supabase
          .from('room_players')
          .select(`
            user_id,
            profiles:user_id (nickname)
          `)
          .eq('room_id', roomId);

        const players: Player[] = (roomPlayers || []).map(p => ({
          id: p.user_id,
          nickname: (p.profiles as any)?.nickname || 'Unknown',
          is_ready: true,
        }));

        const initialState = initializeLiarGame(players);
        
        await supabase
          .from('game_sessions')
          .update({ game_state: initialState })
          .eq('id', session.id);

        setGameState(initialState);
      } else {
        setGameState(session.game_state as LiarGameState);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitHint = async () => {
    if (!gameState || !user || !myHint.trim()) return;

    const currentPlayer = gameState.players[gameState.current_turn];
    if (currentPlayer.id !== user.id) return;

    try {
      let newState = submitHint(gameState, user.id, myHint.trim());
      newState = nextTurn(newState);

      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);

      setMyHint('');
    } catch (error) {
      console.error('Error submitting hint:', error);
    }
  };

  const handleSubmitVote = async (votedPlayerId: string) => {
    if (!gameState || !user || gameState.phase !== 'vote') return;

    try {
      const newState = submitVote(gameState, user.id, votedPlayerId);

      await supabase
        .from('game_sessions')
        .update({ game_state: newState })
        .eq('id', sessionId);

      // 모든 플레이어가 투표했는지 확인
      if (Object.keys(newState.votes).length === gameState.players.length) {
        // 투표 결과 계산
        const voteResult = calculateVoteResult(newState);
        
        if (voteResult.isLiarCaught) {
          // 라이어가 잡혔으면 추측 단계로
          await supabase
            .from('game_sessions')
            .update({ 
              game_state: { ...newState, phase: 'guess' },
              current_phase: 'guess'
            })
            .eq('id', sessionId);
        } else {
          // 라이어가 안 잡혔으면 라이어 승리
          await supabase
            .from('game_sessions')
            .update({ 
              game_state: { ...newState, phase: 'result' },
              current_phase: 'result'
            })
            .eq('id', sessionId);
        }
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  const handleLiarGuess = async () => {
    if (!gameState || !user || !liarGuess.trim()) return;
    if (gameState.liar_id !== user.id) return;

    try {
      const isCorrect = checkLiarGuess(gameState, liarGuess);
      const newState = {
        ...gameState,
        liar_guess: liarGuess,
        phase: 'result' as const,
      };

      await supabase
        .from('game_sessions')
        .update({ 
          game_state: newState,
          current_phase: 'result'
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error submitting liar guess:', error);
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

  const myInfo = gameState.players.find(p => p.id === user?.id);
  const isLiar = gameState.liar_id === user?.id;
  const currentPlayer = gameState.players[gameState.current_turn];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">라이어 게임</h1>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {gameState.phase === 'hint' && '힌트 제시'}
              {gameState.phase === 'vote' && '투표'}
              {gameState.phase === 'guess' && '라이어의 추측'}
              {gameState.phase === 'result' && '결과'}
            </span>
          </div>
        </div>

        {/* 역할 카드 */}
        <div className={`rounded-2xl shadow-lg p-6 mb-6 ${
          isLiar ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
        } text-white`}>
          <h2 className="text-2xl font-bold mb-3">
            {isLiar ? '🎭 당신은 라이어입니다!' : '✨ 당신은 시민입니다'}
          </h2>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="font-semibold mb-1">카테고리: {gameState.category}</p>
            {!isLiar && (
              <p className="text-2xl font-bold">제시어: {gameState.keyword}</p>
            )}
            {isLiar && (
              <p className="text-sm opacity-90">라이어는 제시어를 모릅니다. 카테고리를 참고하여 힌트를 제시하세요!</p>
            )}
          </div>
        </div>

        {/* 힌트 제시 단계 */}
        {gameState.phase === 'hint' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              현재 턴: <span className="text-blue-600">{currentPlayer.nickname}</span>
            </h3>

            {currentPlayer.id === user?.id ? (
              <div className="space-y-4">
                <p className="text-gray-600">제시어와 관련된 힌트를 입력하세요:</p>
                <input
                  type="text"
                  value={myHint}
                  onChange={(e) => setMyHint(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="힌트 입력..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitHint()}
                />
                <Button
                  onClick={handleSubmitHint}
                  disabled={!myHint.trim()}
                  className="w-full"
                  size="lg"
                >
                  힌트 제출
                </Button>
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">
                {currentPlayer.nickname}님의 힌트를 기다리는 중...
              </p>
            )}

            {/* 이미 제출된 힌트 */}
            {Object.keys(gameState.hints).length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-semibold text-gray-800">제출된 힌트:</h4>
                {Object.entries(gameState.hints).map(([playerId, hint]) => {
                  const player = gameState.players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} className="bg-gray-50 rounded-lg p-3">
                      <span className="font-semibold text-gray-700">{player?.nickname}:</span>
                      <span className="ml-2 text-gray-600">{hint}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 투표 단계 */}
        {gameState.phase === 'vote' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">라이어를 찾아주세요!</h3>
            
            {/* 힌트 복습 */}
            <div className="mb-6 space-y-2">
              <h4 className="font-semibold text-gray-800">제출된 힌트:</h4>
              {Object.entries(gameState.hints).map(([playerId, hint]) => {
                const player = gameState.players.find(p => p.id === playerId);
                return (
                  <div key={playerId} className="bg-gray-50 rounded-lg p-3">
                    <span className="font-semibold text-gray-700">{player?.nickname}:</span>
                    <span className="ml-2 text-gray-600">{hint}</span>
                  </div>
                );
              })}
            </div>

            {!gameState.votes[user?.id] ? (
              <div className="space-y-3">
                <p className="text-gray-600 mb-3">라이어라고 생각하는 사람을 선택하세요:</p>
                {gameState.players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSubmitVote(player.id)}
                    disabled={player.id === user?.id}
                    className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left font-semibold text-gray-800"
                  >
                    {player.nickname} {player.id === user?.id && '(나)'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-blue-600">투표 완료!</p>
                <p className="text-gray-600 mt-2">다른 플레이어들의 투표를 기다리는 중...</p>
                <p className="text-sm text-gray-500 mt-4">
                  {Object.keys(gameState.votes).length} / {gameState.players.length}명 투표 완료
                </p>
              </div>
            )}
          </div>
        )}

        {/* 라이어 추측 단계 */}
        {gameState.phase === 'guess' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">라이어가 잡혔습니다!</h3>
            
            {isLiar ? (
              <div className="space-y-4">
                <p className="text-gray-600">제시어를 맞춰보세요. 맞추면 라이어가 승리합니다!</p>
                <input
                  type="text"
                  value={liarGuess}
                  onChange={(e) => setLiarGuess(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="제시어 입력..."
                  onKeyPress={(e) => e.key === 'Enter' && handleLiarGuess()}
                />
                <Button
                  onClick={handleLiarGuess}
                  disabled={!liarGuess.trim()}
                  variant="danger"
                  className="w-full"
                  size="lg"
                >
                  제출
                </Button>
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">
                라이어가 제시어를 추측하는 중...
              </p>
            )}
          </div>
        )}

        {/* 결과 단계 */}
        {gameState.phase === 'result' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">게임 결과</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">라이어:</p>
                <p className="text-xl text-blue-600">
                  {gameState.players.find(p => p.id === gameState.liar_id)?.nickname}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">제시어:</p>
                <p className="text-2xl text-green-600 font-bold">{gameState.keyword}</p>
              </div>

              {gameState.liar_guess && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-800">라이어의 추측:</p>
                  <p className="text-xl text-purple-600">{gameState.liar_guess}</p>
                </div>
              )}

              <div className={`rounded-lg p-6 text-center ${
                determineWinner(
                  calculateVoteResult(gameState).isLiarCaught,
                  gameState.liar_guess ? checkLiarGuess(gameState, gameState.liar_guess) : false
                ) === 'liar'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              } text-white`}>
                <p className="text-3xl font-bold mb-2">
                  {determineWinner(
                    calculateVoteResult(gameState).isLiarCaught,
                    gameState.liar_guess ? checkLiarGuess(gameState, gameState.liar_guess) : false
                  ) === 'liar' ? '🎭 라이어 승리!' : '✨ 시민 승리!'}
                </p>
                <p className="text-lg opacity-90">
                  {determineWinner(
                    calculateVoteResult(gameState).isLiarCaught,
                    gameState.liar_guess ? checkLiarGuess(gameState, gameState.liar_guess) : false
                  ) === 'liar' 
                    ? calculateVoteResult(gameState).isLiarCaught
                      ? '라이어가 제시어를 맞췄습니다!'
                      : '라이어를 찾지 못했습니다!'
                    : calculateVoteResult(gameState).isLiarCaught
                      ? '라이어가 제시어를 맞추지 못했습니다!'
                      : '라이어를 찾아냈습니다!'}
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

