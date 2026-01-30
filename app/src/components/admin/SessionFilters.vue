<template>
  <div class="session-filters">
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">From Date</label>
        <input
          type="date"
          v-model="localFilters.dateFrom"
          class="filter-input"
        />
      </div>
      <div class="filter-group">
        <label class="filter-label">To Date</label>
        <input
          type="date"
          v-model="localFilters.dateTo"
          class="filter-input"
        />
      </div>
      <div class="filter-group">
        <label class="filter-label">Quiz</label>
        <select v-model="localFilters.quizId" class="filter-input">
          <option value="">All Quizzes</option>
          <option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
            {{ quiz.title }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Status</label>
        <select v-model="localFilters.status" class="filter-input">
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="interrupted">Interrupted</option>
        </select>
      </div>
    </div>
    <div class="filter-row">
      <div class="filter-group search-group">
        <label class="filter-label">Search Player</label>
        <input
          type="text"
          v-model="localFilters.search"
          placeholder="Enter player name..."
          class="filter-input"
          @keyup.enter="applyFilters"
        />
      </div>
      <div class="filter-actions">
        <button class="btn-secondary" @click="clearFilters">Clear</button>
        <button class="btn-primary" @click="applyFilters">Apply Filters</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  filters: {
    type: Object,
    default: () => ({
      dateFrom: '',
      dateTo: '',
      quizId: '',
      status: '',
      search: '',
    }),
  },
  quizzes: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['apply', 'clear']);

// Local copy of filters for two-way binding
const localFilters = ref({ ...props.filters });

// Watch for external filter changes
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters };
  },
  { deep: true }
);

function applyFilters() {
  emit('apply', { ...localFilters.value });
}

function clearFilters() {
  localFilters.value = {
    dateFrom: '',
    dateTo: '',
    quizId: '',
    status: '',
    search: '',
  };
  emit('clear');
}
</script>

<style scoped>
.session-filters {
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.filter-row + .filter-row {
  margin-top: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 150px;
}

.filter-group.search-group {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-overlay-20);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-light);
}

.filter-input::placeholder {
  color: var(--text-tertiary);
}

select.filter-input {
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-light);
  color: var(--btn-text-light);
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-overlay-30);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-overlay-20);
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .filter-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
