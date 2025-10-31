import { NextRequest, NextResponse } from 'next/server';
import { loadQuestions } from '@/lib/questions';
import {
  getQuizSession,
  addParticipant,
  removeParticipant,
  setAdmin,
  submitAnswer,
  startQuiz,
  nextQuestion,
  showResults,
  resetQuiz,
  calculateResults,
  lockQuestion,
  unlockQuestion
} from '@/lib/quizSession';

export async function GET() {
  try {
    const session = getQuizSession();
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    const questionsData = loadQuestions();

    switch (action) {
      case 'join-participant':
        const participant = addParticipant(data.name, data.participantId);
        return NextResponse.json({ success: true, participant });

      case 'join-admin':
        if (data.password !== getQuizSession().adminPassword) {
          return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 }
          );
        }
        const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        setAdmin(adminId);
        return NextResponse.json({ success: true, adminId });

      case 'submit-answer':
        submitAnswer(data.participantId, data.questionId, data.answer, questionsData);
        return NextResponse.json({ success: true });

      case 'start-quiz':
        const question = startQuiz(questionsData);
        return NextResponse.json({ success: true, question });

      case 'next-question':
        const nextQ = nextQuestion(questionsData);
        if (nextQ === null) {
          const results = calculateResults(questionsData);
          return NextResponse.json({ success: true, completed: true, results });
        }
        return NextResponse.json({ success: true, question: nextQ });

      case 'show-results':
        const results = calculateResults(questionsData);
        showResults();
        return NextResponse.json({ success: true, results });

      case 'reset-quiz':
        resetQuiz();
        return NextResponse.json({ success: true });

      case 'lock-question':
        lockQuestion();
        return NextResponse.json({ success: true });

      case 'unlock-question':
        unlockQuestion();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

