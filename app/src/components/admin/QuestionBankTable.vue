<template>
  <div class="question-bank-table">
    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>Loading questions...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="questions.length === 0" class="empty-state">
      <AppIcon name="inbox" size="2xl" />
      <h3>No Questions Found</h3>
      <p>Try adjusting your filters or import some quizzes to get started.</p>
    </div>

    <!-- Table -->
    <div v-else class="table-container">
      <table class="questions-table">
        <thead>
          <tr>
            <th class="col-checkbox">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="$emit('selectAll')"
              />
            </th>
            <th class="col-question sortable" :class="{ active: sortBy === 'question_text' }" @click="$emit('sort', 'question_text')">
              <span class="header-content">
                Question
                <AppIcon
                  class="sort-icon"
                  :class="{ visible: sortBy === 'question_text' }"
                  :name="sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'"
                  size="sm"
                />
              </span>
            </th>
            <th class="col-type sortable" :class="{ active: sortBy === 'question_type' }" @click="$emit('sort', 'question_type')">
              <span class="header-content">
                Type
                <AppIcon
                  class="sort-icon"
                  :class="{ visible: sortBy === 'question_type' }"
                  :name="sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'"
                  size="sm"
                />
              </span>
            </th>
            <th class="col-tags">Tags</th>
            <th class="col-usage sortable" :class="{ active: sortBy === 'usage_count' }" @click="$emit('sort', 'usage_count')">
              <span class="header-content">
                Used
                <AppIcon
                  class="sort-icon"
                  :class="{ visible: sortBy === 'usage_count' }"
                  :name="sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'"
                  size="sm"
                />
              </span>
            </th>
            <th class="col-date sortable" :class="{ active: sortBy === 'created_at' }" @click="$emit('sort', 'created_at')">
              <span class="header-content">
                Created
                <AppIcon
                  class="sort-icon"
                  :class="{ visible: sortBy === 'created_at' }"
                  :name="sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'"
                  size="sm"
                />
              </span>
            </th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="question in questions"
            :key="question.id"
            :class="{
              selected: selectedIds.has(question.id),
              archived: question.is_archived
            }"
          >
            <td class="col-checkbox">
              <input
                type="checkbox"
                :checked="selectedIds.has(question.id)"
                @click="handleRowSelect($event, question.id)"
              />
            </td>
            <td class="col-question">
              <div class="question-cell">
                <span class="question-text" :title="question.question_text">
                  {{ truncateText(question.question_text, 80) }}
                </span>
                <div class="question-meta">
                  <span v-if="question.image_url" class="meta-badge has-image">
                    <AppIcon name="image" size="xs" />
                  </span>
                  <span v-if="question.is_archived" class="meta-badge archived-badge">
                    <AppIcon name="archive" size="xs" />
                    Archived
                  </span>
                </div>
              </div>
            </td>
            <td class="col-type">
              <span class="type-badge" :class="getTypeClass(question.question_type)">
                {{ formatType(question.question_type) }}
              </span>
            </td>
            <td class="col-tags">
              <div class="tags-cell">
                <span
                  v-for="tag in question.tags?.slice(0, 3)"
                  :key="tag.id"
                  class="tag-badge"
                  :style="{ '--tag-color': tag.color }"
                >
                  {{ tag.name }}
                </span>
                <span v-if="question.tags?.length > 3" class="more-tags">
                  +{{ question.tags.length - 3 }}
                </span>
              </div>
            </td>
            <td class="col-usage">
              <span class="usage-count" :class="{ unused: question.usage_count === 0 }">
                {{ question.usage_count }} quiz{{ question.usage_count !== 1 ? 'zes' : '' }}
              </span>
            </td>
            <td class="col-date">
              <span class="date-text">{{ formatDate(question.created_at) }}</span>
            </td>
            <td class="col-actions">
              <button
                class="btn-icon"
                title="View Details"
                @click="$emit('viewDetails', question)"
              >
                <AppIcon name="settings" size="sm" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  questions: {
    type: Array,
    default: () => []
  },
  selectedIds: {
    type: Set,
    default: () => new Set()
  },
  loading: {
    type: Boolean,
    default: false
  },
  sortBy: {
    type: String,
    default: 'created_at'
  },
  sortOrder: {
    type: String,
    default: 'desc'
  }
})

const emit = defineEmits(['select', 'selectAll', 'selectRange', 'sort', 'viewDetails'])

