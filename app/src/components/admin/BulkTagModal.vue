<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Tag {{ selectedCount }} Question{{ selectedCount !== 1 ? 's' : '' }}</h2>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <div class="mode-selector">
          <label class="radio-label">
            <input type="radio" v-model="mode" value="add" />
            <span>Add tags (keep existing)</span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="mode" value="replace" />
            <span>Replace all tags</span>
          </label>
        </div>

        <div class="tag-section">
          <h3>Difficulty</h3>
          <div class="tag-options">
            <label
              v-for="tag in difficultyTags"
              :key="tag.id"
              class="tag-option"
              :class="{ selected: selectedTagIds.has(tag.id) }"
              :style="{ '--tag-color': tag.color }"
            >
              <input
                type="checkbox"
                :checked="selectedTagIds.has(tag.id)"
                @change="toggleTag(tag.id)"
              />
              <span>{{ tag.name }}</span>
            </label>
          </div>
        </div>

        <div class="tag-section">
          <h3>Categories</h3>
          <div class="tag-options">
            <label
              v-for="tag in categoryTags"
              :key="tag.id"
              class="tag-option"
              :class="{ selected: selectedTagIds.has(tag.id) }"
              :style="{ '--tag-color': tag.color }"
            >
              <input
                type="checkbox"
                :checked="selectedTagIds.has(tag.id)"
                @change="toggleTag(tag.id)"
              />
              <span>{{ tag.name }}</span>
            </label>
          </div>
        </div>

        <div v-if="customTags.length > 0" class="tag-section">
          <h3>Custom Tags</h3>
          <div class="tag-options">
            <label
              v-for="tag in customTags"
              :key="tag.id"
              class="tag-option"
              :class="{ selected: selectedTagIds.has(tag.id) }"
              :style="{ '--tag-color': tag.color }"
            >
              <input
                type="checkbox"
                :checked="selectedTagIds.has(tag.id)"
                @change="toggleTag(tag.id)"
              />
              <span>{{ tag.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          class="btn-primary"
          :disabled="selectedTagIds.size === 0"
          @click="applyTags"
        >
          Apply Tags
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  selectedCount: {
    type: Number,
    required: true
  },
  tags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'apply'])

// State
const mode = ref('add')
const selectedTagIds = ref(new Set())

// Computed
const difficultyTags = computed(() => props.tags.filter(t => t.tag_type === 'difficulty'))
const categoryTags = computed(() => props.tags.filter(t => t.tag_type === 'category'))
const customTags = computed(() => props.tags.filter(t => t.tag_type === 'custom'))

// Methods
const toggleTag = (tagId) => {
  const newSet = new Set(selectedTagIds.value)
  if (newSet.has(tagId)) {
    newSet.delete(tagId)
  } else {
    newSet.add(tagId)
  }
  selectedTagIds.value = newSet
}

const applyTags = () => {
  emit('apply', {
    tagIds: [...selectedTagIds.value],
    mode: mode.value
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--bg-overlay-10);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.mode-selector {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.tag-section {
  margin-bottom: 1.25rem;
}

.tag-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0 0 0.75rem 0;
}

.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-option {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: all 0.15s;
}

.tag-option input {
  display: none;
}

.tag-option.selected {
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  border-color: var(--tag-color, var(--primary-color));
  color: var(--tag-color, var(--primary-color));
}

.tag-option:hover:not(.selected) {
  border-color: var(--tag-color, var(--primary-color));
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary,
.btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-overlay-10);
}
</style>
