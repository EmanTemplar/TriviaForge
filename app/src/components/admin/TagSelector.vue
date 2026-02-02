<template>
  <div class="tag-selector">
    <!-- Display Mode: Chips -->
    <div v-if="mode === 'chips'" class="tag-chips">
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="tag-chip"
        :style="{ '--tag-color': tag.color }"
      >
        {{ tag.name }}
        <button
          v-if="!readonly"
          class="chip-remove"
          @click="removeTag(tag.id)"
          type="button"
        >
          <AppIcon icon="lucide:x" size="xs" />
        </button>
      </span>
      <button
        v-if="!readonly && availableTags.length > 0"
        class="add-tag-trigger"
        @click="showDropdown = !showDropdown"
        type="button"
      >
        <AppIcon icon="lucide:plus" size="sm" />
        Add Tag
      </button>
    </div>

    <!-- Display Mode: Dropdown -->
    <div v-else-if="mode === 'dropdown'" class="tag-dropdown-wrapper">
      <select
        v-model="dropdownSelection"
        class="tag-dropdown"
        @change="handleDropdownSelect"
      >
        <option value="">{{ placeholder }}</option>
        <optgroup v-if="groupedTags.difficulty.length > 0" label="Difficulty">
          <option
            v-for="tag in groupedTags.difficulty"
            :key="tag.id"
            :value="tag.id"
            :disabled="isTagSelected(tag.id)"
          >
            {{ tag.name }}
          </option>
        </optgroup>
        <optgroup v-if="groupedTags.category.length > 0" label="Category">
          <option
            v-for="tag in groupedTags.category"
            :key="tag.id"
            :value="tag.id"
            :disabled="isTagSelected(tag.id)"
          >
            {{ tag.name }}
          </option>
        </optgroup>
        <optgroup v-if="groupedTags.custom.length > 0" label="Custom">
          <option
            v-for="tag in groupedTags.custom"
            :key="tag.id"
            :value="tag.id"
            :disabled="isTagSelected(tag.id)"
          >
            {{ tag.name }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Dropdown Panel (for chips mode) -->
    <div v-if="mode === 'chips' && showDropdown" class="dropdown-panel">
      <div v-if="groupedAvailableTags.difficulty.length > 0" class="dropdown-group">
        <span class="dropdown-group-label">Difficulty</span>
        <button
          v-for="tag in groupedAvailableTags.difficulty"
          :key="tag.id"
          class="dropdown-item"
          :style="{ '--tag-color': tag.color }"
          @click="addTag(tag.id)"
          type="button"
        >
          {{ tag.name }}
        </button>
      </div>
      <div v-if="groupedAvailableTags.category.length > 0" class="dropdown-group">
        <span class="dropdown-group-label">Category</span>
        <button
          v-for="tag in groupedAvailableTags.category"
          :key="tag.id"
          class="dropdown-item"
          :style="{ '--tag-color': tag.color }"
          @click="addTag(tag.id)"
          type="button"
        >
          {{ tag.name }}
        </button>
      </div>
      <div v-if="groupedAvailableTags.custom.length > 0" class="dropdown-group">
        <span class="dropdown-group-label">Custom</span>
        <button
          v-for="tag in groupedAvailableTags.custom"
          :key="tag.id"
          class="dropdown-item"
          :style="{ '--tag-color': tag.color }"
          @click="addTag(tag.id)"
          type="button"
        >
          {{ tag.name }}
        </button>
      </div>
      <p v-if="availableTags.length === 0" class="no-tags-message">
        No more tags available
      </p>
    </div>

    <!-- Click outside handler -->
    <div
      v-if="showDropdown"
      class="dropdown-backdrop"
      @click="showDropdown = false"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  tags: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'chips',
    validator: (v) => ['chips', 'dropdown'].includes(v)
  },
  placeholder: {
    type: String,
    default: 'Select a tag...'
  },
  readonly: {
    type: Boolean,
    default: false
  },
  singleSelect: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'add', 'remove'])

// State
const showDropdown = ref(false)
const dropdownSelection = ref('')

// Computed
const selectedTagIds = computed(() => new Set(props.modelValue))

const selectedTags = computed(() =>
  props.tags.filter(t => selectedTagIds.value.has(t.id))
)

const availableTags = computed(() =>
  props.tags.filter(t => !selectedTagIds.value.has(t.id))
)

const groupedTags = computed(() => ({
  difficulty: props.tags.filter(t => t.tag_type === 'difficulty'),
  category: props.tags.filter(t => t.tag_type === 'category'),
  custom: props.tags.filter(t => t.tag_type === 'custom')
}))

const groupedAvailableTags = computed(() => ({
  difficulty: availableTags.value.filter(t => t.tag_type === 'difficulty'),
  category: availableTags.value.filter(t => t.tag_type === 'category'),
  custom: availableTags.value.filter(t => t.tag_type === 'custom')
}))

// Methods
const isTagSelected = (tagId) => selectedTagIds.value.has(tagId)

const addTag = (tagId) => {
  const id = parseInt(tagId, 10)
  if (isTagSelected(id)) return

  let newValue
  if (props.singleSelect) {
    newValue = [id]
  } else {
    newValue = [...props.modelValue, id]
  }

  emit('update:modelValue', newValue)
  emit('add', id)
  showDropdown.value = false
}

const removeTag = (tagId) => {
  const newValue = props.modelValue.filter(id => id !== tagId)
  emit('update:modelValue', newValue)
  emit('remove', tagId)
}

const handleDropdownSelect = () => {
  if (dropdownSelection.value) {
    addTag(dropdownSelection.value)
    dropdownSelection.value = ''
  }
}

// Close dropdown on click outside
watch(showDropdown, (value) => {
  if (value) {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        showDropdown.value = false
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)
  }
})
</script>

<style scoped>
.tag-selector {
  position: relative;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
  border: 1px solid color-mix(in srgb, var(--tag-color, var(--primary-color)) 30%, transparent);
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  border-radius: 50%;
  padding: 0;
}

.chip-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.add-tag-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
}

.add-tag-trigger:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tag-dropdown-wrapper {
  position: relative;
}

.tag-dropdown {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.tag-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-group {
  padding: 0.5rem;
}

.dropdown-group:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.dropdown-group-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
}

.no-tags-message {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-style: italic;
  margin: 0;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}
</style>
