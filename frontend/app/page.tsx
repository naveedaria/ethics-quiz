'use client';

import { useEffect, useState } from 'react';
import QRCode from '@/components/QRCode';
import { getQuizSession } from '@/lib/quizSession';

interface Participant {
  id: string;
  name: string;
  icon: string;
}

export default function HomePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/quiz`;
      setCurrentUrl(url);
    }

    // Poll for quiz state updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/quiz');
        const session = await response.json();
        setParticipants(session.participants || []);
        setQuizStarted(session.quizStarted || false);
        setShowResults(session.showResults || false);
      } catch (error) {
        console.error('Error polling quiz state:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, []);

  const getStatusText = () => {
    if (showResults) return 'Results displayed';
    if (quizStarted) return 'Quiz in progress';
    if (participants.length === 0) return 'Waiting for participants to join...';
    return `${participants.length} participant${participants.length !== 1 ? 's' : ''} joined`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Ethics Quiz
        </h1>
        
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-center text-gray-700">
            Scan QR Code to Join
          </h2>
          {currentUrl && <QRCode url={currentUrl} />}
          <div className="mt-4 text-center">
            <p className="text-gray-600 mb-2">Or visit:</p>
            <a 
              href={currentUrl} 
              className="text-blue-600 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {currentUrl}
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Session Status</h2>
          <div className="text-lg text-gray-600 mb-4">{getStatusText()}</div>
          
          {participants.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Participants:</h3>
              <div className="grid gap-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-3xl">{participant.icon}</div>
                    <div className="font-medium text-gray-800">{participant.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <a
              href="/quiz/admin"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Quiz Master Control Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
