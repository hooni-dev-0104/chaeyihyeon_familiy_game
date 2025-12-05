import { NextRequest, NextResponse } from 'next/server';
import { generateMafiaHostMessage } from '@/lib/ai/gemini';
import type { MafiaGameState } from '@/types/game.types';

export async function POST(request: NextRequest) {
  try {
    const { gameState, eventType, eventData } = await request.json();

    const message = await generateMafiaHostMessage(
      gameState as MafiaGameState,
      eventType,
      eventData
    );

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Error generating AI message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate message' },
      { status: 500 }
    );
  }
}

