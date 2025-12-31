<template>
  <section class="question-editor-panel" @mousedown.stop="$emit('startResize', 2, $event)">
    <div class="editor-header">
      <h2>Question Editor</h2>
      <button @click="$emit('clearForm')" class="btn-new-question" title="Start new question">+ New Question</button>
    </div>
    <textarea
      :value="questionText"
      @input="$emit('update:questionText', $event.target.value)"
      placeholder="Question Text"
      class="question-text-input"
      rows="3"
    ></textarea>

    <div class="choices-header">
      <h3>Choices</h3>
      <div class="choice-buttons">
        <button @click="$emit('addChoice')" class="btn-add">+ Add</button>
        <button @click="$emit('removeChoice')" class="btn-remove">- Remove</button>
      </div>
    </div>

    <div class="choices-container">
      <div
        v-for="(choice, idx) in choices"
        :key="idx"
        class="choice-input-wrapper"
        :class="{
          'dragging': draggedChoiceIdx === idx,
          'drag-over': dragOverChoiceIdx === idx
        }"
        @dragover="handleChoiceDragOver($event, idx)"
        @dragleave="handleChoiceDragLeave"
        @drop="handleChoiceDrop($event, idx)"
        @dragend="handleChoiceDragEnd"
      >
        <span
          class="choice-label draggable"
          draggable="true"
          @dragstart="handleChoiceDragStart(idx)"
          :title="`Drag to reorder choice ${String.fromCharCode(65 + idx)}`"
        >
          {{ String.fromCharCode(65 + idx) }}
        </span>
        <input
          :value="choice"
          @input="$emit('updateChoice', idx, $event.target.value)"
          type="text"
          :placeholder="`Choice ${idx + 1}`"
        />
      </div>
    </div>

    <div class="correct-choice-wrapper">
      <label for="correctChoice">Correct Answer:</label>
      <select
        :value="correctChoice"
        @change="$emit('update:correctChoice', Number($event.target.value))"
      >
        <option v-for="(choice, idx) in choices" :key="idx" :value="idx">
          {{ choice || `Choice ${idx + 1}` }}
        </option>
      </select>
    </div>

    <div class="question-editor-buttons">
      <button @click="$emit('saveQuestion')" class="btn-primary">{{ editingQuestionIdx !== null ? 'Update' : 'Add' }}</button>
      <button v-if="editingQuestionIdx !== null" @click="$emit('clearForm')" class="btn-secondary">Cancel</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  questionText: { type: String, required: true },
  choices: { type: Array, required: true },
  correctChoice: { type: Number, required: true },
  editingQuestionIdx: { type: [Number, null], default: null },
  draggedChoiceIdx: { type: [Number, null], default: null },
  dragOverChoiceIdx: { type: [Number, null], default: null }
});

const emit = defineEmits([
  'update:questionText',
  'update:correctChoice',
  'updateChoice',
  'addChoice',
  'removeChoice',
  'saveQuestion',
  'clearForm',
  'startResize',
  'choiceDragStart',
  'choiceDragOver',
  'choiceDragLeave',
  'choiceDrop',
  'choiceDragEnd'
]);

const handleChoiceDragStart = (idx) => {
  emit('choiceDragStart', idx);
};

const handleChoiceDragOver = (event, idx) => {
  event.preventDefault();
  emit('choiceDragOver', event, idx);
};

const handleChoiceDragLeave = () => {
  emit('choiceDragLeave');
};

const handleChoiceDrop = (event, dropIdx) => {
  event.preventDefault();
  emit('choiceDrop', event, dropIdx);
};

const handleChoiceDragEnd = () => {
  emit('choiceDragEnd');
};
</script>

<style scoped>
.question-editor-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  color: var(--info-light);
  font-size: 1.2rem;
}

.btn-new-question {
  padding: 0.5rem 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  color: var(--info-light);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-new-question:hover {
  background: var(--info-bg-40);
}

.question-text-input {
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
}

.choices-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.choices-header h3 {
  margin: 0;
  color: var(--info-light);
  font-size: 1rem;
}

.choice-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-add,
.btn-remove {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-add {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.btn-add:hover {
  background: var(--secondary-bg-40);
}

.btn-remove {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

.btn-remove:hover {
  background: var(--danger-bg-40);
}

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.choice-input-wrapper.dragging {
  opacity: 0.5;
  background: var(--info-bg-20);
}

.choice-input-wrapper.drag-over {
  border: 2px dashed var(--warning-light);
  background: var(--warning-bg-20);
  border-radius: 4px;
}

.choice-label {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 6px;
  color: var(--info-light);
  font-weight: bold;
  flex-shrink: 0;
}

.choice-label.draggable {
  cursor: grab;
}

.choice-label.draggable:active {
  cursor: grabbing;
}

.choice-input-wrapper input {
  flex: 1;
  padding: 0.5rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.correct-choice-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.correct-choice-wrapper label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.correct-choice-wrapper select {
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.question-editor-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  flex: 1;
  background: var(--primary-bg-40);
  border: 1px solid var(--primary-light);
  color: var(--info-light);
}

.btn-primary:hover {
  background: var(--primary-bg-60);
}

.btn-secondary {
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-overlay-30);
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .question-editor-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
