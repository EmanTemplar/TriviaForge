<template>
  <Modal :isOpen="isOpen" @close="$emit('close')" title="Change Username">
    <p class="modal-description">
      Changing your username will:
    </p>
    <ul class="modal-list">
      <li>Create a new account or switch to a different account</li>
      <li>Start fresh with no saved progress</li>
    </ul>
    <p class="modal-warning">
      Are you sure you want to continue?
    </p>
    <template #footer>
      <button class="btn-success" @click="$emit('confirm')">Change Username</button>
      <button class="btn-secondary" @click="$emit('close')">Cancel</button>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue';

/**
 * ChangeUsernameConfirmModal - Confirmation dialog for changing username
 *
 * @emits confirm - When user confirms username change
 * @emits close - When modal is closed
 */
defineProps({
  /** Whether the modal is open */
  isOpen: {
    type: Boolean,
    required: true
  }
});

defineEmits(['confirm', 'close']);
</script>

<style scoped>
.modal-description {
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
}

.modal-list {
  color: var(--text-tertiary);
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}

.modal-warning {
  color: var(--warning-light);
  margin-bottom: 1.5rem;
  font-weight: 500;
}
</style>
