<template>
  <aside class="quiz-sidebar" @mousedown.stop="$emit('startResize', 1, $event)">
    <h2>Create / Select Quiz</h2>
    <button class="btn-primary" @click="$emit('createQuiz')">Create New Quiz</button>

    <!-- Excel Import/Export -->
    <div class="excel-import-box">
      <h3>Import from Excel</h3>
      <p>Upload an Excel file to create a quiz</p>
      <button class="btn-download" @click="$emit('downloadTemplate')">📥 Download Template</button>
      <input
        ref="excelFileInput"
        type="file"
        accept=".xlsx,.xls"
        style="display: none"
        @change="handleFileChange"
      />
      <button class="btn-upload" @click="$refs.excelFileInput.click()">📤 Upload Excel File</button>
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
  background: rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 280px;
  flex-shrink: 0;
  overflow-y: auto;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: #4fc3f7;
  font-size: 1.2rem;
}

.btn-primary {
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.excel-import-box {
  background: rgba(79, 195, 247, 0.05);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.excel-import-box h3 {
  margin: 0;
  color: #4fc3f7;
  font-size: 1rem;
}

.excel-import-box p {
  margin: 0;
  color: #aaa;
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
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}

.btn-download:hover {
  background: rgba(79, 195, 247, 0.3);
}

.btn-upload {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.btn-upload:hover {
  background: rgba(76, 175, 80, 0.3);
}

.import-status {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 0.85rem;
  color: #aaa;
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-form input,
.quiz-form textarea {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
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
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.quiz-item {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(79, 195, 247, 0.3);
}

.quiz-name {
  font-weight: 500;
  color: #fff;
  font-size: 0.95rem;
}

.quiz-count {
  color: #aaa;
  font-size: 0.8rem;
}

.btn-delete {
  padding: 0.4rem 0.6rem;
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.3);
  border-radius: 4px;
  color: #f66;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
  align-self: flex-start;
}

.btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
}

@media (max-width: 1024px) {
  .quiz-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
