const socket = io();
let selectedQuiz = null;
let currentRoom = null;
let currentQuestionIndex = null;

// Elements
const quizSelect = document.getElementById('quizSelect');
const startRoomBtn = document.getElementById('startRoomBtn');
const questionList = document.getElementById('questionsList');
const presentBtn = document.getElementById('presentBtn');
const revealBtn = document.getElementById('revealBtn');
const nextBtn = document.getElementById('nextBtn');
const playerListDiv = document.getElementById('playerList');

// Load quizzes into dropdown
async function loadQuizzes() {
  const res = await fetch('/api/quizzes');
  const quizzes = await res.json();
  quizSelect.innerHTML = '<option value="">Select a Quiz</option>';
  quizzes.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.filename;
    opt.textContent = q.title;
    quizSelect.appendChild(opt);
  });
}

loadQuizzes();

// Select quiz
quizSelect.addEventListener('change', async (e) => {
  const filename = e.target.value;
  if (!filename) return;
  const res = await fetch(`/api/quizzes/${filename}`);
  selectedQuiz = await res.json();

  // populate question list
  questionList.innerHTML = '';
  selectedQuiz.questions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.classList.add('questionCard');
    div.dataset.index = idx;
    div.textContent = q.question;
    questionList.appendChild(div);
  });
});

// Start a live room
startRoomBtn.addEventListener('click', () => {
  if (!selectedQuiz) return alert('Select a quiz first!');
  const roomCode = Math.floor(Math.random() * 90000 + 10000).toString();
  currentRoom = roomCode;
  socket.emit('createRoom', { roomCode, quizFilename: selectedQuiz.filename });
});

// Present question
presentBtn.addEventListener('click', () => {
  if (currentQuestionIndex === null) currentQuestionIndex = 0;
  socket.emit('presentQuestion', { roomCode: currentRoom, questionIndex: currentQuestionIndex });
});

// Reveal answer
revealBtn.addEventListener('click', () => {
  socket.emit('revealAnswer', { roomCode: currentRoom });
});

// Next question
nextBtn.addEventListener('click', () => {
  if (currentQuestionIndex === null) return;
  if (currentQuestionIndex + 1 < selectedQuiz.questions.length) {
    currentQuestionIndex++;
    socket.emit('presentQuestion', { roomCode: currentRoom, questionIndex: currentQuestionIndex });
  } else {
    alert('End of quiz');
  }
});

// ----------------- Socket.IO Events -----------------

// Room created
socket.on('roomCreated', ({ roomCode, quizTitle, questions }) => {
  console.log(`Room ${roomCode} created for quiz: ${quizTitle}`);
  alert(`Room created: ${roomCode}`);
  // reset question index
  currentQuestionIndex = null;
});

// Question presented
socket.on('questionPresented', ({ questionIndex }) => {
  currentQuestionIndex = questionIndex;
  const q = selectedQuiz.questions[questionIndex];
  // highlight question
  document.querySelectorAll('.questionCard').forEach(div => div.classList.remove('presented'));
  const div = document.querySelector(`.questionCard[data-index="${questionIndex}"]`);
  if (div) div.classList.add('presented');
});

// Player answered
socket.on('playerAnswered', ({ name }) => {
  // optionally show feedback that a player answered
  console.log(`${name} answered`);
});

// Reveal answers
socket.on('revealAnswer', ({ answers }) => {
  // display results
  answers.forEach(a => {
    const p = document.createElement('div');
    p.textContent = `${a.name}: ${a.answer}`;
    playerListDiv.appendChild(p);
  });
});

// Player list update
socket.on('playerListUpdate', (players) => {
  playerListDiv.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.textContent = p.name;
    playerListDiv.appendChild(div);
  });
});

// Room closed
socket.on('roomClosed', () => {
  alert('Room closed!');
  currentRoom = null;
  currentQuestionIndex = null;
  questionList.innerHTML = '';
  playerListDiv.innerHTML = '';
});