// Track last selected index for shift-click
const lastSelectedIndex = ref(null)

// Handle row selection with shift-click support
const handleRowSelect = (event, questionId) => {
  const currentIndex = props.questions.findIndex(q => q.id === questionId)

  if (event.shiftKey && lastSelectedIndex.value !== null) {
    // Shift-click: select range
    const start = Math.min(lastSelectedIndex.value, currentIndex)
    const end = Math.max(lastSelectedIndex.value, currentIndex)
    const rangeIds = props.questions.slice(start, end + 1).map(q => q.id)
    emit('selectRange', rangeIds)
  } else {
    // Normal click: toggle single selection
    emit('select', questionId)
    lastSelectedIndex.value = currentIndex
  }
}

// Computed
const allSelected = computed(() =>
  props.questions.length > 0 &&
  props.questions.every(q => props.selectedIds.has(q.id))
)

const someSelected = computed(() =>
  props.questions.some(q => props.selectedIds.has(q.id)) &&
  !allSelected.value
)

// Methods
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const formatType = (type) => {
  const types = {
    multiple_choice: 'MC',
    true_false: 'T/F',
    short_answer: 'Short'
  }
  return types[type] || type
}

const getTypeClass = (type) => {
  return `type-${type?.replace('_', '-') || 'unknown'}`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}
</script>

<style scoped>
.question-bank-table {
  position: relative;
  min-height: 200px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--bg-overlay-50);
  border-radius: 8px;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state h3 {
  margin: 1rem 0 0.5rem;
  color: var(--text-primary);
}

.empty-state p {
  max-width: 300px;
}

.table-container {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.questions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.questions-table th,
.questions-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.questions-table th {
  background: var(--primary-color);
  font-weight: 600;
  color: white;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 2px solid var(--primary-color-dark, color-mix(in srgb, var(--primary-color) 80%, black));
}

.questions-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.questions-table th.sortable:hover {
  background: color-mix(in srgb, var(--primary-color) 85%, black);
}

.questions-table th.sortable.active {
  background: color-mix(in srgb, var(--primary-color) 90%, black);
}

.header-content {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.sort-icon {
  opacity: 0.3;
  transition: opacity 0.15s;
}

.sort-icon.visible {
  opacity: 1;
}

.questions-table th.sortable:hover .sort-icon {
  opacity: 0.6;
}

.questions-table th.sortable:hover .sort-icon.visible {
  opacity: 1;
}

.questions-table tbody tr {
  transition: background 0.15s;
}

.questions-table tbody tr:hover {
  background: var(--bg-overlay-5);
}

.questions-table tbody tr.selected {
  background: var(--primary-color-10);
}

.questions-table tbody tr.archived {
  opacity: 0.7;
}

.col-checkbox {
  width: 40px;
  text-align: center !important;
}

.col-question {
  min-width: 250px;
  max-width: 400px;
}

.col-type {
  width: 80px;
}

.col-tags {
  width: 200px;
}

.col-usage {
  width: 100px;
}

.col-date {
  width: 100px;
}

.col-actions {
  width: 60px;
  text-align: center !important;
}

.question-cell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.question-text {
  line-height: 1.4;
}

.question-meta {
  display: flex;
  gap: 0.5rem;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.meta-badge.has-image {
  background: var(--info-color-10);
  color: var(--info-color);
}

.meta-badge.archived-badge {
  background: var(--warning-color-10);
  color: var(--warning-color);
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.type-badge.type-multiple-choice {
  background: var(--primary-color-10);
  color: var(--primary-color);
}

.type-badge.type-true-false {
  background: var(--success-color-10);
  color: var(--success-color);
}

.type-badge.type-short-answer {
  background: var(--warning-color-10);
  color: var(--warning-color);
}

.tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
  border: 1px solid color-mix(in srgb, var(--tag-color, var(--primary-color)) 30%, transparent);
}

.more-tags {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
  font-size: 0.7rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.usage-count {
  font-weight: 500;
}

.usage-count.unused {
  color: var(--text-muted);
}

.date-text {
  color: var(--text-secondary);
  white-space: nowrap;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--bg-overlay-10);
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .col-usage,
  .col-date {
    display: none;
  }

  .col-tags {
    width: 120px;
  }

  .questions-table th,
  .questions-table td {
    padding: 0.5rem;
  }
}
</style>
