import fs from 'fs';
import path from 'path';

const questionsPath = path.join(process.cwd(), 'data', 'questions.json');

export function loadQuestions() {
  try {
    const data = fs.readFileSync(questionsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading questions:', error);
    return null;
  }
}

