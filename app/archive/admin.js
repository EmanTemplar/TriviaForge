const menuToggle = document.getElementById('menuToggle');
const menu = document.getElementById('menu');
menuToggle.onclick = () => menu.classList.toggle('open');

let quizId = null;
let editingQuestionId = null;
const questions = [];

const quizTitleInput = document.getElementById('quizTitle');
const quizDescriptionInput = document.getElementById('quizDescription');
const createQuizBtn = document.getElementById('createQuizBtn');

const editorContainer = document.getElementById('editorContainer');
const editingQuizName = document.getElementById('editingQuizName');
const questionText = document.getElementById('questionText');
const choiceInputs = document.querySelectorAll('.choiceInput');
const correctChoice = document.getElementById('correctChoice');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const questionsList = document.getElementById('questionsList');

// Create quiz
createQuizBtn.onclick = async () => {
  const title = quizTitleInput.value.trim();
  const description = quizDescriptionInput.value.trim();
  if(!title) return alert('Quiz title required');

  const res = await fetch('/api/quizzes', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({title, description})
  });
  const data = await res.json();
  quizId = data.id;

  quizTitleInput.disabled = true;
  quizDescriptionInput.disabled = true;
  createQuizBtn.style.display = 'none';

  editorContainer.classList.remove('hidden');
  editingQuizName.textContent = `Editing Quiz: ${title}`;
};

// Add / Edit Question
addQuestionBtn.onclick = async () => {
  const text = questionText.value.trim();
  const choicesArr = Array.from(choiceInputs).map((input, i) => ({
    id: String.fromCharCode(65 + i),
    text: input.value.trim()
  }));
  const correct = correctChoice.value;

  if(!text || choicesArr.some(c=>!c.text)) return alert('All fields required');

  let method = 'POST';
  let url = `/api/quizzes/${quizId}/questions`;
  if(editingQuestionId){
    method = 'PUT';
    url = `/api/questions/${editingQuestionId}`;
  }

  const res = await fetch(url, {
    method,
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({question:text, choices:choicesArr, correct_choice:correct})
  });
  const saved = await res.json();

  if(editingQuestionId){
    const idx = questions.findIndex(q=>q.id===editingQuestionId);
    questions[idx] = saved;
    editingQuestionId = null;
    addQuestionBtn.textContent = 'Add Question';
  } else {
    questions.push(saved);
  }
  renderQuestions();
  questionText.value = '';
  choiceInputs.forEach(i=>i.value='');
};

// Render question list
function renderQuestions(){
  questionsList.innerHTML = '';
  questions.forEach(q=>{
    const div = document.createElement('div');
    div.className = 'questionCard';
    div.innerHTML = `<strong>${q.text}</strong>
      <div>${q.choices.map(c=>`${c.id}: ${c.text}`).join(' | ')}</div>
      <div>Correct: ${q.correct_choice}</div>
      <button class="editBtn">Edit</button>
      <button class="deleteBtn">Delete</button>
    `;
    const editBtn = div.querySelector('.editBtn');
    const deleteBtn = div.querySelector('.deleteBtn');

    editBtn.onclick = () => {
      editingQuestionId = q.id;
      questionText.value = q.text;
      choiceInputs.forEach((i, idx) => i.value = q.choices[idx].text);
      correctChoice.value = q.correct_choice;
      addQuestionBtn.textContent = 'Update Question';
    };

    deleteBtn.onclick = async () => {
      await fetch(`/api/questions/${q.id}`, {method:'DELETE'});
      const idx = questions.findIndex(x=>x.id===q.id);
      questions.splice(idx,1);
      renderQuestions();
    };

    questionsList.appendChild(div);
  });
}
