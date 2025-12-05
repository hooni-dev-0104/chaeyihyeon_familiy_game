import { KEYWORD_DATABASE, type LiarGameState, type Player } from '@/types/game.types';

export function initializeLiarGame(players: Player[]): LiarGameState {
  // 무작위로 라이어 선택
  const liarIndex = Math.floor(Math.random() * players.length);
  const liarId = players[liarIndex].id;

  // 무작위로 카테고리와 제시어 선택
  const categoryData = KEYWORD_DATABASE[Math.floor(Math.random() * KEYWORD_DATABASE.length)];
  const keyword = categoryData.keywords[Math.floor(Math.random() * categoryData.keywords.length)];

  return {
    players,
    liar_id: liarId,
    keyword,
    category: categoryData.category,
    current_turn: 0,
    phase: 'hint',
    votes: {},
    hints: {},
  };
}

export function submitHint(
  gameState: LiarGameState,
  playerId: string,
  hint: string
): LiarGameState {
  return {
    ...gameState,
    hints: {
      ...gameState.hints,
      [playerId]: hint,
    },
  };
}

export function nextTurn(gameState: LiarGameState): LiarGameState {
  const nextTurnIndex = gameState.current_turn + 1;
  
  if (nextTurnIndex >= gameState.players.length) {
    // 모든 플레이어가 힌트를 제시했으면 투표 단계로
    return {
      ...gameState,
      phase: 'vote',
    };
  }

  return {
    ...gameState,
    current_turn: nextTurnIndex,
  };
}

export function submitVote(
  gameState: LiarGameState,
  voterId: string,
  votedPlayerId: string
): LiarGameState {
  return {
    ...gameState,
    votes: {
      ...gameState.votes,
      [voterId]: votedPlayerId,
    },
  };
}

export function calculateVoteResult(gameState: LiarGameState): {
  suspectedLiar: string;
  voteCount: Record<string, number>;
  isLiarCaught: boolean;
} {
  const voteCount: Record<string, number> = {};

  // 투표 집계
  Object.values(gameState.votes).forEach(votedPlayerId => {
    voteCount[votedPlayerId] = (voteCount[votedPlayerId] || 0) + 1;
  });

  // 최다 득표자 찾기
  let suspectedLiar = '';
  let maxVotes = 0;
  Object.entries(voteCount).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      suspectedLiar = playerId;
    }
  });

  return {
    suspectedLiar,
    voteCount,
    isLiarCaught: suspectedLiar === gameState.liar_id,
  };
}

export function checkLiarGuess(gameState: LiarGameState, guess: string): boolean {
  return guess.trim().toLowerCase() === gameState.keyword.toLowerCase();
}

export function determineWinner(
  isLiarCaught: boolean,
  liarGuessedCorrectly: boolean
): 'liar' | 'citizens' {
  if (isLiarCaught) {
    // 라이어가 잡혔을 때
    if (liarGuessedCorrectly) {
      return 'liar'; // 라이어가 제시어를 맞췄으면 라이어 승리
    } else {
      return 'citizens'; // 라이어가 제시어를 못 맞췄으면 시민 승리
    }
  } else {
    // 라이어가 안 잡혔으면 라이어 승리
    return 'liar';
  }
}

