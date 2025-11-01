// Shared quiz session state
// In production, consider using Vercel KV for persistence across serverless invocations

interface Participant {
  id: string;
  name: string;
  icon: string;
  answers: Record<number, 'yes' | 'no'>;
}

interface AnswerHistoryEntry {
  questionId: number;
  questionTitle: string;
  questionText: string;
  answer: 'yes' | 'no';
  theories: string[];
}

interface QuizSession {
  participants: Participant[];
  admin: string | null;
  adminPassword: string;
  currentQuestionIndex: number | null;
  answers: Record<string, Record<number, 'yes' | 'no'>>;
  answerHistory: Record<string, AnswerHistoryEntry[]>;
  quizStarted: boolean;
  showResults: boolean;
  questionLocked: boolean;
  lockCountdown: number | null;
  lastUpdate: number;
}

let quizSession: QuizSession = {
  participants: [],
  admin: null,
  adminPassword: 'Password123',
  currentQuestionIndex: null,
  answers: {}, // { participantId: { questionId: answer } }
  answerHistory: {}, // { participantId: [{ questionId, answer, questionTitle, theories }] }
  quizStarted: false,
  showResults: false,
  questionLocked: false,
  lockCountdown: null, // timestamp when lock started
  lastUpdate: Date.now()
};

interface QuestionsData {
  moral_quiz?: Array<{
    id: number;
    title?: string;
    scenario?: string;
    question: string;
    answers?: {
      yes?: {
        theory_alignment?: string[];
        reasoning?: string;
        everyday_example?: string;
      };
      no?: {
        theory_alignment?: string[];
        reasoning?: string;
        everyday_example?: string;
      };
    };
  }>;
  ethical_theories?: Record<string, string>;
}

// Available icons for participants
const icons = ['🎭', '🎨', '🎪', '🎯', '🎲', '🎸', '🎺', '🎻', '🎬', '🎮', '🎯', '🎲'];

