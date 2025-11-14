const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questions = [];

function askQuestion() {
  rl.question('\nEnter your question (or type "done" to finish): ', (qText) => {
    if (qText.toLowerCase() === 'done') {
      saveQuiz();
      return;
    }

    const choices = [];
    const letters = ['A', 'B', 'C', 'D'];

    function askChoice(idx = 0) {
      if (idx >= letters.length) {
        rl.question('Enter the correct choice letter (A, B, C, D): ', (correct) => {
          if (!letters.includes(correct.toUpperCase())) {
            console.log('Invalid letter. Try again.');
            askChoice(idx - 1);
            return;
          }
          questions.push({
            question: qText,
            choices: choices.map((text, i) => ({ id: letters[i], text })),
            correct_choice: correct.toUpperCase()
          });
          askQuestion(); // Next question
        });
        return;
      }

      rl.question(`Enter choice ${letters[idx]}: `, (choiceText) => {
        choices.push(choiceText);
        askChoice(idx + 1);
      });
    }

    askChoice();
  });
}

function saveQuiz() {
  const filePath = path.join(__dirname, 'quizzes', 'quiz_generated.json');
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8');
  console.log(`\nQuiz JSON file saved at ${filePath}`);
  rl.close();
}

console.log('Interactive Quiz Generator');
console.log('--------------------------');
askQuestion();
