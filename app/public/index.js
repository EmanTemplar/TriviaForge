// --------------------
// Admin page script
// --------------------

document.addEventListener('DOMContentLoaded', async () => {
  // --------------------
  // Authentication Check
  // --------------------
  const token = localStorage.getItem('triviaAuthToken');

  if (!token) {
    window.location.href = 'landing.html';
    return;
  }

  // Verify token and check admin role
  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      localStorage.removeItem('triviaAuthToken');
      window.location.href = 'landing.html';
      return;
    }

    const data = await response.json();

    if (data.user.account_type !== 'admin') {
      alert('Admin access required');
      localStorage.removeItem('triviaAuthToken');
      window.location.href = 'landing.html';
      return;
    }

    // Set username in navbar if element exists
    const usernameDisplay = document.getElementById('adminUsername');
    if (usernameDisplay) {
      usernameDisplay.textContent = data.user.username;
    }
  } catch (err) {
    console.error('Authentication error:', err);
    localStorage.removeItem('triviaAuthToken');
    window.location.href = 'landing.html';
    return;
  }

  // --------------------
  // Helper: Get auth headers
  // --------------------
  const getAuthHeaders = () => {
    const token = localStorage.getItem('triviaAuthToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

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

  const shuffleControls = document.getElementById('shuffleControls');
  const shuffleQuestionsBtn = document.getElementById('shuffleQuestionsBtn');
  const shuffleAllChoicesBtn = document.getElementById('shuffleAllChoicesBtn');

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
  // Shuffle Helper (Fisher-Yates algorithm)
  // --------------------
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // --------------------
  // Custom Dialog Functions
  // --------------------
  const customAlert = (message, title = 'Notification') => {
    return new Promise((resolve) => {
      const dialog = document.getElementById('customDialog');
      const dialogTitle = document.getElementById('dialogTitle');
      const dialogMessage = document.getElementById('dialogMessage');
      const dialogButtons = document.getElementById('dialogButtons');

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;

      dialogButtons.innerHTML = '';
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.cssText = 'padding: 0.75rem 2rem; background: rgba(0,123,255,0.3); border: 1px solid rgba(0,123,255,0.5); color: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s;';
      okBtn.onmouseover = () => okBtn.style.background = 'rgba(0,123,255,0.5)';
      okBtn.onmouseout = () => okBtn.style.background = 'rgba(0,123,255,0.3)';
      okBtn.onclick = () => {
        dialog.style.display = 'none';
        resolve();
      };
      dialogButtons.appendChild(okBtn);

      dialog.style.display = 'flex';
      okBtn.focus();
    });
  };

  const customConfirm = (message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      const dialog = document.getElementById('customDialog');
      const dialogTitle = document.getElementById('dialogTitle');
      const dialogMessage = document.getElementById('dialogMessage');
      const dialogButtons = document.getElementById('dialogButtons');
      const dialogInput = document.getElementById('dialogInput');

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInput.style.display = 'none';

      dialogButtons.innerHTML = '';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding: 0.75rem 2rem; background: rgba(100,100,100,0.3); border: 1px solid rgba(100,100,100,0.5); color: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.2s;';
      cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(100,100,100,0.5)';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'rgba(100,100,100,0.3)';
      cancelBtn.onclick = () => {
        dialog.style.display = 'none';
        resolve(false);
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirm';
      confirmBtn.style.cssText = 'padding: 0.75rem 2rem; background: rgba(0,200,0,0.3); border: 1px solid rgba(0,200,0,0.5); color: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s;';
      confirmBtn.onmouseover = () => confirmBtn.style.background = 'rgba(0,200,0,0.5)';
      confirmBtn.onmouseout = () => confirmBtn.style.background = 'rgba(0,200,0,0.3)';
      confirmBtn.onclick = () => {
        dialog.style.display = 'none';
        resolve(true);
      };

      dialogButtons.appendChild(cancelBtn);
      dialogButtons.appendChild(confirmBtn);

      dialog.style.display = 'flex';
      confirmBtn.focus();
    });
  };

  const customPrompt = (message, title = 'Input Required') => {
    return new Promise((resolve) => {
      const dialog = document.getElementById('customDialog');
      const dialogTitle = document.getElementById('dialogTitle');
      const dialogMessage = document.getElementById('dialogMessage');
      const dialogButtons = document.getElementById('dialogButtons');
      const dialogInput = document.getElementById('dialogInput');
      const dialogInputField = document.getElementById('dialogInputField');

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInput.style.display = 'block';
      dialogInputField.value = '';

      dialogButtons.innerHTML = '';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding: 0.75rem 2rem; background: rgba(100,100,100,0.3); border: 1px solid rgba(100,100,100,0.5); color: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.2s;';
      cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(100,100,100,0.5)';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'rgba(100,100,100,0.3)';
      cancelBtn.onclick = () => {
        dialog.style.display = 'none';
        resolve(null);
      };

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.style.cssText = 'padding: 0.75rem 2rem; background: rgba(0,123,255,0.3); border: 1px solid rgba(0,123,255,0.5); color: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s;';
      okBtn.onmouseover = () => okBtn.style.background = 'rgba(0,123,255,0.5)';
      okBtn.onmouseout = () => okBtn.style.background = 'rgba(0,123,255,0.3)';
      okBtn.onclick = () => {
        dialog.style.display = 'none';
        resolve(dialogInputField.value || null);
      };

      // Enter key submits
      dialogInputField.onkeydown = (e) => {
        if (e.key === 'Enter') {
          okBtn.click();
        }
      };

      dialogButtons.appendChild(cancelBtn);
      dialogButtons.appendChild(okBtn);

      dialog.style.display = 'flex';
      setTimeout(() => dialogInputField.focus(), 100);
    });
  };

  // --------------------
  // Shuffle Functions
  // --------------------
  const shuffleQuestions = async () => {
    if (!selectedQuiz || !selectedQuiz.questions || selectedQuiz.questions.length === 0) {
      await customAlert('No questions to shuffle!', 'Cannot Shuffle');
      return;
    }

    const confirmed = await customConfirm('Shuffle all questions in random order?', 'Shuffle Questions');
    if (!confirmed) return;

    selectedQuiz.questions = shuffleArray(selectedQuiz.questions);
    await saveQuiz();
    renderQuestions();
    await customAlert('Questions shuffled successfully!', 'Success');
  };

  const shuffleAllChoices = async () => {
    if (!selectedQuiz || !selectedQuiz.questions || selectedQuiz.questions.length === 0) {
      await customAlert('No questions to shuffle choices for!', 'Cannot Shuffle');
      return;
    }

    const confirmed = await customConfirm('Shuffle all answer choices for all questions?', 'Shuffle All Choices');
    if (!confirmed) return;

    selectedQuiz.questions.forEach(question => {
      const shuffled = shuffleArray(question.choices);
      // Find where the correct choice ended up after shuffle
      const correctAnswer = question.choices[question.correctChoice];
      const newCorrectIndex = shuffled.indexOf(correctAnswer);

      question.choices = shuffled;
      question.correctChoice = newCorrectIndex;
    });

    await saveQuiz();
    renderQuestions();
    await customAlert('All choices shuffled successfully!', 'Success');
  };

  const shuffleSingleQuestionChoices = (questionIndex) => {
    if (!selectedQuiz || !selectedQuiz.questions[questionIndex]) return;

    const question = selectedQuiz.questions[questionIndex];
    const shuffled = shuffleArray(question.choices);

    // Find where the correct choice ended up after shuffle
    const correctAnswer = question.choices[question.correctChoice];
    const newCorrectIndex = shuffled.indexOf(correctAnswer);

    question.choices = shuffled;
    question.correctChoice = newCorrectIndex;

    return true;
  };

  // --------------------
  // Question Reordering Functions
  // --------------------
  const moveQuestionUp = async (index) => {
    if (index <= 0) return;

    // Swap with previous question
    [selectedQuiz.questions[index - 1], selectedQuiz.questions[index]] =
    [selectedQuiz.questions[index], selectedQuiz.questions[index - 1]];

    // Update editingQuestionIndex if needed
    if (editingQuestionIndex === index) {
      editingQuestionIndex = index - 1;
    } else if (editingQuestionIndex === index - 1) {
      editingQuestionIndex = index;
    }

    await saveQuiz();
    renderQuestions();
  };

  const moveQuestionDown = async (index) => {
    if (index >= selectedQuiz.questions.length - 1) return;

    // Swap with next question
    [selectedQuiz.questions[index], selectedQuiz.questions[index + 1]] =
    [selectedQuiz.questions[index + 1], selectedQuiz.questions[index]];

    // Update editingQuestionIndex if needed
    if (editingQuestionIndex === index) {
      editingQuestionIndex = index + 1;
    } else if (editingQuestionIndex === index + 1) {
      editingQuestionIndex = index;
    }

    await saveQuiz();
    renderQuestions();
  };

  // --------------------
  // Choice Reordering Functions
  // --------------------
  const moveChoiceUp = (index) => {
    if (index <= 0) return;

    const inputs = getChoiceInputs();
    const currentValues = inputs.map(input => input.value);

    // Swap values
    [currentValues[index - 1], currentValues[index]] =
    [currentValues[index], currentValues[index - 1]];

    // Update correct answer index if needed
    const currentCorrect = parseInt(correctSelect.value);
    if (currentCorrect === index) {
      correctSelect.value = index - 1;
    } else if (currentCorrect === index - 1) {
      correctSelect.value = index;
    }

    // Re-render with swapped values
    inputs.forEach((input, i) => {
      input.value = currentValues[i];
    });
  };

  const moveChoiceDown = (index) => {
    const inputs = getChoiceInputs();
    if (index >= inputs.length - 1) return;

    const currentValues = inputs.map(input => input.value);

    // Swap values
    [currentValues[index], currentValues[index + 1]] =
    [currentValues[index + 1], currentValues[index]];

    // Update correct answer index if needed
    const currentCorrect = parseInt(correctSelect.value);
    if (currentCorrect === index) {
      correctSelect.value = index + 1;
    } else if (currentCorrect === index + 1) {
      correctSelect.value = index;
    }

    // Re-render with swapped values
    inputs.forEach((input, i) => {
      input.value = currentValues[i];
    });
  };

  // --------------------
  // Dynamic Choice Management
  // --------------------
  const renderChoiceInputs = () => {
    // Preserve existing values before clearing
    const currentValues = getChoiceInputs().map(input => input.value);

    choicesContainer.innerHTML = '';
    for (let i = 0; i < currentChoiceCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'choice-input-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '0.5rem';

      const label = document.createElement('div');
      label.className = 'choice-label';
      label.textContent = getChoiceLabel(i);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'choice-input';
      input.placeholder = `Choice ${getChoiceLabel(i)}`;
      input.dataset.choiceIndex = i;
      input.style.flex = '1';

      // Restore previous value if it existed
      if (currentValues[i]) {
        input.value = currentValues[i];
      }

      // Reorder buttons
      const reorderBtns = document.createElement('div');
      reorderBtns.style.display = 'flex';
      reorderBtns.style.flexDirection = 'column';
      reorderBtns.style.gap = '0.1rem';

      const upBtn = document.createElement('button');
      upBtn.textContent = '▲';
      upBtn.style.cssText = 'padding: 0.1rem 0.4rem; background: rgba(100,100,255,0.2); border: 1px solid rgba(100,100,255,0.5); font-size: 0.7rem; cursor: pointer;';
      upBtn.disabled = i === 0;
      if (i === 0) {
        upBtn.style.opacity = '0.3';
        upBtn.style.cursor = 'not-allowed';
      }
      upBtn.title = 'Move Up';
      upBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (i > 0) moveChoiceUp(i);
      });

      const downBtn = document.createElement('button');
      downBtn.textContent = '▼';
      downBtn.style.cssText = 'padding: 0.1rem 0.4rem; background: rgba(100,100,255,0.2); border: 1px solid rgba(100,100,255,0.5); font-size: 0.7rem; cursor: pointer;';
      downBtn.disabled = i === currentChoiceCount - 1;
      if (i === currentChoiceCount - 1) {
        downBtn.style.opacity = '0.3';
        downBtn.style.cursor = 'not-allowed';
      }
      downBtn.title = 'Move Down';
      downBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (i < currentChoiceCount - 1) moveChoiceDown(i);
      });

      reorderBtns.appendChild(upBtn);
      reorderBtns.appendChild(downBtn);

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      wrapper.appendChild(reorderBtns);
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
      const res = await fetch('/api/quizzes', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch quizzes');
      quizzes = await res.json();
      renderQuizList();
    } catch (err) {
      console.error(err);
      await customAlert('Could not load quizzes. Check console for errors.', 'Load Error');
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
      headers: getAuthHeaders(),
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
        const confirmed = await customConfirm('Are you sure you want to delete this quiz?', 'Delete Quiz');
        if (!confirmed) return;
        await fetch(`/api/quizzes/${quiz.filename}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (selectedQuiz && selectedQuiz.filename === quiz.filename) {
          selectedQuiz = null;
          questionEditor.style.display = 'none';
          shuffleControls.style.display = 'none'; // Hide shuffle controls when quiz is deleted
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
    shuffleControls.style.display = 'block'; // Show shuffle controls when quiz is selected

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

      const isFirst = idx === 0;
      const isLast = idx === selectedQuiz.questions.length - 1;

      qDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div><strong>${idx + 1}. ${q.text}</strong></div>
          <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-left: 1rem;">
            <button class="moveUpBtn" ${isFirst ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; background: rgba(100,100,255,0.2); border: 1px solid rgba(100,100,255,0.5); font-size: 0.8rem; ${isFirst ? 'opacity: 0.3; cursor: not-allowed;' : ''}" title="Move Up">▲</button>
            <button class="moveDownBtn" ${isLast ? 'disabled' : ''} style="padding: 0.2rem 0.5rem; background: rgba(100,100,255,0.2); border: 1px solid rgba(100,100,255,0.5); font-size: 0.8rem; ${isLast ? 'opacity: 0.3; cursor: not-allowed;' : ''}" title="Move Down">▼</button>
          </div>
        </div>
        <ul>
          ${q.choices.map((c, i) => `<li${q.correctChoice == i ? ' style="color:#0f0"' : ''}>${c}</li>`).join('')}
        </ul>
        <div>
          <button class="editQBtn">Edit</button>
          <button class="shuffleQBtn" style="background: rgba(255,165,0,0.2); border: 1px solid rgba(255,165,0,0.5);">🎲 Shuffle Choices</button>
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

      qDiv.querySelector('.shuffleQBtn').addEventListener('click', async () => {
        const confirmed = await customConfirm(`Shuffle answer choices for question ${idx + 1}?`, 'Shuffle Choices');
        if (!confirmed) return;

        shuffleSingleQuestionChoices(idx);
        await saveQuiz();
        renderQuestions();
        await customAlert(`Choices shuffled for question ${idx + 1}!`, 'Success');
      });

      // Move up/down buttons
      qDiv.querySelector('.moveUpBtn').addEventListener('click', () => {
        if (!isFirst) moveQuestionUp(idx);
      });

      qDiv.querySelector('.moveDownBtn').addEventListener('click', () => {
        if (!isLast) moveQuestionDown(idx);
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
    const title = await customPrompt('Enter new quiz title:', 'Create Quiz');
    if (!title) return;
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description: '', questions: [] })
    });
    const newQuiz = await res.json();
    await fetchQuizzes();
    selectQuiz(newQuiz);
  });

  // Shuffle button event listeners
  shuffleQuestionsBtn.addEventListener('click', shuffleQuestions);
  shuffleAllChoicesBtn.addEventListener('click', shuffleAllChoices);

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
    if (!selectedQuiz) {
      await customAlert('Select a quiz first', 'No Quiz Selected');
      return;
    }

    const text = questionTextInput.value.trim();
    const choices = getChoiceInputs().map(i => i.value.trim());
    const correctChoice = parseInt(correctSelect.value);

    if (!text || choices.some(c => !c)) {
      await customAlert('Fill in all fields', 'Missing Information');
      return;
    }

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
    const res = await fetch('/api/sessions', {
      headers: getAuthHeaders()
    });
    const sessions = await res.json();
    renderSessions(sessions);
  };

  // Helper function to format session status
  const formatStatus = (status) => {
    const statusMap = {
      'in_progress': { text: 'In Progress', icon: '⏸️', color: '#4fc3f7' },
      'completed': { text: 'Completed', icon: '✅', color: '#0f0' },
      'interrupted': { text: 'Interrupted', icon: '⚠️', color: '#ff0' }
    };
    return statusMap[status] || { text: status, icon: '●', color: '#aaa' };
  };

  const renderSessions = (sessions) => {
    if (!sessions.length) {
      sessionsListContainer.innerHTML = '<em style="color: #aaa;">No completed sessions yet</em>';
      return;
    }

    sessionsListContainer.innerHTML = sessions.map(session => {
      // For resumed sessions, show the resumed_at timestamp; otherwise show created_at
      const isResumed = session.original_session_id !== null;
      const displayDate = new Date(isResumed ? session.resumed_at : session.created_at).toLocaleString();
      const dateLabel = isResumed ? 'Resumed' : 'Started';
      const statusInfo = formatStatus(session.status);

      return `
        <div class="quizCard" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${session.quiz_title}</strong> - Room: ${session.room_code}
            ${isResumed ? '<span style="color: #ff9800; font-size: 0.85rem; margin-left: 0.5rem;">🔄 Resumed</span>' : ''}
            <div style="font-size: 0.9rem; color: #aaa;">
              ${dateLabel}: ${displayDate} | Players: ${session.player_count} | Questions: ${session.question_count}
              <span style="color: ${statusInfo.color}; margin-left: 1rem;">${statusInfo.icon} ${statusInfo.text}</span>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="viewSession('${session.session_id}')" style="background: rgba(0,123,255,0.3);">View Details</button>
            <button onclick="deleteSession('${session.session_id}')" style="background: rgba(255,0,0,0.3);">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  };

  // --------------------
  // View session details (modal)
  // --------------------
  window.viewSession = async (sessionId) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      headers: getAuthHeaders()
    });
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

    const statusInfo = formatStatus(session.status);

    modalContent.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <p><strong>Status:</strong> <span style="color: ${statusInfo.color};">${statusInfo.icon} ${statusInfo.text}</span></p>
        <p><strong>Started:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
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
  window.deleteSession = async (sessionId) => {
    const confirmed = await customConfirm('Delete this session permanently?', 'Delete Session');
    if (!confirmed) return;
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
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

  window.saveQuizOptions = async () => {
    const timeout = document.getElementById('answerDisplayTime').value;
    const msg = document.getElementById('optionsSaveMsg');

    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answerDisplayTime: parseInt(timeout) })
      });

      if (!res.ok) throw new Error('Failed to save options');

      msg.textContent = 'Options saved successfully!';
      msg.style.display = 'block';
      msg.style.background = 'rgba(0,255,0,0.2)';
      msg.style.color = '#0f0';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    } catch (err) {
      msg.textContent = 'Error: ' + err.message;
      msg.style.display = 'block';
      msg.style.background = 'rgba(255,0,0,0.2)';
      msg.style.color = '#f00';
    }
  };

  window.loadOptions = async () => {
    try {
      const res = await fetch('/api/options', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load options');
      const options = await res.json();
      document.getElementById('answerDisplayTime').value = options.answerDisplayTime || 30;
    } catch (err) {
      console.error('Failed to load quiz options:', err);
      document.getElementById('answerDisplayTime').value = 30; // fallback to default
    }
  };

  // --------------------
  // User Management
  // --------------------
  const usersListContainer = document.getElementById('usersList');
  const userCountDisplay = document.getElementById('userCount');
  const refreshUsersBtn = document.getElementById('refreshUsersBtn');

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load users');
      const users = await res.json();
      renderUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      usersListContainer.innerHTML = '<em style="color: #f66;">Failed to load users. Please try again.</em>';
      userCountDisplay.textContent = 'Error loading users';
    }
  };

  const renderUsers = (users) => {
    if (!users.length) {
      usersListContainer.innerHTML = '<em style="color: #aaa;">No users found</em>';
      userCountDisplay.textContent = 'Total: 0 users';
      return;
    }

    // Count by account type
    const guestCount = users.filter(u => u.accountType === 'guest').length;
    const playerCount = users.filter(u => u.accountType === 'player').length;
    userCountDisplay.textContent = `Total: ${users.length} users (${guestCount} guests, ${playerCount} registered)`;

    usersListContainer.innerHTML = users.map(user => {
      const accountTypeColor = user.accountType === 'player' ? '#4fc3f7' : '#aaa';
      const accountTypeIcon = user.accountType === 'player' ? '✓' : '👤';
      const createdDate = new Date(user.createdAt).toLocaleString();
      const lastSeenDate = user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never';

      // Action buttons based on account type
      const resetPasswordBtn = user.accountType === 'player'
        ? `<button onclick="resetPassword('${user.id}', '${user.username}')" style="background: rgba(76,175,80,0.3); padding: 0.5rem 1rem; margin-right: 0.5rem;">🔑 Reset Password</button>`
        : '';

      const downgradeBtn = user.accountType === 'player'
        ? `<button onclick="downgradeUser('${user.id}', '${user.username}')" style="background: rgba(255,165,0,0.3); padding: 0.5rem 1rem; margin-right: 0.5rem;">⬇️ Downgrade to Guest</button>`
        : '';

      return `
        <div class="quizCard" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
              <strong style="font-size: 1.1rem;">${user.username}</strong>
              <span style="color: ${accountTypeColor}; font-size: 0.9rem;">
                ${accountTypeIcon} ${user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1)}
              </span>
            </div>
            <div style="font-size: 0.85rem; color: #aaa; display: flex; flex-wrap: wrap; gap: 1rem;">
              <span>📅 Created: ${createdDate}</span>
              <span>🎮 Games Played: ${user.gamesPlayed}</span>
              <span>👁️ Last Seen: ${lastSeenDate}</span>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
            ${resetPasswordBtn}
            ${downgradeBtn}
            <button onclick="deleteUser('${user.id}', '${user.username}')" style="background: rgba(255,0,0,0.3); padding: 0.5rem 1rem;">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');
  };

  // Delete user function
  window.deleteUser = async (userId, username) => {
    const confirmed = confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone and will remove:\n- The user account\n- All game participation records\n- All associated data`);

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Failed to delete user: ' + (data.error || 'Unknown error'));
        return;
      }

      alert(`User "${username}" has been deleted successfully.`);
      loadUsers(); // Reload the user list
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  // Downgrade user function (player -> guest)
  window.downgradeUser = async (userId, username) => {
    const confirmed = confirm(`Are you sure you want to downgrade "${username}" to a guest account?\n\nThis will:\n- Remove their password\n- Change their account type to Guest\n- Keep their game history`);

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${userId}/downgrade`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Failed to downgrade user: ' + (data.error || 'Unknown error'));
        return;
      }

      alert(`User "${username}" has been downgraded to guest account.`);
      loadUsers(); // Reload the user list
    } catch (err) {
      console.error('Failed to downgrade user:', err);
      alert('Failed to downgrade user. Please try again.');
    }
  };

  // Reset password function (for registered players)
  window.resetPassword = async (userId, username) => {
    const confirmed = confirm(`Are you sure you want to reset the password for "${username}"?\n\nThis will:\n- Delete their current password\n- Log them out from all devices\n- Prompt them to set a new password on next login\n\nThis action cannot be undone.`);

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Failed to reset password: ' + (data.error || 'Unknown error'));
        return;
      }

      const data = await res.json();
      alert(`Password reset successfully for "${username}".\n\n${data.message}`);
      loadUsers(); // Reload the user list
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert('Failed to reset password. Please try again.');
    }
  };

  // Refresh users button
  if (refreshUsersBtn) {
    refreshUsersBtn.addEventListener('click', loadUsers);
  }

  // Make loadUsers globally available for tab switching
  window.loadUsers = loadUsers;

  // --------------------
  // Logout Functionality
  // --------------------
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const token = localStorage.getItem('triviaAuthToken');
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Logout error:', err);
        }
      }

      localStorage.removeItem('triviaAuthToken');
      window.location.href = 'landing.html';
    });
  }
});
