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
  background: rgba(255, 255, 255, 0.05);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 450px;
  flex-shrink: 0;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  color: #4fc3f7;
  font-size: 1.2rem;
}

.btn-new-question {
  padding: 0.5rem 1rem;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  color: #4fc3f7;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-new-question:hover {
  background: rgba(79, 195, 247, 0.3);
}

.question-text-input {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
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
  color: #4fc3f7;
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
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.btn-add:hover {
  background: rgba(76, 175, 80, 0.3);
}

.btn-remove {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #ef5350;
}

.btn-remove:hover {
  background: rgba(244, 67, 54, 0.3);
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s;
}

.choice-input-wrapper.dragging {
  opacity: 0.5;
  background: rgba(79, 195, 247, 0.1);
}

.choice-input-wrapper.drag-over {
  border-color: rgba(79, 195, 247, 0.5);
  background: rgba(79, 195, 247, 0.1);
}

.choice-label {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.3);
  border-radius: 6px;
  color: #4fc3f7;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #fff;
  font-size: 0.95rem;
}

.correct-choice-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.correct-choice-wrapper label {
  color: #aaa;
  font-size: 0.9rem;
  font-weight: 500;
}

.correct-choice-wrapper select {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #fff;
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
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  color: #4fc3f7;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

@media (max-width: 1024px) {
  .question-editor-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
