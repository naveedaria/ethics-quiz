import { NextRequest, NextResponse } from 'next/server';
import { loadQuestions } from '@/lib/questions';

export async function GET() {
  try {
    const questionsData = loadQuestions();
    return NextResponse.json(questionsData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Note: In production, you'd want to save this to a database or file storage
    // For now, this is a placeholder - file writes don't work well in serverless
    return NextResponse.json({ 
      success: true, 
      message: 'Questions would be updated (file writes not supported in serverless)' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