// Generate unique participant ID
function generateParticipantId() {
  return `participant_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Generate unique admin ID
function generateAdminId() {
  return `admin_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getQuizSession() {
  return quizSession;
}

export function updateQuizSession(updates: Partial<typeof quizSession>) {
  quizSession = { ...quizSession, ...updates, lastUpdate: Date.now() };
  return quizSession;
}

export function addParticipant(name: string, participantId?: string) {
  // If participantId is provided, check if they already exist
  if (participantId) {
    const existingParticipant = quizSession.participants.find(p => p.id === participantId);
    if (existingParticipant) {
      return existingParticipant; // Return existing participant
    }
  }

  if (quizSession.participants.length >= 4) {
    throw new Error('Quiz is full. Maximum 4 participants allowed.');
  }

  if (quizSession.quizStarted) {
    throw new Error('Quiz has already started. Cannot join now.');
  }

  const randomIcon = icons[Math.floor(Math.random() * icons.length)];
  const newParticipantId = participantId || generateParticipantId();
  const participant = {
    id: newParticipantId,
    name: name || `Participant ${quizSession.participants.length + 1}`,
    icon: randomIcon,
    answers: {}
  };

  quizSession.participants.push(participant);
  quizSession.lastUpdate = Date.now();
  
  return participant;
}

export function removeParticipant(participantId: string) {
  quizSession.participants = quizSession.participants.filter(p => p.id !== participantId);
  delete quizSession.answers[participantId];
  delete quizSession.answerHistory[participantId];
  quizSession.lastUpdate = Date.now();
}

export function setAdmin(adminId: string) {
  quizSession.admin = adminId;
  quizSession.lastUpdate = Date.now();
}

export function submitAnswer(participantId: string, questionId: number, answer: 'yes' | 'no', questionsData: QuestionsData) {
  const participant = quizSession.participants.find(p => p.id === participantId);
  if (!participant) {
    throw new Error('Not a participant');
  }

  // Check if question is locked AND countdown has completed (10 seconds have passed)
  if (quizSession.questionLocked && quizSession.lockCountdown) {
    const elapsed = (Date.now() - quizSession.lockCountdown) / 1000;
    if (elapsed >= 10) {
      throw new Error('Question is locked. Voting is closed.');
    }
  }

  if (!quizSession.answers[participantId]) {
    quizSession.answers[participantId] = {};
  }

  const questions = questionsData.moral_quiz || [];
  const question = questions.find(q => q.id === questionId);
  
  quizSession.answers[participantId][questionId] = answer;
  participant.answers[questionId] = answer;

  // Track answer history
  if (!quizSession.answerHistory[participantId]) {
    quizSession.answerHistory[participantId] = [];
  }
  
  const answerEntry = {
    questionId,
    questionTitle: question?.title || `Question ${questionId}`,
    questionText: question?.question || '',
    answer,
    theories: question?.answers?.[answer]?.theory_alignment || []
  };
  
  const existingIndex = quizSession.answerHistory[participantId].findIndex(
    entry => entry.questionId === questionId
  );
  if (existingIndex >= 0) {
    quizSession.answerHistory[participantId][existingIndex] = answerEntry;
  } else {
    quizSession.answerHistory[participantId].push(answerEntry);
  }

  quizSession.lastUpdate = Date.now();
}

export function lockQuestion() {
  quizSession.questionLocked = true;
  quizSession.lockCountdown = Date.now();
  quizSession.lastUpdate = Date.now();
}

export function unlockQuestion() {
  quizSession.questionLocked = false;
  quizSession.lockCountdown = null;
  quizSession.lastUpdate = Date.now();
}

export function startQuiz(questionsData: QuestionsData) {
  if (quizSession.participants.length === 0) {
    throw new Error('No participants joined yet');
  }

  quizSession.quizStarted = true;
  quizSession.currentQuestionIndex = 0;
  quizSession.showResults = false;
  quizSession.answers = {};
  quizSession.answerHistory = {};
  quizSession.lastUpdate = Date.now();

  const questions = questionsData.moral_quiz || [];
  return questions[0];
}

export function nextQuestion(questionsData: QuestionsData) {
  if (quizSession.currentQuestionIndex === null) {
    quizSession.currentQuestionIndex = 0;
  } else {
    quizSession.currentQuestionIndex++;
  }
  quizSession.questionLocked = false;
  quizSession.lockCountdown = null;
  const questions = questionsData.moral_quiz || [];
  
  if (quizSession.currentQuestionIndex >= questions.length) {
    quizSession.showResults = true;
    quizSession.lastUpdate = Date.now();
    return null; // Quiz completed
  }
  
  quizSession.lastUpdate = Date.now();
  return questions[quizSession.currentQuestionIndex];
}

export function showResults() {
  quizSession.showResults = true;
  quizSession.lastUpdate = Date.now();
}

export function resetQuiz() {
  quizSession = {
    participants: [],
    admin: quizSession.admin,
    adminPassword: quizSession.adminPassword,
    currentQuestionIndex: null,
    answers: {},
    answerHistory: {},
    quizStarted: false,
    showResults: false,
    questionLocked: false,
    lockCountdown: null,
    lastUpdate: Date.now()
  };
}

export function calculateResults(questionsData: QuestionsData) {
  const questions = questionsData.moral_quiz || [];
  const theories = questionsData.ethical_theories || {};
  const results: Record<string, {
    participant: {
      id: string;
      name: string;
      icon: string;
    };
    theory: {
      name: string;
      description: string;
    };
    tally: Record<string, number>;
    answerHistory: AnswerHistoryEntry[];
  }> = {};

  quizSession.participants.forEach(participant => {
    const theoryTally: Record<string, number> = {};
    
    Object.keys(participant.answers).forEach(questionIdStr => {
      const questionId = parseInt(questionIdStr);
      const answer = participant.answers[questionId];
      const question = questions.find(q => q.id === questionId);

      if (question && question.answers?.[answer]) {
        const theoryAlignment = question.answers?.[answer]?.theory_alignment || [];
        
        theoryAlignment.forEach(theory => {
          if (!theoryTally[theory]) {
            theoryTally[theory] = 0;
          }
          theoryTally[theory]++;
        });
      }
    });

    let maxTally = 0;
    let assignedTheory = 'Utilitarianism';
    
    Object.keys(theoryTally).forEach(theory => {
      if (theoryTally[theory] > maxTally) {
        maxTally = theoryTally[theory];
        assignedTheory = theory;
      }
    });

    if (Object.keys(theoryTally).length === 0) {
      assignedTheory = 'Utilitarianism';
    }

    results[participant.id] = {
      participant: {
        id: participant.id,
        name: participant.name,
        icon: participant.icon
      },
      theory: {
        name: assignedTheory,
        description: theories[assignedTheory] || 'No description available'
      },
      tally: theoryTally,
      answerHistory: quizSession.answerHistory[participant.id] || []
    };
  });

  return results;
}

export { icons };

