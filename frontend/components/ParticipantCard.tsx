'use client';

interface Participant {
  id: string;
  name: string;
  icon: string;
}

interface ParticipantCardProps {
  participant: Participant;
  answer?: string;
  hasAnswered?: boolean;
}

export default function ParticipantCard({ participant, answer, hasAnswered }: ParticipantCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-md">
      <div className="text-4xl">{participant.icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-gray-800">{participant.name}</div>
        {hasAnswered !== undefined && (
          <div className={`text-sm ${hasAnswered ? 'text-green-600' : 'text-gray-400'}`}>
            {hasAnswered ? `Answered: ${answer === 'yes' ? 'Yes' : 'No'}` : 'Waiting...'}
          </div>
        )}
      </div>
    </div>
  );
}

