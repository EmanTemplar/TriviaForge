<template>
  <section class="question-editor-panel" @mousedown.stop="$emit('startResize', 2, $event)">
    <div class="editor-header">
      <h2>Question Editor</h2>
      <button @click="$emit('clearForm')" class="btn-new-question" title="Start new question">+ New Question</button>
    </div>

    <div class="question-type-wrapper">
      <label for="questionType">Question Type:</label>
      <select
        :value="questionType"
        @change="handleTypeChange($event.target.value)"
        id="questionType"
      >
        <option value="multiple_choice">Multiple Choice</option>
        <option value="true_false">True / False</option>
      </select>
    </div>

    <textarea
      :value="questionText"
      @input="$emit('update:questionText', $event.target.value)"
      placeholder="Question Text"
      class="question-text-input"
      rows="3"
    ></textarea>

    <!-- Question Image Section -->
    <div class="image-section">
      <div class="image-header">
        <h3>Question Image (Optional)</h3>
        <div class="image-type-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: imageType === 'upload' || !imageType }"
            @click="$emit('update:imageType', 'upload')"
          >
            Upload
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: imageType === 'url' }"
            @click="$emit('update:imageType', 'url')"
          >
            URL
          </button>
        </div>
      </div>

      <!-- Upload Mode -->
      <div v-if="imageType !== 'url'" class="image-upload-wrapper">
        <input
          type="file"
          ref="imageInput"
          accept="image/jpeg,image/png,image/gif,image/webp"
          @change="handleFileSelect"
          class="file-input"
        />
        <button type="button" class="btn-upload" @click="triggerFileInput">
          Choose Image
        </button>
        <span class="file-hint">JPG, PNG, GIF, WebP (max 5MB)</span>
      </div>

      <!-- URL Mode -->
      <div v-else class="image-url-wrapper">
        <input
          type="url"
          :value="imageUrl"
          @input="$emit('update:imageUrl', $event.target.value)"
          placeholder="https://example.com/image.jpg"
          class="url-input"
        />
      </div>

      <!-- Image Preview -->
      <div v-if="imageUrl" class="image-preview">
        <img v-if="!imageLoadError" :src="imageUrl" alt="Question image preview" @error="handleImageError" @load="handleImageLoad" />
        <div v-else class="image-error">
          <span class="error-icon">⚠️</span>
          <span class="error-text">Image failed to load</span>
          <span class="error-url">{{ imageUrl }}</span>
        </div>
        <button type="button" class="btn-remove-image" @click="clearImage" title="Remove image">
          &times;
        </button>
      </div>
    </div>

    <div class="choices-header">
      <h3>Choices</h3>
      <div class="choice-buttons" v-if="questionType !== 'true_false'">
        <button @click="$emit('addChoice')" class="btn-add">+ Add</button>
        <button @click="$emit('removeChoice')" class="btn-remove">- Remove</button>
      </div>
      <span v-else class="true-false-hint">Fixed choices for True/False</span>
    </div>

    <div class="choices-container">
      <div
        v-for="(choice, idx) in choices"
        :key="idx"
        class="choice-input-wrapper"
        :class="{
          'dragging': draggedChoiceIdx === idx && questionType !== 'true_false',
          'drag-over': dragOverChoiceIdx === idx && questionType !== 'true_false',
          'true-false-choice': questionType === 'true_false',
          'true-choice': questionType === 'true_false' && idx === 0,
          'false-choice': questionType === 'true_false' && idx === 1
        }"
        @dragover="questionType !== 'true_false' && handleChoiceDragOver($event, idx)"
        @dragleave="questionType !== 'true_false' && handleChoiceDragLeave"
        @drop="questionType !== 'true_false' && handleChoiceDrop($event, idx)"
        @dragend="questionType !== 'true_false' && handleChoiceDragEnd"
      >
        <span
          class="choice-label"
          :class="{ 'draggable': questionType !== 'true_false' }"
          :draggable="questionType !== 'true_false'"
          @dragstart="questionType !== 'true_false' && handleChoiceDragStart(idx)"
          :title="questionType !== 'true_false' ? `Drag to reorder choice ${String.fromCharCode(65 + idx)}` : ''"
        >
          {{ String.fromCharCode(65 + idx) }}
        </span>
        <input
          :value="choice"
          @input="$emit('updateChoice', idx, $event.target.value)"
          type="text"
          :placeholder="`Choice ${idx + 1}`"
          :readonly="questionType === 'true_false'"
          :class="{ 'readonly': questionType === 'true_false' }"
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
import { ref, watch, toRef } from 'vue';

