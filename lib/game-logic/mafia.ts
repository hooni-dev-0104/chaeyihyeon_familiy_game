import type { MafiaGameState, Player, MafiaRole, MafiaPhase } from '@/types/game.types';

export function initializeMafiaGame(players: Player[]): MafiaGameState {
  const playerCount = players.length;
  
  // 역할 배분 (플레이어 수에 따라 조정)
  const mafiaCount = Math.floor(playerCount / 3); // 3명당 마피아 1명
  const hasDoctor = playerCount >= 5;
  const hasPolice = playerCount >= 6;

  const roles: MafiaRole[] = [];
  
  // 마피아 추가
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia');
  }
  
  // 특수 역할 추가
  if (hasDoctor) roles.push('doctor');
  if (hasPolice) roles.push('police');
  
  // 나머지는 시민
  while (roles.length < playerCount) {
    roles.push('citizen');
  }
  
  // 역할 섞기
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // 플레이어에 역할 할당
  const playersWithRoles = players.map((player, index) => ({
    ...player,
    role: roles[index],
    is_alive: true,
  }));

  return {
    players: playersWithRoles,
    phase: 'night',
    day_count: 1,
    night_actions: {},
    votes: {},
    dead_players: [],
  };
}

export function setNightAction(
  gameState: MafiaGameState,
  actionType: 'mafia_target' | 'doctor_target' | 'police_target',
  targetId: string
): MafiaGameState {
  return {
    ...gameState,
    night_actions: {
      ...gameState.night_actions,
      [actionType]: targetId,
    },
  };
}

export function resolveNight(gameState: MafiaGameState): {
  newState: MafiaGameState;
  killedPlayer: string | null;
  policeResult: { targetId: string; isMafia: boolean } | null;
} {
  const { mafia_target, doctor_target, police_target } = gameState.night_actions;
  
  // 경찰 조사 결과
  let policeResult = null;
  if (police_target) {
    const target = gameState.players.find(p => p.id === police_target);
    policeResult = {
      targetId: police_target,
      isMafia: target?.role === 'mafia',
    };
  }

  // 마피아 공격과 의사 치료 해결
  let killedPlayer = null;
  if (mafia_target && mafia_target !== doctor_target) {
    killedPlayer = mafia_target;
  }

  const newPlayers = gameState.players.map(p => {
    if (p.id === killedPlayer) {
      return { ...p, is_alive: false };
    }
    return p;
  });

  const newDeadPlayers = killedPlayer 
    ? [...gameState.dead_players, killedPlayer]
    : gameState.dead_players;

  return {
    newState: {
      ...gameState,
      players: newPlayers,
      phase: 'day',
      night_actions: {},
      dead_players: newDeadPlayers,
    },
    killedPlayer,
    policeResult,
  };
}

export function submitVote(
  gameState: MafiaGameState,
  voterId: string,
  votedPlayerId: string
): MafiaGameState {
  return {
    ...gameState,
    votes: {
      ...gameState.votes,
      [voterId]: votedPlayerId,
    },
  };
}

export function resolveVote(gameState: MafiaGameState): {
  newState: MafiaGameState;
  executedPlayer: string | null;
} {
  const voteCount: Record<string, number> = {};
  
  // 투표 집계 (살아있는 플레이어만)
  Object.entries(gameState.votes).forEach(([voterId, votedPlayerId]) => {
    const voter = gameState.players.find(p => p.id === voterId);
    if (voter?.is_alive) {
      voteCount[votedPlayerId] = (voteCount[votedPlayerId] || 0) + 1;
    }
  });

  // 최다 득표자 찾기
  let executedPlayer: string | null = null;
  let maxVotes = 0;
  Object.entries(voteCount).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      executedPlayer = playerId;
    }
  });

  let newPlayers = gameState.players;
  let newDeadPlayers = gameState.dead_players;

  if (executedPlayer) {
    newPlayers = gameState.players.map(p => {
      if (p.id === executedPlayer) {
        return { ...p, is_alive: false };
      }
      return p;
    });
    newDeadPlayers = [...gameState.dead_players, executedPlayer];
  }

  return {
    newState: {
      ...gameState,
      players: newPlayers,
      phase: 'night',
      day_count: gameState.day_count + 1,
      votes: {},
      dead_players: newDeadPlayers,
    },
    executedPlayer,
  };
}

export function checkGameEnd(gameState: MafiaGameState): {
  isEnded: boolean;
  winner: 'mafia' | 'citizens' | null;
} {
  const alivePlayers = gameState.players.filter(p => p.is_alive);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveCitizens = alivePlayers.filter(p => p.role !== 'mafia');

  // 마피아가 모두 죽었으면 시민 승리
  if (aliveMafia.length === 0) {
    return { isEnded: true, winner: 'citizens' };
  }

  // 마피아 수가 시민 수 이상이면 마피아 승리
  if (aliveMafia.length >= aliveCitizens.length) {
    return { isEnded: true, winner: 'mafia' };
  }

  return { isEnded: false, winner: null };
}

export function getRoleDescription(role: MafiaRole): string {
  switch (role) {
    case 'mafia':
      return '밤에 한 명을 제거할 수 있습니다. 다른 마피아가 누군지 알 수 있습니다.';
    case 'doctor':
      return '밤에 한 명을 지목하여 마피아의 공격으로부터 보호할 수 있습니다.';
    case 'police':
      return '밤에 한 명을 조사하여 마피아인지 확인할 수 있습니다.';
    case 'citizen':
      return '낮에 토론에 참여하고 투표할 수 있습니다.';
  }
}

export function getRoleEmoji(role: MafiaRole): string {
  switch (role) {
    case 'mafia': return '🔪';
    case 'doctor': return '💉';
    case 'police': return '🔍';
    case 'citizen': return '👤';
  }
}

export function getRoleDisplayName(role: MafiaRole): string {
  switch (role) {
    case 'mafia': return '마피아';
    case 'doctor': return '의사';
    case 'police': return '경찰';
    case 'citizen': return '시민';
  }
}

