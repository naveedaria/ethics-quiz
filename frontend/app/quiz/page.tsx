'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionDisplay from '@/components/QuestionDisplay';
import ParticipantCard from '@/components/ParticipantCard';
import ResultsDisplay from '@/components/ResultsDisplay';
import Countdown from '@/components/Countdown';

interface Participant {
  id: string;
  name: string;
  icon: string;
}

interface Question {
  id: number;
  text: string;
  title?: string;
  scenario?: string;
}

interface Results {
  [key: string]: {
    participant: Participant;
    theory: {
      name: string;
      description: string;
    };
    tally: Record<string, number>;
    answerHistory?: any[];
  };
}

export default function QuizPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [questionLocked, setQuestionLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    // Check if name is already stored
    const storedName = localStorage.getItem('quizParticipantName');
    const storedId = localStorage.getItem('quizParticipantId');
    if (storedName && storedId) {
      setName(storedName);
      setParticipantId(storedId);
      setNameSubmitted(true);
      joinAsParticipant(storedName, storedId);
    }

    // Fetch total questions
    fetchTotalQuestions();

    // Poll for quiz state updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/quiz');
        const session = await response.json();
        
        setParticipants(session.participants || []);
        
        // Update participant info if we have an ID
        if (participantId || storedId) {
          const currentId = participantId || storedId;
          const currentParticipant = session.participants?.find((p: Participant) => p.id === currentId);
          if (currentParticipant) {
            setParticipant(currentParticipant);
          }
        }

        // Update current question
        if (session.quizStarted && session.currentQuestionIndex !== null) {
          await fetchQuestion(session.currentQuestionIndex);
        }

        // Update lock status
        if (session.questionLocked && session.lockCountdown) {
          setQuestionLocked(true);
          setLockCountdown(session.lockCountdown);
          // Show countdown if it just started (within first second)
          const elapsed = (Date.now() - session.lockCountdown) / 1000;
          if (elapsed < 10) {
            setShowCountdown(true);
          }
        } else {
          setQuestionLocked(false);
          setLockCountdown(null);
          setShowCountdown(false);
        }

        if (session.showResults) {
          const resultsResponse = await fetch('/api/results');
          const resultsData = await resultsResponse.json();
          setResults(resultsData);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error polling quiz state:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [participantId, router]);

  const joinAsParticipant = async (nameToUse: string, existingId?: string) => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-participant',
          name: nameToUse,
          participantId: existingId
        })
      });

      const data = await response.json();
      if (data.error) {
        // If quiz is full and we have a stored ID, try clearing it and joining fresh
        if (data.error.includes('full') && existingId) {
          localStorage.removeItem('quizParticipantId');
          localStorage.removeItem('quizParticipantName');
          alert('Session reset. Please try joining again.');
          window.location.reload();
          return;
        }
        alert(data.error);
        if (data.error.includes('full') || data.error.includes('started')) {
          // Clear localStorage if there's an error
          localStorage.removeItem('quizParticipantId');
          localStorage.removeItem('quizParticipantName');
          router.push('/');
        }
      } else if (data.participant) {
        setParticipant(data.participant);
        setParticipantId(data.participant.id);
        setNameSubmitted(true);
        localStorage.setItem('quizParticipantName', data.participant.name);
        localStorage.setItem('quizParticipantId', data.participant.id);
      }
    } catch (error) {
      console.error('Error joining as participant:', error);
    }
  };

  const fetchQuestion = async (index: number) => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      if (data.moral_quiz && data.moral_quiz[index]) {
        const q = data.moral_quiz[index];
        setCurrentQuestion({
          id: q.id,
          text: q.question,
          title: q.title,
          scenario: q.scenario
        });
        setQuestionIndex(index);
        setHasAnswered(false);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
    }
  };

  const fetchTotalQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      if (data.moral_quiz) {
        setTotalQuestions(data.moral_quiz.length);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await joinAsParticipant(name.trim());
    }
  };

  const handleAnswer = async (answer: 'yes' | 'no') => {
    if (!participantId || !currentQuestion || hasAnswered || questionLocked) return;

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-answer',
          participantId,
          questionId: currentQuestion.id,
          answer
        })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setHasAnswered(true);
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const calculateCountdown = () => {
    if (!lockCountdown) return 0;
    const elapsed = (Date.now() - lockCountdown) / 1000;
    const remaining = Math.max(0, 10 - Math.floor(elapsed));
    return remaining;
  };

  const isVotingClosed = () => {
    if (!questionLocked || !lockCountdown) return false;
    const elapsed = (Date.now() - lockCountdown) / 1000;
    return elapsed >= 10;
  };

  useEffect(() => {
    if (questionLocked && lockCountdown) {
      const interval = setInterval(() => {
        const remaining = calculateCountdown();
        if (remaining <= 0) {
          setShowCountdown(false);
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [questionLocked, lockCountdown]);

  if (!nameSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Join Ethics Quiz
          </h1>
          <form onSubmit={handleNameSubmit}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Join Quiz
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showResults && results && participantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <ResultsDisplay results={results} currentUserId={participantId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {participant && (
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">{participant.icon}</div>
            <div className="text-xl font-semibold text-gray-800">{participant.name}</div>
          </div>
        )}

        {currentQuestion && questionIndex !== null ? (
          <>
            <QuestionDisplay 
              question={currentQuestion} 
              questionIndex={questionIndex}
              totalQuestions={totalQuestions}
            />
            
            {questionLocked && (
              <div className="mt-6 text-center">
                <div className={`inline-block border-2 rounded-lg px-6 py-3 ${
                  isVotingClosed() 
                    ? 'bg-red-100 border-red-500' 
                    : 'bg-yellow-100 border-yellow-500'
                }`}>
                  <p className={`font-bold text-xl ${
                    isVotingClosed() 
                      ? 'text-red-700' 
                      : 'text-yellow-700'
                  }`}>
                    {calculateCountdown() > 0 ? `Voting closes in ${calculateCountdown()}...` : 'Voting Closed'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => handleAnswer('yes')}
                disabled={hasAnswered || isVotingClosed()}
                className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors ${
                  hasAnswered || isVotingClosed()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => handleAnswer('no')}
                disabled={hasAnswered || isVotingClosed()}
                className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors ${
                  hasAnswered || isVotingClosed()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                No
              </button>
            </div>

            {hasAnswered && !questionLocked && (
              <div className="mt-6 text-center">
                <p className="text-green-600 font-semibold">Answer submitted! Waiting for next question...</p>
              </div>
            )}
            
            {showCountdown && questionLocked && lockCountdown && (
              <Countdown 
                lockTimestamp={lockCountdown} 
                onComplete={() => setShowCountdown(false)} 
              />
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Waiting for quiz to start...
            </h2>
            <p className="text-gray-600">The quiz master will begin the quiz shortly.</p>
          </div>
        )}

        {participants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Participants</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {participants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  answer={p.id === participantId ? answers[currentQuestion?.id || 0] : undefined}
                  hasAnswered={p.id === participantId && currentQuestion ? (answers[currentQuestion.id] !== undefined) : undefined}
                  isCurrentUser={p.id === participantId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
