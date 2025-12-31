<template>
  <Modal :isOpen="isOpen" @close="$emit('cancel')" title="Set New Password">
    <template #default>
      <p class="modal-description">
        Your password has been reset by an administrator. Please set a new password to continue.
      </p>

      <form @submit.prevent="handleSubmit">
        <FormInput
          v-model="usernameDisplay"
          label="Username"
          type="text"
          readonly
        />
        <FormInput
          v-model="newPasswordInput"
          label="New Password"
          type="password"
          placeholder="Enter new password (min 6 characters)"
          :error="error"
        />
        <FormInput
          v-model="confirmPasswordInput"
          label="Confirm Password"
          type="password"
          placeholder="Confirm new password"
        />
      </form>
    </template>
    <template #footer>
      <button class="btn-success" @click="handleSubmit">Set Password</button>
      <button class="btn-secondary" @click="$emit('cancel')">Cancel</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import FormInput from '@/components/common/FormInput.vue';

/**
 * SetPasswordModal - Modal for setting a new password after admin reset
 *
 * @emits submit - When user submits new password (emits {newPassword, confirmPassword})
 * @emits cancel - When user cancels password setup
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
const newPasswordInput = ref('');
const confirmPasswordInput = ref('');

// Watch for username prop changes
watch(() => props.username, (newVal) => {
  usernameDisplay.value = newVal;
});

// Clear passwords when modal closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  }
});

function handleSubmit() {
  if (newPasswordInput.value.trim() && confirmPasswordInput.value.trim()) {
    emit('submit', {
      newPassword: newPasswordInput.value,
      confirmPassword: confirmPasswordInput.value
    });
  }
}
</script>

<style scoped>
.modal-description {
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
}
</style>
