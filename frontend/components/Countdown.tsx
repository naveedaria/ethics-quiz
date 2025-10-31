'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  lockTimestamp: number;
  onComplete: () => void;
}

export default function Countdown({ lockTimestamp, onComplete }: CountdownProps) {
  const [count, setCount] = useState(10);

  useEffect(() => {
    const updateCountdown = () => {
      const elapsed = (Date.now() - lockTimestamp) / 1000;
      const remaining = Math.max(0, Math.ceil(10 - elapsed));
      
      if (remaining <= 0) {
        setCount(0);
        setTimeout(() => {
          onComplete();
        }, 500);
        return;
      }
      
      setCount(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [lockTimestamp, onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-12 text-center animate-pulse">
        <div className={`text-8xl font-bold mb-4 transition-all duration-300 ${
          count <= 3 ? 'text-red-600 scale-125 animate-bounce' : 'text-blue-600'
        }`}>
          {count}
        </div>
        <p className="text-2xl text-gray-700">
          {count > 0 ? 'Voting ends in...' : 'Voting Closed'}
        </p>
      </div>
    </div>
  );
}

