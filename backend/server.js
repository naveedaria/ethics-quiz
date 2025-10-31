const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Load questions from JSON file
const questionsPath = path.join(__dirname, '../data/questions.json');
let questionsData = null;

function loadQuestions() {
  try {
    const data = fs.readFileSync(questionsPath, 'utf8');
    questionsData = JSON.parse(data);
    return questionsData;
  } catch (error) {
    console.error('Error loading questions:', error);
    return null;
  }
}

// Initialize questions
loadQuestions();

// API endpoint to upload questions
app.post('/api/questions', (req, res) => {
  try {
    const newQuestions = req.body;
    fs.writeFileSync(questionsPath, JSON.stringify(newQuestions, null, 2));
    questionsData = newQuestions;
    res.json({ success: true, message: 'Questions updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get questions
app.get('/api/questions', (req, res) => {
  if (!questionsData) {
    loadQuestions();
  }
  res.json(questionsData);
});

// API endpoint to get answer history (admin only)
app.get('/api/answer-history', (req, res) => {
  res.json({
    answerHistory: quizSession.answerHistory,
    participants: quizSession.participants
  });
});

// Quiz session state
let quizSession = {
  participants: [],
  admin: null,
  adminPassword: 'Password123',
  currentQuestionIndex: null,
  answers: {}, // { participantId: { questionId: answer } }
  answerHistory: {}, // { participantId: [{ questionId, answer, questionTitle, theories }] }
  quizStarted: false,
  showResults: false
};

// Available icons for participants
const icons = ['🎭', '🎨', '🎪', '🎯', '🎲', '🎸', '🎺', '🎻', '🎬', '🎮', '🎯', '🎲'];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-as-participant', (data) => {
    const { name } = data;
    
    if (quizSession.participants.length >= 4) {
      socket.emit('error', { message: 'Quiz is full. Maximum 4 participants allowed.' });
      return;
    }

    if (quizSession.quizStarted) {
      socket.emit('error', { message: 'Quiz has already started. Cannot join now.' });
      return;
    }

    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    const participant = {
      id: socket.id,
      name: name || `Participant ${quizSession.participants.length + 1}`,
      icon: randomIcon,
      answers: {}
    };

    quizSession.participants.push(participant);
    socket.join('participants');

    socket.emit('joined', participant);
    io.emit('participants-updated', quizSession.participants);
    
    if (quizSession.admin) {
      socket.emit('quiz-state', {
        quizStarted: quizSession.quizStarted,
        currentQuestionIndex: quizSession.currentQuestionIndex,
        showResults: quizSession.showResults
      });
    }

    console.log(`Participant joined: ${name} (${socket.id})`);
  });

  socket.on('join-as-admin', (data) => {
    const { password } = data;
    
    if (password !== quizSession.adminPassword) {
      socket.emit('admin-auth-failed', { message: 'Invalid password' });
      return;
    }

    if (quizSession.admin && quizSession.admin !== socket.id) {
      socket.emit('error', { message: 'Admin already connected' });
      return;
    }

    quizSession.admin = socket.id;
    socket.join('admin');

    socket.emit('admin-joined', {
      participants: quizSession.participants,
      quizStarted: quizSession.quizStarted,
      currentQuestionIndex: quizSession.currentQuestionIndex,
      showResults: quizSession.showResults,
      answerHistory: quizSession.answerHistory
    });

    console.log('Admin joined:', socket.id);
  });

  socket.on('start-quiz', () => {
    if (socket.id !== quizSession.admin) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (quizSession.participants.length === 0) {
      socket.emit('error', { message: 'No participants joined yet' });
      return;
    }

    quizSession.quizStarted = true;
    quizSession.currentQuestionIndex = 0;
    quizSession.showResults = false;
    quizSession.answers = {};
    quizSession.answerHistory = {}; // Reset answer history

    const questions = questionsData.moral_quiz || [];
    const question = questions[0];
    if (question) {
      io.emit('quiz-started', {
        question: {
          id: question.id,
          text: question.question,
          title: question.title,
          scenario: question.scenario
        },
        questionIndex: 0
      });
    }

    console.log('Quiz started');
  });

  socket.on('submit-answer', (data) => {
    const { questionId, answer } = data;
    const participant = quizSession.participants.find(p => p.id === socket.id);

    if (!participant) {
      socket.emit('error', { message: 'Not a participant' });
      return;
    }

    if (!quizSession.answers[socket.id]) {
      quizSession.answers[socket.id] = {};
    }

    // Find the question to get its details
    const questions = questionsData.moral_quiz || [];
    const question = questions.find(q => q.id === questionId);
    
    quizSession.answers[socket.id][questionId] = answer;
    participant.answers[questionId] = answer;

    // Track answer history with theory alignment
    if (!quizSession.answerHistory[socket.id]) {
      quizSession.answerHistory[socket.id] = [];
    }
    
    const answerEntry = {
      questionId,
      questionTitle: question?.title || `Question ${questionId}`,
      questionText: question?.question || '',
      answer,
      theories: question?.answers[answer]?.theory_alignment || []
    };
    
    // Update or add entry
    const existingIndex = quizSession.answerHistory[socket.id].findIndex(
      entry => entry.questionId === questionId
    );
    if (existingIndex >= 0) {
      quizSession.answerHistory[socket.id][existingIndex] = answerEntry;
    } else {
      quizSession.answerHistory[socket.id].push(answerEntry);
    }

    io.to('admin').emit('answer-submitted', {
      participantId: socket.id,
      participantName: participant.name,
      questionId,
      answer,
      answerHistory: quizSession.answerHistory
    });

    socket.emit('answer-received', { questionId, answer });
    console.log(`Answer submitted: ${participant.name} - Q${questionId}: ${answer}`);
  });

  socket.on('next-question', () => {
    if (socket.id !== quizSession.admin) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (quizSession.currentQuestionIndex === null) {
      socket.emit('error', { message: 'Quiz not started' });
      return;
    }

    quizSession.currentQuestionIndex++;

    const questions = questionsData.moral_quiz || [];
    if (quizSession.currentQuestionIndex >= questions.length) {
      // Quiz completed
      quizSession.showResults = true;
      const results = calculateResults();
      io.emit('quiz-completed', results);
    } else {
      const question = questions[quizSession.currentQuestionIndex];
      io.emit('next-question', {
        question: {
          id: question.id,
          text: question.question,
          title: question.title,
          scenario: question.scenario
        },
        questionIndex: quizSession.currentQuestionIndex
      });
    }

    console.log(`Next question: ${quizSession.currentQuestionIndex}`);
  });

  socket.on('show-results', () => {
    if (socket.id !== quizSession.admin) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    quizSession.showResults = true;
    const results = calculateResults();
    io.emit('results-displayed', results);
    console.log('Results displayed');
  });

  socket.on('reset-quiz', () => {
    if (socket.id !== quizSession.admin) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    quizSession = {
      participants: [],
      admin: quizSession.admin,
      adminPassword: quizSession.adminPassword,
      currentQuestionIndex: null,
      answers: {},
      answerHistory: {},
      quizStarted: false,
      showResults: false
    };

    io.emit('quiz-reset');
    console.log('Quiz reset');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    if (socket.id === quizSession.admin) {
      quizSession.admin = null;
      io.emit('admin-disconnected');
    } else {
      quizSession.participants = quizSession.participants.filter(p => p.id !== socket.id);
      delete quizSession.answers[socket.id];
      io.emit('participants-updated', quizSession.participants);
    }
  });
});

function calculateResults() {
  const results = {};
  const questions = questionsData.moral_quiz || [];
  const theories = questionsData.ethical_theories || {};

  quizSession.participants.forEach(participant => {
    // Calculate theory tallies based on answers
    const theoryTally = {};
    
    // Go through all answered questions
    Object.keys(participant.answers).forEach(questionIdStr => {
      const questionId = parseInt(questionIdStr);
      const answer = participant.answers[questionId];
      const question = questions.find(q => q.id === questionId);
      
      if (question && question.answers[answer]) {
        const theoryAlignment = question.answers[answer].theory_alignment || [];
        
        // Increment tally for each theory aligned with this answer
        theoryAlignment.forEach(theory => {
          if (!theoryTally[theory]) {
            theoryTally[theory] = 0;
          }
          theoryTally[theory]++;
        });
      }
    });

    // Find theory with highest tally
    let maxTally = 0;
    let assignedTheory = 'Utilitarianism'; // Default fallback
    
    Object.keys(theoryTally).forEach(theory => {
      if (theoryTally[theory] > maxTally) {
        maxTally = theoryTally[theory];
        assignedTheory = theory;
      }
    });

    // If no answers, use default
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

