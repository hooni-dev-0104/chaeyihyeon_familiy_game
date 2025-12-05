import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MafiaGameState } from '@/types/game.types';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateMafiaHostMessage(
  gameState: MafiaGameState,
  eventType: 'night_start' | 'day_start' | 'night_result' | 'vote_result' | 'game_end',
  eventData?: any
): Promise<string> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });

    const alivePlayers = gameState.players.filter(p => p.is_alive);
    const playerNames = alivePlayers.map(p => p.nickname).join(', ');

    let prompt = '';

    switch (eventType) {
      case 'night_start':
        prompt = `당신은 마피아 게임의 사회자입니다. ${gameState.day_count}일 밤이 되었습니다. 
현재 생존자: ${playerNames}
밤이 되었다는 것을 분위기 있고 긴장감 있게 알려주세요. 2-3문장으로 간단하게.`;
        break;

      case 'day_start':
        const killedPlayer = eventData?.killedPlayer;
        if (killedPlayer) {
          const player = gameState.players.find(p => p.id === killedPlayer);
          prompt = `당신은 마피아 게임의 사회자입니다. ${gameState.day_count}일차 아침입니다.
어젯밤 ${player?.nickname}님이 마피아에게 희생되었습니다.
현재 생존자: ${playerNames}
이 소식을 분위기 있게 전달하고, 토론을 시작하라고 안내해주세요. 2-3문장으로.`;
        } else {
          prompt = `당신은 마피아 게임의 사회자입니다. ${gameState.day_count}일차 아침입니다.
다행히 어젯밤은 아무도 희생되지 않았습니다! (의사가 구했습니다)
현재 생존자: ${playerNames}
이 소식을 긍정적으로 전달하고, 토론을 시작하라고 안내해주세요. 2-3문장으로.`;
        }
        break;

      case 'vote_result':
        const executedPlayer = eventData?.executedPlayer;
        if (executedPlayer) {
          const player = gameState.players.find(p => p.id === executedPlayer);
          const role = player?.role;
          prompt = `당신은 마피아 게임의 사회자입니다. 
투표 결과 ${player?.nickname}님이 처형되었습니다. 그의 역할은 ${role === 'mafia' ? '마피아' : role === 'doctor' ? '의사' : role === 'police' ? '경찰' : '시민'}였습니다.
이 결과를 극적으로 발표해주세요. 2-3문장으로.`;
        } else {
          prompt = `당신은 마피아 게임의 사회자입니다.
투표가 동률이 나와 아무도 처형되지 않았습니다.
이 결과를 알려주세요. 2문장으로.`;
        }
        break;

      case 'game_end':
        const winner = eventData?.winner;
        prompt = `당신은 마피아 게임의 사회자입니다.
게임이 끝났습니다. ${winner === 'mafia' ? '마피아' : '시민'}팀이 승리했습니다!
승리를 축하하고 게임을 마무리하는 멘트를 해주세요. 3-4문장으로.`;
        break;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI message:', error);
    // Fallback messages
    switch (eventType) {
      case 'night_start':
        return `${gameState.day_count}일 밤이 되었습니다. 마을에 어둠이 내려왔습니다... 마피아는 표적을 선택하세요.`;
      case 'day_start':
        return `${gameState.day_count}일차 아침입니다. 밤사이 무슨 일이 있었는지 확인해보세요.`;
      case 'vote_result':
        return '투표가 완료되었습니다.';
      case 'game_end':
        return `게임이 종료되었습니다. ${eventData?.winner === 'mafia' ? '마피아' : '시민'}팀의 승리입니다!`;
      default:
        return '게임이 진행 중입니다.';
    }
  }
}