const props = defineProps({
  questionText: { type: String, required: true },
  choices: { type: Array, required: true },
  correctChoice: { type: Number, required: true },
  questionType: { type: String, default: 'multiple_choice' },
  imageUrl: { type: String, default: null },
  imageType: { type: String, default: null },
  editingQuestionIdx: { type: [Number, null], default: null },
  draggedChoiceIdx: { type: [Number, null], default: null },
  dragOverChoiceIdx: { type: [Number, null], default: null }
});

const emit = defineEmits([
  'update:questionText',
  'update:correctChoice',
  'update:questionType',
  'update:imageUrl',
  'update:imageType',
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
  'choiceDragEnd',
  'setChoicesForType',
  'uploadImage'
]);

// Image handling
const imageInput = ref(null);
const imageLoadError = ref(false);

// Reset error state when imageUrl changes
watch(() => props.imageUrl, () => {
  imageLoadError.value = false;
});

const triggerFileInput = () => {
  imageInput.value?.click();
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    emit('uploadImage', file);
  }
};

const clearImage = () => {
  emit('update:imageUrl', null);
  emit('update:imageType', null);
  imageLoadError.value = false;
  if (imageInput.value) {
    imageInput.value.value = '';
  }
};

const handleImageError = () => {
  imageLoadError.value = true;
};

const handleImageLoad = () => {
  imageLoadError.value = false;
};

// Handle question type change
const handleTypeChange = (newType) => {
  emit('update:questionType', newType);
  emit('setChoicesForType', newType);
};

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

.question-type-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question-type-wrapper label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.question-type-wrapper select {
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
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

.true-false-hint {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  font-style: italic;
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

.choice-input-wrapper input.readonly {
  background: var(--bg-overlay-20);
  cursor: not-allowed;
  opacity: 0.8;
}

/* True/False specific styling */
.choice-input-wrapper.true-false-choice .choice-label {
  cursor: default;
}

.choice-input-wrapper.true-choice {
  border-color: var(--secondary-light);
  background: var(--secondary-bg-10);
}

.choice-input-wrapper.true-choice .choice-label {
  background: var(--secondary-bg-30);
  border-color: var(--secondary-light);
  color: var(--secondary-light);
}

.choice-input-wrapper.false-choice {
  border-color: var(--danger-light);
  background: var(--danger-bg-10);
}

.choice-input-wrapper.false-choice .choice-label {
  background: var(--danger-bg-30);
  border-color: var(--danger-light);
  color: var(--danger-light);
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

/* Image Section Styles */
.image-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

.image-type-toggle {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-overlay-20);
  border-radius: 6px;
  padding: 0.25rem;
}

.toggle-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: var(--info-bg-30);
  color: var(--info-light);
}

.toggle-btn:hover:not(.active) {
  color: var(--text-secondary);
}

.image-upload-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-input {
  display: none;
}

.btn-upload {
  padding: 0.5rem 1rem;
  background: var(--bg-overlay-20);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-upload:hover {
  background: var(--bg-overlay-30);
  border-color: var(--info-light);
  color: var(--info-light);
}

.file-hint {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.image-url-wrapper {
  width: 100%;
}

.url-input {
  width: 100%;
  padding: 0.6rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9rem;
  box-sizing: border-box;
}

.url-input:focus {
  border-color: var(--info-light);
  outline: none;
}

.image-preview {
  position: relative;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-overlay-20);
}

.image-preview img {
  max-width: 100%;
  max-height: 200px;
  display: block;
  object-fit: contain;
  margin: 0 auto;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: var(--warning-light);
}

.image-error .error-icon {
  font-size: 2rem;
}

.image-error .error-text {
  font-weight: 600;
}

.image-error .error-url {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  word-break: break-all;
  max-width: 100%;
  text-align: center;
}

.btn-remove-image {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--danger-bg-60);
  color: white;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove-image:hover {
  background: var(--danger-color);
}

@media (max-width: 1024px) {
  .question-editor-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
</style>
