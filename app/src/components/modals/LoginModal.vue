<template>
  <Modal :isOpen="isOpen" @close="$emit('cancel')" title="Login Required">
    <template #default>
      <p class="modal-description">
        This username belongs to a registered account. Please enter your password to continue.
      </p>

      <form @submit.prevent="handleSubmit">
        <FormInput
          v-model="usernameDisplay"
          label="Username"
          type="text"
          readonly
        />
        <FormInput
          v-model="passwordInput"
          label="Password"
          type="password"
          placeholder="Enter your password"
          :error="error"
        />
      </form>
    </template>
    <template #footer>
      <button class="btn-success" @click="handleSubmit">Login</button>
      <button class="btn-secondary" @click="$emit('cancel')">Cancel</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import FormInput from '@/components/common/FormInput.vue';

/**
 * LoginModal - Modal for registered users to login
 *
 * @emits submit - When user submits login form with password
 * @emits cancel - When user cancels login
 */
const props = defineProps({
  /** Whether the modal is open */
  isOpen: {
    type: Boolean,
    required: true
  },
  /** Username to display (readonly) */
  username: {
    type: String,
    required: true
  },
  /** Error message to display */
  error: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['submit', 'cancel']);

const usernameDisplay = ref(props.username);
const passwordInput = ref('');

// Watch for username prop changes
watch(() => props.username, (newVal) => {
  usernameDisplay.value = newVal;
});

// Clear password when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    passwordInput.value = '';
  }
});

function handleSubmit() {
  if (passwordInput.value.trim()) {
    emit('submit', passwordInput.value);
  }
}
</script>

<style scoped>
.modal-description {
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
}
</style>
