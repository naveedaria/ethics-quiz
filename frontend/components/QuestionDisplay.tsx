'use client';

interface Question {
  id: number;
  text: string;
  title?: string;
  scenario?: string;
}

interface QuestionDisplayProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
}

export default function QuestionDisplay({ question, questionIndex, totalQuestions }: QuestionDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="text-sm text-gray-500 mb-2">
        Question {questionIndex + 1} of {totalQuestions}
      </div>
      {question.title && (
        <h1 className="text-xl font-semibold text-gray-700 mb-2">{question.title}</h1>
      )}
      {question.scenario && (
        <p className="text-gray-600 mb-4 italic">{question.scenario}</p>
      )}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{question.text}</h2>
    </div>
  );
}

