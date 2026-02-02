<template>
  <div class="question-bank-filters">
    <div class="filter-row">
      <!-- Search -->
      <div class="filter-group search-group">
        <label class="filter-label">Search Questions</label>
        <input
          type="text"
          v-model="localFilters.search"
          placeholder="Search question text..."
          class="filter-input"
          @keyup.enter="applyFilters"
        />
      </div>

      <!-- Question Type -->
      <div class="filter-group">
        <label class="filter-label">Type</label>
        <select v-model="localFilters.type" class="filter-input">
          <option value="">All Types</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True/False</option>
          <option value="short_answer">Short Answer</option>
        </select>
      </div>

      <!-- Difficulty -->
      <div class="filter-group">
        <label class="filter-label">Difficulty</label>
        <select v-model="selectedDifficulty" class="filter-input">
          <option value="">All Difficulties</option>
          <option
            v-for="tag in difficultyTags"
            :key="tag.id"
            :value="tag.id"
          >
            {{ tag.name }}
          </option>
        </select>
      </div>

      <!-- Category -->
      <div class="filter-group">
        <label class="filter-label">Category</label>
        <select v-model="selectedCategory" class="filter-input">
          <option value="">All Categories</option>
          <option
            v-for="tag in categoryTags"
            :key="tag.id"
            :value="tag.id"
          >
            {{ tag.name }}
          </option>
        </select>
      </div>

      <!-- Custom Tags -->
      <div v-if="customTags.length > 0" class="filter-group">
        <label class="filter-label">Custom Tags</label>
        <select v-model="selectedCustomTag" class="filter-input">
          <option value="">All Custom Tags</option>
          <option
            v-for="tag in customTags"
            :key="tag.id"
            :value="tag.id"
          >
            {{ tag.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="filter-row">
      <!-- Has Image -->
      <div class="filter-group">
        <label class="filter-label">Media</label>
        <select v-model="localFilters.hasImage" class="filter-input">
          <option value="">All Questions</option>
          <option value="true">With Images</option>
          <option value="false">Without Images</option>
        </select>
      </div>

      <!-- Show Archived -->
      <div class="filter-group">
        <label class="filter-label checkbox-label">
          <input
            type="checkbox"
            v-model="showArchived"
          />
          <span>Show Archived</span>
        </label>
      </div>

      <!-- Actions -->
      <div class="filter-actions">
        <button class="btn-secondary" @click="clearFilters">
          <AppIcon icon="lucide:x" size="sm" />
          Clear
        </button>
        <button class="btn-primary" @click="applyFilters">
          <AppIcon icon="lucide:search" size="sm" />
          Apply Filters
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  filters: {
    type: Object,
    default: () => ({
      search: '',
      type: '',
      tags: '',
      hasImage: '',
      archived: 'false',
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
  },
  tags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['apply', 'clear'])

// Local state
const localFilters = ref({ ...props.filters })
const selectedDifficulty = ref('')
const selectedCategory = ref('')
const selectedCustomTag = ref('')
const showArchived = ref(false)

// Computed
const difficultyTags = computed(() =>
  props.tags.filter(t => t.tag_type === 'difficulty')
)

const categoryTags = computed(() =>
  props.tags.filter(t => t.tag_type === 'category')
)

const customTags = computed(() =>
  props.tags.filter(t => t.tag_type === 'custom')
)

// Watchers
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
  showArchived.value = newFilters.archived === 'true'

  // Parse tags filter to set difficulty/category/custom
  if (newFilters.tags) {
    const tagIds = newFilters.tags.split(',').map(id => parseInt(id, 10))
    const diffTag = difficultyTags.value.find(t => tagIds.includes(t.id))
    const catTag = categoryTags.value.find(t => tagIds.includes(t.id))
    const custTag = customTags.value.find(t => tagIds.includes(t.id))
    selectedDifficulty.value = diffTag?.id || ''
    selectedCategory.value = catTag?.id || ''
    selectedCustomTag.value = custTag?.id || ''
  } else {
    selectedDifficulty.value = ''
    selectedCategory.value = ''
    selectedCustomTag.value = ''
  }
}, { deep: true })

watch(showArchived, (value) => {
  localFilters.value.archived = value ? 'true' : 'false'
})

// Methods
const applyFilters = () => {
  // Combine difficulty, category, and custom into tags filter
  const tagIds = []
  if (selectedDifficulty.value) tagIds.push(selectedDifficulty.value)
  if (selectedCategory.value) tagIds.push(selectedCategory.value)
  if (selectedCustomTag.value) tagIds.push(selectedCustomTag.value)
  localFilters.value.tags = tagIds.join(',')

  emit('apply', { ...localFilters.value })
}

const clearFilters = () => {
  localFilters.value = {
    search: '',
    type: '',
    tags: '',
    hasImage: '',
    archived: 'false',
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
  selectedDifficulty.value = ''
  selectedCategory.value = ''
  selectedCustomTag.value = ''
  showArchived.value = false
  emit('clear')
}

onMounted(() => {
  showArchived.value = props.filters.archived === 'true'
})
</script>

<style scoped>
.question-bank-filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 150px;
}

.filter-group.search-group {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.filter-label.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0;
  text-transform: none;
  font-size: 0.875rem;
}

.filter-label.checkbox-label input {
  cursor: pointer;
}

.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.filter-input::placeholder {
  color: var(--text-muted);
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-overlay-10);
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    min-width: 100%;
  }

  .filter-actions {
    margin-left: 0;
    justify-content: flex-end;
  }
}
</style>
