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
  answerHistory?: any[];
}

interface ResultsDisplayProps {
  results: Record<string, ParticipantResult>;
  currentUserId: string;
}

// Political stances aligned with each theory
const politicalStances: Record<string, string[]> = {
  'Utilitarianism': [
    'Support policies that maximize overall happiness (e.g., universal healthcare, progressive taxation)',
    'Favor evidence-based policy decisions over ideological positions',
    'Support immigration policies that benefit economic growth',
    'Advocate for environmental regulations that prevent long-term harm',
    'Support public education investment for societal benefit'
  ],
  'Deontological Ethics': [
    'Believe in universal human rights that cannot be violated',
    'Support strict adherence to international law and treaties',
    'Oppose torture and human rights violations regardless of circumstances',
    'Support constitutional protections and rule of law',
    'Advocate for consistent application of moral principles in policy'
  ],
  'Kantian Ethics': [
    'Believe in treating people as ends, not means',
    'Support policies that respect human dignity and autonomy',
    'Oppose policies that exploit vulnerable populations',
    'Support democratic institutions and civic participation',
    'Advocate for universal moral principles in governance'
  ],
  'Virtue Ethics': [
    'Focus on character and moral education in society',
    'Support community-building and civic engagement programs',
    'Advocate for policies that promote good character traits',
    'Support mentorship and role model programs',
    'Believe in restorative justice over punitive measures'
  ],
  'Care Ethics': [
    'Prioritize policies that support families and caregiving',
    'Support paid family leave and childcare assistance',
    'Advocate for policies that reduce inequality and support vulnerable groups',
    'Support community-based healthcare and social services',
    'Believe in empathetic and relationship-focused policymaking'
  ],
  'Consequentialism': [
    'Evaluate policies based on their outcomes',
    'Support policies that produce the best results',
    'Favor pragmatic solutions over ideological purity',
    'Support data-driven policy decisions',
    'Advocate for cost-benefit analysis in governance'
  ],
  'Social Contract Theory': [
    'Support democratic processes and consent of the governed',
    'Believe in balancing individual rights with social obligations',
    'Support policies that rational people would agree to',
    'Advocate for fair distribution of resources',
    'Support rule of law and social institutions'
  ],
  'Rights-Based Ethics': [
    'Strongly support civil liberties and constitutional rights',
    'Oppose surveillance and privacy violations',
    'Support free speech and expression protections',
    'Advocate for criminal justice reform and due process',
    'Believe in limiting government power over individuals'
  ],
  'Altruism': [
    'Support generous social safety nets',
    'Advocate for foreign aid and global humanitarian assistance',
    'Support progressive taxation and wealth redistribution',
    'Favor policies that help the least fortunate',
    'Support volunteerism and community service programs'
  ],
  'Act Utilitarianism': [
    'Make decisions case-by-case based on outcomes',
    'Support flexible policy approaches',
    'Favor adaptive governance over rigid rules',
    'Support policies that maximize happiness in specific situations',
    'Advocate for responsive rather than rule-based policymaking'
  ],
  'Extreme Utilitarianism': [
    'Support policies that maximize overall well-being, even if unpopular',
    'Favor efficient resource allocation over fairness',
    'Support utilitarian calculus in difficult decisions',
    'Advocate for policies that benefit the majority',
    'Support cost-effective social programs'
  ],
  'Pragmatic Ethics': [
    'Support workable solutions over idealistic ones',
    'Favor compromise and incremental change',
    'Advocate for practical policy solutions',
    'Support evidence-based governance',
    'Believe in adapting policies based on results'
  ],
  'Egoism': [
    'Support policies that benefit individual self-interest',
    'Favor free markets and minimal government intervention',
    'Support policies that maximize personal freedom',
    'Advocate for individual responsibility over collective obligation',
    'Believe in voluntary cooperation over forced redistribution'
  ]
};

export default function ResultsDisplay({ results, currentUserId }: ResultsDisplayProps) {
  const currentUserResult = results[currentUserId];
  const allResults = Object.values(results);
  
  if (!currentUserResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Quiz Results</h2>
        <p className="text-center text-gray-600">Results not available yet.</p>
      </div>
    );
  }

  // Calculate differences from other participants
  const differences: Array<{ questionTitle: string; userAnswer: string; othersAnswers: { answer: string; count: number }[] }> = [];
  
  if (currentUserResult.answerHistory) {
    currentUserResult.answerHistory.forEach((userEntry: any) => {
      const othersAnswers: Record<string, number> = {};
      
      allResults.forEach(result => {
        if (result.participant.id !== currentUserId && result.answerHistory) {
          const otherEntry = result.answerHistory?.find((entry: any) => entry.questionId === userEntry.questionId);
          if (otherEntry) {
            othersAnswers[otherEntry.answer] = (othersAnswers[otherEntry.answer] || 0) + 1;
          }
        }
      });
      
      const othersAnswersArray = Object.entries(othersAnswers).map(([answer, count]) => ({ answer, count }));
      
      if (othersAnswersArray.length > 0) {
        const majorityAnswer = othersAnswersArray.reduce((a, b) => a.count > b.count ? a : b);
        if (majorityAnswer.answer !== userEntry.answer) {
          differences.push({
            questionTitle: userEntry.questionTitle,
            userAnswer: userEntry.answer,
            othersAnswers: othersAnswersArray
          });
        }
      }
    });
  }

  const sortedTally = Object.entries(currentUserResult.tally || {}).sort((a, b) => b[1] - a[1]);
  const stances = politicalStances[currentUserResult.theory.name] || [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{currentUserResult.participant.icon}</div>
        <h2 className="text-4xl font-bold text-gray-800 mb-2">Your Ethical Theory</h2>
        <div className="text-3xl font-semibold text-blue-600 mb-4">
          {currentUserResult.theory.name}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">About This Theory</h3>
        <p className="text-gray-700 text-lg leading-relaxed">{currentUserResult.theory.description}</p>
      </div>

      {stances.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Political Stances You Might Agree With</h3>
          <ul className="space-y-3">
            {stances.map((stance, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span className="text-gray-700">{stance}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {differences.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Where You Differed From Others</h3>
          <div className="space-y-4">
            {differences.map((diff, index) => (
              <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-800 mb-2">{diff.questionTitle}</h4>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    diff.userAnswer === 'yes' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    You answered: {diff.userAnswer === 'yes' ? 'Yes' : 'No'}
                  </span>
                  <span className="text-gray-600">
                    Others: {diff.othersAnswers.map(a => `${a.answer === 'yes' ? 'Yes' : 'No'} (${a.count})`).join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Your Theory Breakdown</h3>
        <div className="space-y-2">
          {sortedTally.map(([theory, count]) => (
            <div key={theory} className="flex justify-between items-center">
              <span className="text-gray-700">{theory}:</span>
              <span className={`font-semibold ${
                theory === currentUserResult.theory.name ? 'text-blue-600 text-lg' : 'text-gray-600'
              }`}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
