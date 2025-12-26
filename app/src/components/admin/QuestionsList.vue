<template>
  <aside class="questions-sidebar">
    <div class="questions-list-header">
      <h2>Questions</h2>
      <div v-if="selectedQuiz" class="shuffle-controls">
        <button @click="$emit('shuffleQuestions')" class="btn-shuffle" title="Shuffle Questions">🔀</button>
        <button @click="$emit('shuffleAllChoices')" class="btn-shuffle" title="Shuffle All Choices">🎲</button>
      </div>
    </div>
    <div class="questions-list">
      <div v-if="questions.length === 0" class="empty-state"><em>No questions</em></div>
      <div
        v-for="(question, idx) in questions"
        :key="idx"
        class="question-item"
        :class="{
          active: editingQuestionIdx === idx,
          dragging: draggedQuestionIdx === idx,
          'drag-over': dragOverIdx === idx
        }"
        draggable="true"
        @dragstart="handleDragStart(idx)"
        @dragover="handleDragOver($event, idx)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, idx)"
        @dragend="handleDragEnd"
      >
        <div class="question-content" @click="$emit('editQuestion', idx)">
          <div class="question-text">Q{{ idx + 1 }}</div>
          <div class="question-preview">{{ question.text }}</div>
        </div>
        <div class="question-actions">
          <div class="reorder-buttons">
            <button @click.stop="$emit('moveQuestionToFirst', idx)" class="btn-reorder" :disabled="idx === 0" title="Move to First">⇈</button>
            <button @click.stop="$emit('moveQuestionUp', idx)" class="btn-reorder" :disabled="idx === 0" title="Move Up">↑</button>
            <button @click.stop="$emit('moveQuestionDown', idx)" class="btn-reorder" :disabled="idx === questions.length - 1" title="Move Down">↓</button>
            <button @click.stop="$emit('moveQuestionToLast', idx)" class="btn-reorder" :disabled="idx === questions.length - 1" title="Move to Last">⇊</button>
          </div>
          <button @click.stop="$emit('deleteQuestion', idx)" class="btn-delete" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  questions: { type: Array, required: true },
  selectedQuiz: { type: Object, default: null },
  editingQuestionIdx: { type: [Number, null], default: null },
  draggedQuestionIdx: { type: [Number, null], default: null },
  dragOverIdx: { type: [Number, null], default: null }
});

const emit = defineEmits([
  'shuffleQuestions',
  'shuffleAllChoices',
  'editQuestion',
  'moveQuestionUp',
  'moveQuestionDown',
  'moveQuestionToFirst',
  'moveQuestionToLast',
  'deleteQuestion',
  'questionDragStart',
  'questionDragOver',
  'questionDragLeave',
  'questionDrop',
  'questionDragEnd'
]);

const handleDragStart = (idx) => {
  emit('questionDragStart', idx);
};

const handleDragOver = (event, idx) => {
  event.preventDefault();
  emit('questionDragOver', event, idx);
};

const handleDragLeave = () => {
  emit('questionDragLeave');
};

const handleDrop = (event, dropIdx) => {
  event.preventDefault();
  emit('questionDrop', event, dropIdx);
};

const handleDragEnd = () => {
  emit('questionDragEnd');
};
</script>

<style scoped>
.questions-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  min-height: 0;
}

.questions-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  color: #4fc3f7;
  font-size: 1.2rem;
}

.shuffle-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-shuffle {
  padding: 0.5rem 0.75rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  color: #4fc3f7;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-shuffle:hover {
  background: rgba(79, 195, 247, 0.3);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.question-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  overflow: hidden;
}

.question-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(79, 195, 247, 0.3);
}

.question-item.active {
  background: rgba(79, 195, 247, 0.15);
  border-color: rgba(79, 195, 247, 0.5);
}

.question-item.dragging {
  opacity: 0.5;
  background: rgba(79, 195, 247, 0.1);
}

.question-item.drag-over {
  border: 2px dashed rgba(255, 193, 7, 0.8);
  background: rgba(255, 193, 7, 0.1);
}

.question-content {
  padding: 1rem;
  cursor: pointer;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.question-text {
  font-weight: bold;
  color: #4fc3f7;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.question-preview {
  color: #ccc;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reorder-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-reorder,
.btn-delete {
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.btn-reorder {
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}

.btn-reorder:hover:not(:disabled) {
  background: rgba(79, 195, 247, 0.3);
}

.btn-reorder:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-delete {
  background: rgba(200, 0, 0, 0.2);
  border: 1px solid rgba(200, 0, 0, 0.3);
  color: #f66;
}

.btn-delete:hover {
  background: rgba(200, 0, 0, 0.3);
}

@media (max-width: 1024px) {
  .questions-sidebar {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .reorder-buttons {
    flex-wrap: wrap;
  }
}
</style>
