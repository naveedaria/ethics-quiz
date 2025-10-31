'use client';

interface Theory {
  name: string;
  description: string;
}

interface ParticipantResult {
  participant: {
    id: string;
    name: string;
    icon: string;
  };
  theory: Theory;
  tally: Record<string, number>;
}

interface AdminResultsDisplayProps {
  results: Record<string, ParticipantResult>;
}

export default function AdminResultsDisplay({ results }: AdminResultsDisplayProps) {
  const resultsArray = Object.values(results);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Results</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {resultsArray.map((result) => {
          const sortedTally = Object.entries(result.tally || {}).sort((a, b) => b[1] - a[1]);
          
          return (
            <div key={result.participant.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">{result.participant.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{result.participant.name}</h3>
                  <div className="text-lg font-semibold text-blue-600 mt-1">
                    {result.theory.name}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{result.theory.description}</p>
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2">Theory Tally:</div>
                <div className="space-y-1 text-sm">
                  {sortedTally.length === 0 ? (
                    <div className="text-gray-400">No tallies available</div>
                  ) : (
                    sortedTally.map(([theory, count]) => (
                      <div key={theory} className="flex justify-between">
                        <span className="text-gray-700">{theory}:</span>
                        <span className="font-semibold text-purple-600">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

