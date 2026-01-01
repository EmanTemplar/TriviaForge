<template>
  <div class="form-group">
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
      <span v-if="required" class="form-required">*</span>
    </label>

    <input
      v-if="type !== 'textarea' && type !== 'select'"
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="form-input"
      @input="handleInput"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    />

    <textarea
      v-else-if="type === 'textarea'"
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="form-input"
      :rows="rows"
      @input="handleInput"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    ></textarea>

    <select
      v-else-if="type === 'select'"
      :id="inputId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      class="form-input form-select"
      @change="handleInput"
      @blur="$emit('blur')"
      @focus="$emit('focus')"
    >
      <option value="" disabled v-if="placeholder">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="typeof option === 'object' ? option.value : option"
        :value="typeof option === 'object' ? option.value : option"
      >
        {{ typeof option === 'object' ? option.label : option }}
      </option>
    </select>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="hint && !error" class="form-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { generateRoomCode } from '@/utils/helpers.js'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  label: {
    type: String,
    default: null
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) =>
      ['text', 'email', 'password', 'number', 'textarea', 'select', 'tel', 'url'].includes(value)
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  hint: {
    type: String,
    default: null
  },
  rows: {
    type: Number,
    default: 3
  },
  options: {
    type: Array,
    default: () => [],
    validator: (value) => {
      // Options can be simple strings/numbers or objects with { label, value }
      return value.every(
        (item) =>
          typeof item === 'string' ||
          typeof item === 'number' ||
          (typeof item === 'object' && item.label && item.value)
      )
    }
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputId = computed(() => `input-${generateRoomCode(8)}`)

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--spacing-lg);
}

.form-label {
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
  font-size: var(--font-sm);
}

.form-required {
  color: var(--danger-color);
}

.form-input {
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-base);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

textarea.form-input {
  resize: vertical;
  font-family: inherit;
}

select.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-md) center;
  padding-right: calc(var(--spacing-md) * 3);
  cursor: pointer;
}

select.form-select:disabled {
  cursor: not-allowed;
}

select.form-select option {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--spacing-sm);
}

.form-error {
  margin-top: var(--spacing-sm);
  color: var(--danger-color);
  font-size: var(--font-sm);
  margin: 0;
}

.form-hint {
  margin-top: var(--spacing-sm);
  color: var(--text-tertiary);
  font-size: var(--font-xs);
  margin: 0;
}

@media (max-width: 640px) {
  .form-group {
    margin-bottom: var(--spacing-md);
  }

  .form-input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
