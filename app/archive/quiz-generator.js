const fs = require('fs');
const path = require('path');

// Example quiz data
const quizData = [
  {
    question: "What is 2+2?",
    choices: ["3", "4", "5", "6"],
    correct: "B" // Use A, B, C, or D
  },
  {
    question: "What is the capital of France?",
    choices: ["Paris", "Lyon", "Marseille", "Toulouse"],
    correct: "A"
  },
  {
    question: "Who wrote Hamlet?",
    choices: ["Shakespeare", "Dickens", "Hemingway", "Tolkien"],
    correct: "A"
  }
];

// Transform to the correct format
const formattedQuiz = quizData.map(q => ({
  question: q.question,
  choices: q.choices.map((text, idx) => ({
    id: String.fromCharCode(65 + idx), // A, B, C, D
    text
  })),
  correct_choice: q.correct
}));

// Output file name
const outputFile = path.join(__dirname, 'quizzes', 'quiz_generated.json');

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(formattedQuiz, null, 2), 'utf-8');

console.log(`Quiz JSON file generated at ${outputFile}`);
