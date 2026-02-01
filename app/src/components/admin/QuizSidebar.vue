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
        <div class="quiz-name">{{ quiz.title }}</div>
        <div class="quiz-count">{{ quiz.questionCount || 0 }} questions</div>
        <button @click.stop="$emit('deleteQuiz', quiz.filename)" class="btn-delete">Delete</button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps({
  quizTitle: { type: String, required: true },
  quizDescription: { type: String, required: true },
  quizzes: { type: Array, required: true },
  importStatus: { type: String, default: '' }
});

const emit = defineEmits(['update:quizTitle', 'update:quizDescription', 'createQuiz', 'downloadTemplate', 'excelUpload', 'selectQuiz', 'deleteQuiz', 'startResize']);

const excelFileInput = ref(null);

const handleFileChange = (event) => {
  emit('excelUpload', event);
};
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
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-item:hover {
  background: var(--bg-overlay-30);
  border-color: var(--info-light);
}

.quiz-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.quiz-count {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.btn-delete {
  padding: 0.4rem 0.6rem;
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  border-radius: 4px;
  color: var(--danger-light);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
  align-self: flex-start;
}

.btn-delete:hover {
  background: var(--danger-bg-40);
}

@media (max-width: 1024px) {
  .quiz-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
