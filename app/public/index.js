// --------------------
// Admin page script
// --------------------

document.addEventListener('DOMContentLoaded', () => {
  // --------------------
  // DOM References
  // --------------------
  const quizListContainer = document.getElementById('quizList');
  const createQuizBtn = document.getElementById('createQuizBtn');
  const quizTitleInput = document.getElementById('quizTitle');
  const quizDescInput = document.getElementById('quizDescription');

  const questionEditor = document.getElementById('questionEditor');
  const questionTextInput = document.getElementById('questionText');
  const choicesContainer = document.getElementById('choicesContainer');
  const correctSelect = document.getElementById('correctChoice');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const addChoiceBtn = document.getElementById('addChoiceBtn');
  const removeChoiceBtn = document.getElementById('removeChoiceBtn');
  const questionsList = document.getElementById('questionsList');

  const MIN_CHOICES = 2;
  const MAX_CHOICES = 10;
  let currentChoiceCount = 4; // Start with 4 choices by default

  const sessionsListContainer = document.getElementById('sessionsList');
  const sessionModal = document.getElementById('sessionModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  const closeModalBtn = document.getElementById('closeModal');

  let quizzes = [];
  let selectedQuiz = null;
  let editingQuestionIndex = null;

  // --------------------
  // Helper: generate unique question ID
  // --------------------
  const generateQuestionId = () => 'q_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

  // --------------------
  // Helper: convert number to choice label (A, B, C, ..., Z, AA, AB, ...)
  // --------------------
  const getChoiceLabel = (index) => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  // --------------------
  // Dynamic Choice Management
  // --------------------
  const renderChoiceInputs = () => {
    choicesContainer.innerHTML = '';
    for (let i = 0; i < currentChoiceCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'choice-input-wrapper';

      const label = document.createElement('div');
      label.className = 'choice-label';
      label.textContent = getChoiceLabel(i);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'choice-input';
      input.placeholder = `Choice ${getChoiceLabel(i)}`;
      input.dataset.choiceIndex = i;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      choicesContainer.appendChild(wrapper);
    }
    updateCorrectChoiceDropdown();
    updateChoiceButtons();
  };

  const updateCorrectChoiceDropdown = () => {
    const currentValue = correctSelect.value;
    correctSelect.innerHTML = '';
    for (let i = 0; i < currentChoiceCount; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Choice ${getChoiceLabel(i)}`;
      correctSelect.appendChild(option);
    }
    // Restore previous selection if still valid
    if (currentValue < currentChoiceCount) {
      correctSelect.value = currentValue;
    } else {
      correctSelect.value = 0;
    }
  };

  const updateChoiceButtons = () => {
    addChoiceBtn.disabled = currentChoiceCount >= MAX_CHOICES;
    removeChoiceBtn.disabled = currentChoiceCount <= MIN_CHOICES;

    if (currentChoiceCount >= MAX_CHOICES) {
      addChoiceBtn.style.opacity = '0.5';
      addChoiceBtn.style.cursor = 'not-allowed';
    } else {
      addChoiceBtn.style.opacity = '1';
      addChoiceBtn.style.cursor = 'pointer';
    }

    if (currentChoiceCount <= MIN_CHOICES) {
      removeChoiceBtn.style.opacity = '0.5';
      removeChoiceBtn.style.cursor = 'not-allowed';
    } else {
      removeChoiceBtn.style.opacity = '1';
      removeChoiceBtn.style.cursor = 'pointer';
    }
  };

  const getChoiceInputs = () => {
    return Array.from(document.querySelectorAll('.choice-input'));
  };

  const clearChoiceInputs = () => {
    getChoiceInputs().forEach(input => input.value = '');
  };

  const setChoiceValues = (choices) => {
    currentChoiceCount = choices.length;
    renderChoiceInputs();
    const inputs = getChoiceInputs();
    choices.forEach((choice, i) => {
      if (inputs[i]) inputs[i].value = choice;
    });
  };

  // --------------------
  // Fetch quizzes
  // --------------------
  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      if (!res.ok) throw new Error('Failed to fetch quizzes');
      quizzes = await res.json();
      renderQuizList();
    } catch (err) {
      console.error(err);
      alert('Could not load quizzes. Check console for errors.');
    }
  };

  // --------------------
  // Save quiz
  // --------------------
  const saveQuiz = async () => {
    if (!selectedQuiz) return;
    if (!selectedQuiz.questions) selectedQuiz.questions = [];
    const res = await fetch(`/api/quizzes/${selectedQuiz.filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedQuiz)
    });
    const updatedQuiz = await res.json();
    selectedQuiz = updatedQuiz;
    await fetchQuizzes();
  };

  // --------------------
  // Render quiz list
  // --------------------
  const renderQuizList = () => {
    quizListContainer.innerHTML = '';
    quizzes.forEach((quiz) => {
      const div = document.createElement('div');
      div.className = 'quizCard';
      if (selectedQuiz && selectedQuiz.filename === quiz.filename) div.classList.add('selected');

      div.innerHTML = `
        <strong>${quiz.title}</strong>
        <div class="quizActions">
          <button class="editQuizBtn">Edit</button>
          <button class="deleteQuizBtn">Delete</button>
        </div>
      `;

      div.querySelector('.editQuizBtn').addEventListener('click', async () => {
        selectQuiz(quiz);
      });

      div.querySelector('.deleteQuizBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        await fetch(`/api/quizzes/${quiz.filename}`, { method: 'DELETE' });
        if (selectedQuiz && selectedQuiz.filename === quiz.filename) {
          selectedQuiz = null;
          questionEditor.style.display = 'none';
          questionsList.innerHTML = '';
          quizTitleInput.value = '';
          quizDescInput.value = '';
        }
        await fetchQuizzes();
      });

      quizListContainer.appendChild(div);
    });
  };

  // --------------------
  // Select quiz
  // --------------------
  const selectQuiz = async (quiz) => {
    editingQuestionIndex = null;
    questionTextInput.value = '';
    currentChoiceCount = 4; // Reset to default
    renderChoiceInputs();
    clearChoiceInputs();
    correctSelect.value = 0;

    selectedQuiz = quiz;
    questionEditor.style.display = 'block';

    const res = await fetch(`/api/quizzes/${quiz.filename}`);
    const data = await res.json();
    selectedQuiz.questions = data.questions || [];

    selectedQuiz.questions.forEach(q => {
      if (!q.id) q.id = generateQuestionId();
    });

    quizTitleInput.value = selectedQuiz.title || '';
    quizDescInput.value = selectedQuiz.description || '';

    renderQuestions();
    renderQuizList();
  };

  // --------------------
  // Render questions
  // --------------------
  const renderQuestions = () => {
    questionsList.innerHTML = '';
    if (!selectedQuiz || !selectedQuiz.questions) return;

    selectedQuiz.questions.forEach((q, idx) => {
      const qDiv = document.createElement('div');
      qDiv.className = 'questionCard';
      if (editingQuestionIndex === idx) qDiv.classList.add('editing');

      qDiv.innerHTML = `
        <div><strong>${idx + 1}. ${q.text}</strong></div>
        <ul>
          ${q.choices.map((c, i) => `<li${q.correctChoice == i ? ' style="color:#0f0"' : ''}>${c}</li>`).join('')}
        </ul>
        <div>
          <button class="editQBtn">Edit</button>
          <button class="deleteQBtn">Delete</button>
        </div>
      `;

      qDiv.querySelector('.editQBtn').addEventListener('click', () => {
        editingQuestionIndex = idx;
        questionTextInput.value = q.text;
        setChoiceValues(q.choices);
        correctSelect.value = q.correctChoice;
        renderQuestions();
      });

      qDiv.querySelector('.deleteQBtn').addEventListener('click', async () => {
        selectedQuiz.questions.splice(idx, 1);
        editingQuestionIndex = null;
        await saveQuiz();
        renderQuestions();
      });

      questionsList.appendChild(qDiv);
    });
  };

  // --------------------
  // Event listeners
  // --------------------

  // Debounce helper for auto-save (waits 1 second after user stops typing)
  let saveDebounceTimer = null;
  const debouncedSave = () => {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      await saveQuiz();
      console.log('Quiz details auto-saved');
    }, 1000);
  };

  quizTitleInput.addEventListener('input', () => {
    if (selectedQuiz) {
      selectedQuiz.title = quizTitleInput.value;
      debouncedSave();
    }
  });

  quizDescInput.addEventListener('input', () => {
    if (selectedQuiz) {
      selectedQuiz.description = quizDescInput.value;
      debouncedSave();
    }
  });

  createQuizBtn.addEventListener('click', async () => {
    const title = prompt('Enter new quiz title:');
    if (!title) return;
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: '', questions: [] })
    });
    const newQuiz = await res.json();
    await fetchQuizzes();
    selectQuiz(newQuiz);
  });

  // --------------------
  // Excel Import/Export Handlers
  // --------------------
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const uploadExcelBtn = document.getElementById('uploadExcelBtn');
  const excelFileInput = document.getElementById('excelFileInput');
  const importStatus = document.getElementById('importStatus');

  // Download Excel template
  downloadTemplateBtn.addEventListener('click', async () => {
    try {
      importStatus.textContent = 'Downloading template...';
      importStatus.style.color = '#4fc3f7';

      const response = await fetch('/api/quiz-template');
      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quiz_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      importStatus.textContent = '✓ Template downloaded';
      importStatus.style.color = '#0f0';
      setTimeout(() => { importStatus.textContent = ''; }, 3000);
    } catch (err) {
      importStatus.textContent = '✗ Error: ' + err.message;
      importStatus.style.color = '#f00';
    }
  });

  // Upload Excel file
  uploadExcelBtn.addEventListener('click', () => {
    excelFileInput.click();
  });

  excelFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      importStatus.textContent = 'Uploading and processing...';
      importStatus.style.color = '#4fc3f7';

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-quiz', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import quiz');
      }

      importStatus.textContent = `✓ Imported "${result.title}" with ${result.questionCount} questions`;
      importStatus.style.color = '#0f0';

      // Refresh quiz list and select the new quiz
      await fetchQuizzes();
      const importedQuiz = quizzes.find(q => q.filename === result.filename);
      if (importedQuiz) {
        selectQuiz(importedQuiz);
      }

      setTimeout(() => { importStatus.textContent = ''; }, 5000);
    } catch (err) {
      importStatus.textContent = '✗ Error: ' + err.message;
      importStatus.style.color = '#f00';
    } finally {
      // Reset file input
      excelFileInput.value = '';
    }
  });

  addQuestionBtn.addEventListener('click', async () => {
    if (!selectedQuiz) return alert('Select a quiz first');

    const text = questionTextInput.value.trim();
    const choices = getChoiceInputs().map(i => i.value.trim());
    const correctChoice = parseInt(correctSelect.value);

    if (!text || choices.some(c => !c)) return alert('Fill in all fields');

    if (!selectedQuiz.questions) selectedQuiz.questions = [];

    if (editingQuestionIndex !== null) {
      const existingId = selectedQuiz.questions[editingQuestionIndex].id || generateQuestionId();
      selectedQuiz.questions[editingQuestionIndex] = { text, choices, correctChoice, id: existingId };
    } else {
      selectedQuiz.questions.push({ text, choices, correctChoice, id: generateQuestionId() });
    }

    await saveQuiz();

    editingQuestionIndex = null;
    questionTextInput.value = '';
    clearChoiceInputs();
    correctSelect.value = 0;

    renderQuestions();
  });

  addChoiceBtn.addEventListener('click', () => {
    if (currentChoiceCount < MAX_CHOICES) {
      currentChoiceCount++;
      renderChoiceInputs();
    }
  });

  removeChoiceBtn.addEventListener('click', () => {
    if (currentChoiceCount > MIN_CHOICES) {
      currentChoiceCount--;
      renderChoiceInputs();
    }
  });

  sessionModal.addEventListener('click', (e) => {
    if (e.target === closeModalBtn || e.target === sessionModal) {
      sessionModal.style.display = 'none';
    }
  });

  // --------------------
  // Sessions Management
  // --------------------
  const loadSessions = async () => {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    renderSessions(sessions);
  };

  const renderSessions = (sessions) => {
    if (!sessions.length) {
      sessionsListContainer.innerHTML = '<em style="color: #aaa;">No completed sessions yet</em>';
      return;
    }

    sessionsListContainer.innerHTML = sessions.map(session => {
      const displayDate = session.resumedAt ? new Date(session.resumedAt).toLocaleString() : new Date(session.createdAt).toLocaleString();
      const dateLabel = session.resumedAt ? 'Resumed' : 'Started';
      const resumedBadge = session.resumedAt ? '<span style="background: rgba(255,165,0,0.3); padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.8rem; margin-left: 0.5rem;">↻ Resumed</span>' : '';
      const statusColor = session.status === 'completed' ? '#0f0' : session.status === 'interrupted' ? '#ff0' : '#aaa';

      return `
        <div class="quizCard" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${session.quizTitle}</strong> - Room: ${session.roomCode}${resumedBadge}
            <div style="font-size: 0.9rem; color: #aaa;">
              ${dateLabel}: ${displayDate} | Players: ${session.players.length}
              <span style="color: ${statusColor}; margin-left: 1rem;">● ${session.status}</span>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="viewSession('${session.filename}')" style="background: rgba(0,123,255,0.3);">View Details</button>
            <button onclick="deleteSession('${session.filename}')" style="background: rgba(255,0,0,0.3);">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  };

  // --------------------
  // View session details (modal)
  // --------------------
  window.viewSession = async (filename) => {
    const res = await fetch(`/api/sessions/${filename}`);
    const session = await res.json();

    modalTitle.textContent = `${session.quizTitle} - Room ${session.roomCode}`;

    // Compute scores
    const playerScores = session.players.map(player => {
      let correct = 0;
      let total = 0;
      Object.entries(player.answers || {}).forEach(([qIdx, choice]) => {
        const question = session.questions[parseInt(qIdx)];
        if (question && question.correctChoice === choice) correct++;
        total++;
      });
      return {
        name: player.name,
        correct,
        total,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0
      };
    }).sort((a, b) => b.correct - a.correct);

    modalContent.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <p><strong>Status:</strong> ${session.status}</p>
        <p><strong>Originally Started:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
        ${session.resumedAt ? `<p><strong>Resumed:</strong> ${new Date(session.resumedAt).toLocaleString()}</p>` : ''}
        ${session.originalRoomCode ? `<p><strong>Original Room:</strong> ${session.originalRoomCode}</p>` : ''}
        ${session.completedAt ? `<p><strong>Completed:</strong> ${new Date(session.completedAt).toLocaleString()}</p>` : ''}
        <p><strong>Total Questions:</strong> ${session.questions.length}</p>
      </div>

      <h3>Player Scores</h3>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 2rem;">
        ${playerScores.map((p, idx) => `
          <div style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div><strong>${idx + 1}. ${p.name}</strong></div>
            <div style="text-align:right;">
              <strong style="font-size: 1.2rem; color: ${p.percentage >= 70 ? '#0f0' : p.percentage >= 50 ? '#ff0' : '#f66'};">
                ${p.correct}/${p.total}
              </strong>
              <span style="color: #aaa; margin-left:0.5rem;">(${p.percentage}%)</span>
            </div>
          </div>
        `).join('')}
      </div>

      <h3>Question-by-Question Breakdown</h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${session.questions.map((q, qIdx) => {
          const answers = session.players.map(p => ({
            name: p.name,
            choice: p.answers?.[qIdx],
            correct: p.answers?.[qIdx] === q.correctChoice
          }));
          const answeredCount = answers.filter(a => a.choice !== undefined).length;
          const correctCount = answers.filter(a => a.correct).length;

          return `
            <div style="background: rgba(255,255,255,0.05); padding:1rem; border-radius:8px;">
              <strong>Q${qIdx+1}: ${q.text}</strong>
              <div style="margin:0.5rem 0; color:#aaa;">Correct Answer: <span style="color:#0f0;">${q.choices[q.correctChoice]}</span></div>
              <div style="margin:0.5rem 0; font-size:0.9rem;">${correctCount}/${answeredCount} players answered correctly</div>
              <details style="margin-top:0.5rem;">
                <summary style="cursor:pointer; color:#007bff;">Show player answers</summary>
                <div style="margin-top:0.5rem; padding-left:1rem;">
                  ${answers.map(a => `
                    <div style="padding:0.2rem 0; ${a.correct ? 'color:#0f0;' : 'color:#f66;'}">
                      ${a.name}: ${a.choice !== undefined ? q.choices[a.choice] : 'No answer'} ${a.correct ? '✓' : a.choice !== undefined ? '✗' : ''}
                    </div>
                  `).join('')}
                </div>
              </details>
            </div>
          `;
        }).join('')}
      </div>
    `;

    sessionModal.style.display = 'flex';
  };

  // --------------------
  // Delete session
  // --------------------
  window.deleteSession = async (filename) => {
    if (!confirm('Delete this session permanently?')) return;
    await fetch(`/api/sessions/${filename}`, { method: 'DELETE' });
    loadSessions();
  };

  // --------------------
  // Initialize
  // --------------------
  questionEditor.style.display = 'none';
  renderChoiceInputs(); // Initialize with default 4 choices
  fetchQuizzes();
  loadSessions();

  // Expose loadSessions for tab button refresh
  window.loadSessions = loadSessions;

  // --------------------
  // Quiz Options Functions
  // --------------------
  window.setQuickTimeout = (seconds) => {
    document.getElementById('answerDisplayTime').value = seconds;
  };

  window.saveQuizOptions = () => {
    const timeout = document.getElementById('answerDisplayTime').value;
    localStorage.setItem('quizOptions', JSON.stringify({ answerDisplayTime: parseInt(timeout) }));
    const msg = document.getElementById('optionsSaveMsg');
    msg.textContent = 'Options saved successfully!';
    msg.style.display = 'block';
    msg.style.background = 'rgba(0,255,0,0.2)';
    msg.style.color = '#0f0';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  };

  window.loadOptions = () => {
    const saved = localStorage.getItem('quizOptions');
    if (saved) {
      const options = JSON.parse(saved);
      document.getElementById('answerDisplayTime').value = options.answerDisplayTime || 30;
    }
  };
});
