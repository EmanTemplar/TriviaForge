<template>
  <Modal :isOpen="isOpen" @close="$emit('close')" title="Confirm Logout">
    <p class="modal-description">
      Are you sure you want to logout?
    </p>
    <p class="modal-description">
      This will clear your saved username and account data.
    </p>
    <template #footer>
      <button class="btn-danger" @click="$emit('confirm')">Logout</button>
      <button class="btn-secondary" @click="$emit('close')">Cancel</button>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue';

/**
 * LogoutConfirmModal - Confirmation dialog for logout action
 *
 * @emits confirm - When user confirms logout
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
</style>
