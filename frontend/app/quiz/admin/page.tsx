'use client';

import { useEffect, useState } from 'react';
import QuestionDisplay from '@/components/QuestionDisplay';
import ParticipantCard from '@/components/ParticipantCard';
import AdminResultsDisplay from '@/components/AdminResultsDisplay';

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

interface AnswerHistoryEntry {
  questionId: number;
  questionTitle: string;
  questionText: string;
  answer: string;
  theories: string[];
}

interface AnswerStatus {
  [participantId: string]: {
    questionId: number;
    answer: string;
  };
}

interface Results {
  [key: string]: {
    participant: Participant;
    theory: {
      name: string;
      description: string;
    };
    tally: Record<string, number>;
    answerHistory?: AnswerHistoryEntry[];
  };
}

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [answerHistory, setAnswerHistory] = useState<Record<string, AnswerHistoryEntry[]>>({});
  const [adminId, setAdminId] = useState<string | null>(null);
  const [questionLocked, setQuestionLocked] = useState(false);
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null);
  const [ethicalTheories, setEthicalTheories] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if already authenticated
    const authStatus = localStorage.getItem('adminAuthenticated');
    const storedAdminId = localStorage.getItem('adminId');
    if (authStatus === 'true' && storedAdminId) {
      setIsAuthenticated(true);
      setAdminId(storedAdminId);
    }

    fetchQuestions();

    // Poll for quiz state updates
    if (isAuthenticated) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/quiz');
          const session = await response.json();
          
          setParticipants(session.participants || []);
          setQuizStarted(session.quizStarted || false);
          setAnswerHistory(session.answerHistory || {});
          setQuestionLocked(session.questionLocked || false);
          
          // Update answer status
          const newAnswerStatus: AnswerStatus = {};
          session.participants?.forEach((p: Participant) => {
            const history = session.answerHistory?.[p.id] || [];
            if (history.length > 0) {
              const lastEntry = history[history.length - 1];
              newAnswerStatus[p.id] = {
                questionId: lastEntry.questionId,
                answer: lastEntry.answer
              };
            }
          });
          setAnswerStatus(newAnswerStatus);

          if (session.quizStarted && session.currentQuestionIndex !== null) {
            await fetchQuestion(session.currentQuestionIndex);
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
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join-admin',
          password: password
        })
      });

      const data = await response.json();
      if (data.error) {
        setPasswordError(data.error);
      } else {
        setIsAuthenticated(true);
        setPasswordError('');
        setAdminId(data.adminId);
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminId', data.adminId);
      }
    } catch (error) {
      setPasswordError('Authentication failed');
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      if (data.moral_quiz) {
        const formattedQuestions = data.moral_quiz.map((q: any) => ({
          id: q.id,
          text: q.question,
          title: q.title,
          scenario: q.scenario
        }));
        setQuestions(formattedQuestions);
        setTotalQuestions(data.moral_quiz.length);
      }
      if (data.ethical_theories) {
        setEthicalTheories(data.ethical_theories);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
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
        setCurrentQuestionData(q); // Store full question data for follow-ups
        setQuestionIndex(index);
      }
    } catch (error) {
      console.error('Error fetching question:', error);
    }
  };

  const handleStartQuiz = async () => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-quiz' })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else if (data.question) {
        setQuizStarted(true);
        const q = data.question;
        setCurrentQuestion({
          id: q.id,
          text: q.question,
          title: q.title,
          scenario: q.scenario
        });
        // Fetch full question data for follow-ups
        const questionsResponse = await fetch('/api/questions');
        const questionsData = await questionsResponse.json();
        if (questionsData.moral_quiz && questionsData.moral_quiz[0]) {
          setCurrentQuestionData(questionsData.moral_quiz[0]);
        }
        setQuestionIndex(0);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  const handleNextQuestion = async () => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next-question' })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else if (data.completed) {
        setResults(data.results);
        setShowResults(true);
      } else if (data.question) {
        const q = data.question;
        setCurrentQuestion({
          id: q.id,
          text: q.question,
          title: q.title,
          scenario: q.scenario
        });
        // Fetch full question data for follow-ups
        const questionsResponse = await fetch('/api/questions');
        const questionsData = await questionsResponse.json();
        const nextIndex = (questionIndex || 0) + 1;
        if (questionsData.moral_quiz && questionsData.moral_quiz[nextIndex]) {
          setCurrentQuestionData(questionsData.moral_quiz[nextIndex]);
        }
        setQuestionIndex(nextIndex);
      }
    } catch (error) {
      console.error('Error moving to next question:', error);
    }
  };

  const handleShowResults = async () => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'show-results' })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else if (data.results) {
        setResults(data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error showing results:', error);
    }
  };

  const handleLockQuestion = async () => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock-question' })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setQuestionLocked(true);
      }
    } catch (error) {
      console.error('Error locking question:', error);
    }
  };

  const handleUnlockQuestion = async () => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock-question' })
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setQuestionLocked(false);
      }
    } catch (error) {
      console.error('Error unlocking question:', error);
    }
  };

  const handleResetQuiz = async () => {
    if (confirm('Are you sure you want to reset the quiz? This will disconnect all participants.')) {
      try {
        const response = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset-quiz' })
        });

        const data = await response.json();
        if (data.success) {
          setQuizStarted(false);
          setShowResults(false);
          setCurrentQuestion(null);
          setQuestionIndex(null);
          setAnswerStatus({});
          setResults(null);
          setParticipants([]);
        }
      } catch (error) {
        console.error('Error resetting quiz:', error);
      }
    }
  };

  const calculateTheoryTally = (participantId: string) => {
    const history = answerHistory[participantId] || [];
    const tally: Record<string, number> = {};
    
    history.forEach(entry => {
      entry.theories.forEach(theory => {
        tally[theory] = (tally[theory] || 0) + 1;
      });
    });
    
    return tally;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            Admin Login
          </h1>
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Password"
                required
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const allAnswered = currentQuestion && participants.every(p => 
    answerStatus[p.id]?.questionId === currentQuestion.id
  );

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Quiz Master Control Panel</h1>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('adminAuthenticated');
                localStorage.removeItem('adminId');
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
          <AdminResultsDisplay results={results} />
          <div className="mt-6 text-center">
            <button
              onClick={handleResetQuiz}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Reset Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Quiz Master Control Panel</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('adminAuthenticated');
              localStorage.removeItem('adminId');
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Answer History Table */}
        {participants.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Answer History & Theory Tally</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theories</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Theory Tally</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => {
                    const history = answerHistory[participant.id] || [];
                    const theoryTally = calculateTheoryTally(participant.id);
                    const sortedTally = Object.entries(theoryTally).sort((a, b) => b[1] - a[1]);
                    
                    return (
                      <tr key={participant.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">{participant.icon}</span>
                            <span className="font-medium text-gray-900">{participant.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 space-y-1">
                            {history.length === 0 ? (
                              <span className="text-gray-400">No answers yet</span>
                            ) : (
                              history.map((entry, idx) => (
                                <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                                  <div className="font-semibold">{entry.questionTitle}</div>
                                  <div className="text-xs text-gray-500">{entry.questionText}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm space-y-1">
                            {history.map((entry, idx) => (
                              <span
                                key={idx}
                                className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                  entry.answer === 'yes'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {entry.answer === 'yes' ? 'Yes' : 'No'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm space-y-1">
                            {history.map((entry, idx) => (
                              <div key={idx} className="flex flex-wrap gap-1">
                                {entry.theories.map((theory, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {theory}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm space-y-1">
                            {sortedTally.length === 0 ? (
                              <span className="text-gray-400">No tallies yet</span>
                            ) : (
                              sortedTally.map(([theory, count]) => (
                                <div key={theory} className="flex items-center justify-between">
                                  <span className="text-gray-700">{theory}:</span>
                                  <span className="font-semibold text-purple-600 ml-2">{count}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Participants ({participants.length}/4)</h2>
          {participants.length === 0 ? (
            <p className="text-gray-500">No participants joined yet. Share the QR code or link!</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  answer={answerStatus[participant.id]?.answer}
                  hasAnswered={currentQuestion ? (answerStatus[participant.id]?.questionId === currentQuestion.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {!quizStarted ? (
          <div className="bg-white rounded-lg shadow-xl p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Ready to Start Quiz?</h2>
            <p className="text-gray-600 mb-6">
              {participants.length === 0 
                ? 'Wait for at least one participant to join before starting.'
                : `You have ${participants.length} participant${participants.length !== 1 ? 's' : ''} ready.`}
            </p>
            <button
              onClick={handleStartQuiz}
              disabled={participants.length === 0}
              className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors ${
                participants.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Start Quiz
            </button>
          </div>
        ) : (
          <>
            {currentQuestion && questionIndex !== null && (
              <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
                <QuestionDisplay 
                  question={currentQuestion} 
                  questionIndex={questionIndex}
                  totalQuestions={totalQuestions}
                />
                
                {/* Reference Information from questions.json */}
                {currentQuestionData && (
                  <div className="mt-6 pt-6 border-t space-y-6">
                    {/* Answer Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Answer Details</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {currentQuestionData.answers && Object.entries(currentQuestionData.answers).map(([answerKey, answerData]: [string, any]) => (
                          <div key={answerKey} className={`rounded-lg p-4 ${
                            answerKey === 'yes' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-2xl font-bold ${
                                answerKey === 'yes' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {answerKey === 'yes' ? '✓ Yes' : '✗ No'}
                              </span>
                            </div>
                            
                            {answerData.theory_alignment && answerData.theory_alignment.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Theory Alignment:</p>
                                <div className="flex flex-wrap gap-1">
                                  {answerData.theory_alignment.map((theory: string, idx: number) => (
                                    <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                      {theory}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {answerData.reasoning && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Reasoning:</p>
                                <p className="text-sm text-gray-700">{answerData.reasoning}</p>
                              </div>
                            )}
                            
                            {answerData.everyday_example && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Everyday Example:</p>
                                <p className="text-sm text-gray-700 italic">{answerData.everyday_example}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Follow-up Questions */}
                    {currentQuestionData.follow_up_questions && currentQuestionData.follow_up_questions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Follow-up Questions</h3>
                        <div className="space-y-3">
                          {currentQuestionData.follow_up_questions.map((followUp: any, idx: number) => (
                            <div key={idx} className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                              <p className="font-semibold text-gray-800 mb-2">{followUp.question}</p>
                              <p className="text-sm text-gray-600">{followUp.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Group Discussion Prompts */}
                    {currentQuestionData.group_discussion_prompts && currentQuestionData.group_discussion_prompts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Group Discussion Prompts</h3>
                        <ul className="space-y-2">
                          {currentQuestionData.group_discussion_prompts.map((prompt: string, idx: number) => (
                            <li key={idx} className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-400">
                              <p className="text-gray-700">{prompt}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ethical Theories Reference */}
                    {Object.keys(ethicalTheories).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Ethical Theories Reference</h3>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                          <div className="grid md:grid-cols-2 gap-3">
                            {Object.entries(ethicalTheories).map(([theory, description]) => (
                              <div key={theory} className="bg-white rounded p-3 border border-gray-200">
                                <p className="font-semibold text-gray-800 text-sm mb-1">{theory}</p>
                                <p className="text-xs text-gray-600">{description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="text-sm text-gray-600">
                      {participants.filter(p => answerStatus[p.id]?.questionId === currentQuestion.id).length} / {participants.length} answered
                      {questionLocked && <span className="ml-2 text-red-600 font-semibold">• Question Locked</span>}
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      {!questionLocked ? (
                        <button
                          onClick={handleLockQuestion}
                          className="px-6 py-3 font-semibold rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
                        >
                          Lock Question (10s Countdown)
                        </button>
                      ) : (
                        <button
                          onClick={handleUnlockQuestion}
                          className="px-6 py-3 font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          Unlock Question
                        </button>
                      )}
                      
                      {questionIndex < totalQuestions - 1 ? (
                        <button
                          onClick={handleNextQuestion}
                          disabled={!allAnswered && participants.length > 0}
                          className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                            !allAnswered && participants.length > 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          onClick={handleShowResults}
                          disabled={!allAnswered && participants.length > 0}
                          className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                            !allAnswered && participants.length > 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          Show Results
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <button
            onClick={handleResetQuiz}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Reset Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
