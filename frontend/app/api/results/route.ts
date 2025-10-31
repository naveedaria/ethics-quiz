import { NextRequest, NextResponse } from 'next/server';
import { loadQuestions } from '@/lib/questions';
import { calculateResults } from '@/lib/quizSession';

export async function GET() {
  try {
    const questionsData = loadQuestions();
    const results = calculateResults(questionsData);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

