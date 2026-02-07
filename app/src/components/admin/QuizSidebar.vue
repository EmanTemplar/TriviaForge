<template>
  <aside class="quiz-sidebar" @mousedown.stop="$emit('startResize', 1, $event)">
    <h2>Create / Select Quiz</h2>
    <button class="btn-primary" @click="$emit('createQuiz')">Create New Quiz</button>

    <!-- Excel Import/Export -->
    <div class="excel-import-box">
      <h3>Import from Excel</h3>
      <p>Upload an Excel file to create a quiz</p>
      <button class="btn-download" @click="$emit('downloadTemplate')"><AppIcon name="download" size="sm" /> Download Template</button>
      <input
        ref="excelFileInput"
        type="file"
        accept=".xlsx,.xls"
        style="display: none"
        @change="handleFileChange"
      />
      <button class="btn-upload" @click="$refs.excelFileInput.click()"><AppIcon name="upload" size="sm" /> Upload Excel File</button>
      <div v-if="importStatus" class="import-status">{{ importStatus }}</div>
    </div>

    <div class="quiz-form">
      <input
        :value="quizTitle"
        @input="$emit('update:quizTitle', $event.target.value)"
        type="text"
        placeholder="Quiz Title"
      />
      <textarea
        :value="quizDescription"
        @input="$emit('update:quizDescription', $event.target.value)"
        placeholder="Quiz Description"
      ></textarea>
    </div>

    <div class="quiz-list">
      <div v-if="quizzes.length === 0" class="empty-state"><em>No quizzes</em></div>
      <div v-for="quiz in quizzes" :key="quiz.filename" class="quiz-item" @click="$emit('selectQuiz', quiz)">
        <div class="quiz-info">
          <div class="quiz-name">{{ quiz.title }}</div>
          <div class="quiz-meta">
            <span class="quiz-count">{{ quiz.questionCount || 0 }} questions</span>
            <span class="quiz-badges">
              <span v-if="quiz.availableLive !== false" class="badge badge-live" title="Available for Live Games">Live</span>
              <span v-if="quiz.availableSolo !== false" class="badge badge-solo" title="Available for Solo Play">Solo</span>
            </span>
          </div>
        </div>
        <div class="quiz-menu-container" @click.stop>
          <button class="btn-menu" @click="toggleMenu(quiz.filename)">
            <AppIcon name="more-vertical" size="sm" />
          </button>
          <div v-if="openMenuId === quiz.filename" class="quiz-dropdown-menu">
            <button class="menu-item" @click="toggleAvailability(quiz, 'live')">
              <AppIcon :name="quiz.availableLive !== false ? 'check-square' : 'square'" size="sm" />
              <span>Available for Live</span>
            </button>
            <button class="menu-item" @click="toggleAvailability(quiz, 'solo')">
              <AppIcon :name="quiz.availableSolo !== false ? 'check-square' : 'square'" size="sm" />
              <span>Available for Solo</span>
            </button>
            <hr class="menu-divider" />
            <button class="menu-item menu-item-danger" @click="handleDelete(quiz.filename)">
              <AppIcon name="trash-2" size="sm" />
              <span>Delete Quiz</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps({
  quizTitle: { type: String, required: true },
  quizDescription: { type: String, required: true },
  quizzes: { type: Array, required: true },
  importStatus: { type: String, default: '' }
});

const emit = defineEmits(['update:quizTitle', 'update:quizDescription', 'createQuiz', 'downloadTemplate', 'excelUpload', 'selectQuiz', 'deleteQuiz', 'toggleAvailability', 'startResize']);

const excelFileInput = ref(null);
const openMenuId = ref(null);

const handleFileChange = (event) => {
  emit('excelUpload', event);
};

const toggleMenu = (quizId) => {
  openMenuId.value = openMenuId.value === quizId ? null : quizId;
};

const closeMenu = () => {
  openMenuId.value = null;
};

const toggleAvailability = (quiz, type) => {
  emit('toggleAvailability', { quiz, type });
  closeMenu();
};

const handleDelete = (filename) => {
  emit('deleteQuiz', filename);
  closeMenu();
};

// Close menu when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.quiz-menu-container')) {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.quiz-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: var(--info-light);
  font-size: 1.2rem;
}

.btn-primary {
  padding: 0.75rem;
  background: var(--primary-bg-40);
  border: 1px solid var(--primary-light);
  border-radius: 8px;
  color: var(--info-light);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-bg-60);
}

.excel-import-box {
  background: var(--info-bg-10);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.excel-import-box h3 {
  margin: 0;
  color: var(--info-light);
  font-size: 1rem;
}

.excel-import-box p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.btn-download,
.btn-upload {
  padding: 0.6rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-download {
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.btn-download:hover {
  background: var(--info-bg-40);
}

.btn-upload {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.btn-upload:hover {
  background: var(--secondary-bg-40);
}

.import-status {
  padding: 0.5rem;
  background: var(--bg-overlay-10);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-form input,
.quiz-form textarea {
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: vertical;
}

.quiz-form textarea {
  min-height: 80px;
}

.quiz-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.quiz-item {
  padding: 0.75rem;
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.quiz-item:hover {
  background: var(--bg-overlay-30);
  border-color: var(--info-light);
}

.quiz-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.quiz-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quiz-count {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.quiz-badges {
  display: flex;
  gap: 0.25rem;
}

.badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-live {
  background: var(--secondary-bg-30);
  color: var(--secondary-light);
}

.badge-solo {
  background: var(--primary-bg-30);
  color: var(--primary-light);
}

/* Quiz Menu */
.quiz-menu-container {
  position: relative;
  flex-shrink: 0;
}

.btn-menu {
  padding: 0.3rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-menu:hover {
  background: var(--bg-overlay-20);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.quiz-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 180px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  padding: 0.25rem 0;
  margin-top: 0.25rem;
}

.menu-item {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  text-align: left;
  transition: background 0.15s;
}

.menu-item:hover {
  background: var(--bg-overlay-20);
}

.menu-item-danger {
  color: var(--danger-light);
}

.menu-item-danger:hover {
  background: var(--danger-bg-20);
}

.menu-divider {
  margin: 0.25rem 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 1024px) {
  .quiz-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
