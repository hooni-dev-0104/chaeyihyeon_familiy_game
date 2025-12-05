// 게임 타입 정의
export type GameType = 'liar' | 'mafia';
export type GameStatus = 'waiting' | 'playing' | 'finished';

// 방 정보
export interface Room {
  id: string;
  name: string;
  host_id: string;
  game_type: GameType;
  status: GameStatus;
  max_players: number;
  created_at: string;
}

// 플레이어 정보
export interface Player {
  id: string;
  nickname: string;
  is_ready: boolean;
}

// 라이어 게임 상태
export interface LiarGameState {
  players: Player[];
  liar_id: string;
  keyword: string;
  category: string;
  current_turn: number;
  phase: 'hint' | 'vote' | 'guess' | 'result';
  votes: Record<string, string>; // voter_id -> voted_player_id
  hints: Record<string, string>; // player_id -> hint
  liar_guess?: string;
}

// 마피아 게임 역할
export type MafiaRole = 'mafia' | 'citizen' | 'doctor' | 'police';

// 마피아 게임 페이즈
export type MafiaPhase = 'night' | 'day' | 'vote' | 'result';

// 마피아 게임 상태
export interface MafiaGameState {
  players: Array<Player & { role: MafiaRole; is_alive: boolean }>;
  phase: MafiaPhase;
  day_count: number;
  night_actions: {
    mafia_target?: string;
    doctor_target?: string;
    police_target?: string;
  };
  votes: Record<string, string>; // voter_id -> voted_player_id
  dead_players: string[];
  ai_message?: string;
}

// 제시어 데이터베이스
export interface KeywordData {
  category: string;
  keywords: string[];
}

export const KEYWORD_DATABASE: KeywordData[] = [
  {
    category: '음식',
    keywords: ['김치찌개', '삼겹살', '떡볶이', '피자', '치킨', '햄버거', '라면', '짜장면', '초밥', '스테이크']
  },
  {
    category: '동물',
    keywords: ['강아지', '고양이', '사자', '호랑이', '코끼리', '기린', '판다', '토끼', '햄스터', '펭귄']
  },
  {
    category: '직업',
    keywords: ['의사', '선생님', '경찰', '소방관', '요리사', '가수', '배우', '운동선수', '개발자', '디자이너']
  },
  {
    category: '장소',
    keywords: ['학교', '병원', '공원', '카페', '영화관', '도서관', '마트', '식당', '놀이공원', '해변']
  },
  {
    category: '취미',
    keywords: ['독서', '운동', '게임', '영화감상', '요리', '그림', '음악감상', '여행', '사진', '낚시']
  }
];

