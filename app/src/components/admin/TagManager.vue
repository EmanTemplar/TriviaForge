<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Manage Tags</h2>
        <button class="close-btn" @click="$emit('close')">
          <AppIcon name="x" size="md" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Create Tag Form -->
        <div class="create-tag-form">
          <h3>Create New Tag</h3>
          <div class="form-row">
            <input
              v-model="newTagName"
              type="text"
              placeholder="Tag name..."
              class="tag-input"
              @keyup.enter="createTag"
            />
            <select v-model="newTagType" class="tag-type-select">
              <option value="category">Category</option>
              <option value="difficulty">Difficulty</option>
              <option value="custom">Custom</option>
            </select>
            <input v-model="newTagColor" type="color" class="color-picker" />
            <button class="btn-primary" :disabled="!newTagName.trim()" @click="createTag">
              <AppIcon name="plus" size="sm" />
              Add
            </button>
          </div>
          <p v-if="createError" class="error-message">{{ createError }}</p>
        </div>

        <!-- Tags List by Type -->
        <div v-for="typeGroup in tagGroups" :key="typeGroup.type" class="tag-group">
          <h3>{{ typeGroup.label }} ({{ typeGroup.tags.length }})</h3>
          <div class="tags-list">
            <div v-for="tag in typeGroup.tags" :key="tag.id" class="tag-item">
              <div class="tag-preview" :style="{ '--tag-color': tag.color }">
                {{ tag.name }}
              </div>
              <span class="tag-usage">{{ tag.usage_count || 0 }} questions</span>
              <div class="tag-actions">
                <button
                  class="btn-icon"
                  title="Edit"
                  @click="startEdit(tag)"
                >
                  <AppIcon name="edit-2" size="sm" />
                </button>
                <button
                  class="btn-icon btn-danger-icon"
                  title="Delete"
                  @click="deleteTag(tag)"
                >
                  <AppIcon name="trash-2" size="sm" />
                </button>
              </div>
            </div>
            <p v-if="typeGroup.tags.length === 0" class="empty-text">
              No {{ typeGroup.label.toLowerCase() }} tags
            </p>
          </div>
        </div>
      </div>

      <!-- Edit Tag Modal -->
      <div v-if="editingTag" class="edit-overlay" @click.self="editingTag = null">
        <div class="edit-modal">
          <h3>Edit Tag</h3>
          <div class="form-row">
            <input v-model="editName" type="text" class="tag-input" />
            <input v-model="editColor" type="color" class="color-picker" />
          </div>
          <div class="edit-actions">
            <button class="btn-secondary" @click="editingTag = null">Cancel</button>
            <button class="btn-primary" @click="saveEdit">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  tags: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'created', 'updated', 'deleted'])

const { post, put, delete: delete_ } = useApi()

// State
const newTagName = ref('')
const newTagType = ref('category')
const newTagColor = ref('#3b82f6')
const createError = ref('')
const editingTag = ref(null)
const editName = ref('')
const editColor = ref('')

// Computed
const tagGroups = computed(() => [
  { type: 'difficulty', label: 'Difficulty', tags: props.tags.filter(t => t.tag_type === 'difficulty') },
  { type: 'category', label: 'Categories', tags: props.tags.filter(t => t.tag_type === 'category') },
  { type: 'custom', label: 'Custom', tags: props.tags.filter(t => t.tag_type === 'custom') }
])

// Methods
const createTag = async () => {
  if (!newTagName.value.trim()) return

  try {
    createError.value = ''
    await post('/api/tags', {
      name: newTagName.value.trim(),
      tag_type: newTagType.value,
      color: newTagColor.value
    })
    newTagName.value = ''
    emit('created')
  } catch (err) {
    createError.value = err.response?.data?.error?.message || 'Failed to create tag'
  }
}

const startEdit = (tag) => {
  editingTag.value = tag
  editName.value = tag.name
  editColor.value = tag.color || '#3b82f6'
}

const saveEdit = async () => {
  if (!editingTag.value || !editName.value.trim()) return

  try {
    await put(`/api/tags/${editingTag.value.id}`, {
      name: editName.value.trim(),
      color: editColor.value
    })
    editingTag.value = null
    emit('updated')
  } catch (err) {
    console.error('Error updating tag:', err)
  }
}

const deleteTag = async (tag) => {
  if (!confirm(`Delete tag "${tag.name}"? This will remove it from all questions.`)) return

  try {
    await delete_(`/api/tags/${tag.id}`)
    emit('deleted')
  } catch (err) {
    console.error('Error deleting tag:', err)
  }
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
  max-width: 600px;
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

.create-tag-form {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.create-tag-form h3,
.tag-group h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0 0 0.75rem 0;
}

.form-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-input {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tag-type-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.color-picker {
  width: 40px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.error-message {
  color: var(--danger-color);
  font-size: 0.875rem;
  margin: 0.5rem 0 0 0;
}

.tag-group {
  margin-bottom: 1.5rem;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.tag-preview {
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--tag-color, var(--primary-color)) 15%, transparent);
  color: var(--tag-color, var(--primary-color));
}

.tag-usage {
  flex: 1;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.tag-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
}

.btn-icon:hover {
  background: var(--bg-overlay-10);
  color: var(--primary-color);
}

.btn-danger-icon:hover {
  color: var(--danger-color);
}

.empty-text {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-modal {
  background: var(--bg-primary);
  padding: 1.5rem;
  border-radius: 8px;
  min-width: 300px;
}

.edit-modal h3 {
  margin: 0 0 1rem 0;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
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
