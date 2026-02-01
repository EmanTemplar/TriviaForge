<template>
  <aside class="questions-sidebar">
    <div class="questions-list-header">
      <h2>Questions</h2>
      <div v-if="selectedQuiz" class="shuffle-controls">
        <button @click="$emit('shuffleQuestions')" class="btn-shuffle" title="Shuffle Questions"><AppIcon name="shuffle" size="md" /></button>
        <button @click="$emit('shuffleAllChoices')" class="btn-shuffle" title="Shuffle All Choices"><AppIcon name="dices" size="md" /></button>
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
            <button @click.stop="$emit('moveQuestionToFirst', idx)" class="btn-reorder" :disabled="idx === 0" title="Move to First"><AppIcon name="chevrons-up" size="sm" /></button>
            <button @click.stop="$emit('moveQuestionUp', idx)" class="btn-reorder" :disabled="idx === 0" title="Move Up"><AppIcon name="chevron-up" size="sm" /></button>
            <button @click.stop="$emit('moveQuestionDown', idx)" class="btn-reorder" :disabled="idx === questions.length - 1" title="Move Down"><AppIcon name="chevron-down" size="sm" /></button>
            <button @click.stop="$emit('moveQuestionToLast', idx)" class="btn-reorder" :disabled="idx === questions.length - 1" title="Move to Last"><AppIcon name="chevrons-down" size="sm" /></button>
          </div>
          <button @click.stop="$emit('deleteQuestion', idx)" class="btn-delete" title="Delete"><AppIcon name="trash-2" size="sm" /></button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue';

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
  min-height: 0;
  height: 100%;
}

.questions-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

h2 {
  margin: 0;
  color: var(--info-light);
  font-size: 1.2rem;
}

.shuffle-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-shuffle {
  padding: 0.5rem 0.75rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  color: var(--info-light);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-shuffle:hover {
  background: var(--info-bg-40);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.question-item {
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  overflow: hidden;
  min-height: 80px;
  flex-shrink: 0;
}

.question-item:hover {
  background: var(--bg-overlay-30);
  border-color: var(--info-light);
}

.question-item.active {
  background: var(--info-bg-20);
  border-color: var(--info-light);
}

.question-item.dragging {
  opacity: 0.5;
  background: var(--info-bg-10);
}

.question-item.drag-over {
  border: 2px dashed var(--warning-light);
  background: var(--warning-bg-10);
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
  color: var(--info-light);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.question-preview {
  color: var(--text-secondary);
  font-size: 0.9rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  max-height: 2.8em;
}

.question-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary-40);
  border-top: 1px solid var(--border-color);
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
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.btn-reorder:hover:not(:disabled) {
  background: var(--info-bg-40);
}

.btn-reorder:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-delete {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

.btn-delete:hover {
  background: var(--danger-bg-40);
}

@media (max-width: 1024px) {
  .questions-sidebar {
    border-top: 1px solid var(--border-color);
  }

  .reorder-buttons {
    flex-wrap: wrap;
  }
}
</style>
