'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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
        setGameState(session.game_state as LiarGameState);
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

  const isLiar = gameState.liar_id === user?.id;
  const currentPlayer = gameState.players[gameState.current_turn];
  const hasVoted = gameState.votes[user?.id];

  return (
    <div className="layout-container safe-area" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '16px', paddingBottom: '16px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 헤더 */}
        <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>🎭 라이어 게임</h1>
          <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
            {gameState.phase === 'hint' && '💬 힌트 제시'}
            {gameState.phase === 'vote' && '🗳️ 투표'}
            {gameState.phase === 'guess' && '🤔 라이어의 추측'}
            {gameState.phase === 'result' && '🎉 결과'}
          </div>
        </div>

        {/* 역할 카드 */}
        <div className="card" style={{ 
          padding: '20px', 
          background: isLiar ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            {isLiar ? '🎭 당신은 라이어입니다!' : '✨ 당신은 시민입니다'}
          </h2>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>📁 카테고리: {gameState.category}</p>
            {!isLiar && (
              <p style={{ fontSize: '20px', fontWeight: 'bold' }}>🔑 제시어: {gameState.keyword}</p>
            )}
            {isLiar && (
              <p style={{ fontSize: '14px', opacity: 0.9 }}>라이어는 제시어를 모릅니다. 카테고리를 참고하여 힌트를 제시하세요!</p>
            )}
          </div>
        </div>

        {/* 힌트 제시 단계 */}
        {gameState.phase === 'hint' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              현재 턴: <span style={{ color: '#667eea' }}>{currentPlayer.nickname}</span>
            </h3>

            {currentPlayer.id === user?.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="text-gray-600">제시어와 관련된 힌트를 입력하세요:</p>
                <input
                  type="text"
                  value={myHint}
                  onChange={(e) => setMyHint(e.target.value)}
                  className="input"
                  placeholder="힌트 입력..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitHint()}
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleSubmitHint}
                  disabled={!myHint.trim()}
                  className="btn btn-primary"
                >
                  힌트 제출
                </button>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
                {currentPlayer.nickname}님의 힌트를 기다리는 중...
              </p>
            )}

            {/* 이미 제출된 힌트 */}
            {Object.keys(gameState.hints).length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontWeight: 'bold', color: '#111827' }}>제출된 힌트:</h4>
                {Object.entries(gameState.hints).map(([playerId, hint]) => {
                  const player = gameState.players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px' }}>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>{player?.nickname}:</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280' }}>{hint}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 투표 단계 */}
        {gameState.phase === 'vote' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>🔍 라이어를 찾아주세요!</h3>
            
            {/* 힌트 복습 */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontWeight: 'bold', color: '#111827' }}>제출된 힌트:</h4>
              {Object.entries(gameState.hints).map(([playerId, hint]) => {
                const player = gameState.players.find(p => p.id === playerId);
                return (
                  <div key={playerId} style={{ background: '#F9FAFB', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontWeight: 'bold', color: '#111827' }}>{player?.nickname}:</span>
                    <span style={{ marginLeft: '8px', color: '#6b7280' }}>{hint}</span>
                  </div>
                );
              })}
            </div>

            {!hasVoted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="text-gray-600" style={{ marginBottom: '8px' }}>라이어라고 생각하는 사람을 선택하세요:</p>
                {gameState.players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSubmitVote(player.id)}
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
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>투표 완료!</p>
                <p className="text-gray-600" style={{ marginBottom: '16px' }}>다른 플레이어들의 투표를 기다리는 중...</p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                  {Object.keys(gameState.votes).length} / {gameState.players.length}명 투표 완료
                </p>
              </div>
            )}
          </div>
        )}

        {/* 라이어 추측 단계 */}
        {gameState.phase === 'guess' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>라이어가 잡혔습니다!</h3>
            
            {isLiar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="text-gray-600">제시어를 맞춰보세요. 맞추면 라이어가 승리합니다!</p>
                <input
                  type="text"
                  value={liarGuess}
                  onChange={(e) => setLiarGuess(e.target.value)}
                  className="input"
                  placeholder="제시어 입력..."
                  onKeyPress={(e) => e.key === 'Enter' && handleLiarGuess()}
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleLiarGuess}
                  disabled={!liarGuess.trim()}
                  className="btn btn-primary"
                >
                  제출
                </button>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
                라이어가 제시어를 추측하는 중...
              </p>
            )}
          </div>
        )}

        {/* 결과 단계 */}
        {gameState.phase === 'result' && (
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '20px', textAlign: 'center' }}>🎉 게임 결과</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#dbeafe', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>라이어:</p>
                <p style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>
                  {gameState.players.find(p => p.id === gameState.liar_id)?.nickname}
                </p>
              </div>

              <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>제시어:</p>
                <p style={{ fontSize: '22px', color: '#10b981', fontWeight: 'bold' }}>{gameState.keyword}</p>
              </div>

              {gameState.liar_guess && (
                <div style={{ background: '#f3e8ff', borderRadius: '12px', padding: '16px' }}>
                  <p style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>라이어의 추측:</p>
                  <p style={{ fontSize: '18px', color: '#a855f7', fontWeight: 'bold' }}>{gameState.liar_guess}</p>
                </div>
              )}

              <div style={{ 
                borderRadius: '12px', 
                padding: '24px', 
                textAlign: 'center',
                background: determineWinner(
                  calculateVoteResult(gameState).isLiarCaught,
                  gameState.liar_guess ? checkLiarGuess(gameState, gameState.liar_guess) : false
                ) === 'liar'
                  ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                  : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}>
                <p style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {determineWinner(
                    calculateVoteResult(gameState).isLiarCaught,
                    gameState.liar_guess ? checkLiarGuess(gameState, gameState.liar_guess) : false
                  ) === 'liar' ? '🎭 라이어 승리!' : '✨ 시민 승리!'}
                </p>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
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
