<template>
  <Modal :isOpen="isOpen" @close="$emit('close')" title="Leave Room">
    <p style="color: #aaa; margin-bottom: 1.5rem;">
      Are you sure you want to leave this room?
    </p>
    <p style="color: #aaa; margin-bottom: 1.5rem;">
      You'll lose your connection and can rejoin if the room is still active.
    </p>
    <template #footer>
      <button class="btn-danger" @click="$emit('confirm')">Leave Room</button>
      <button class="btn-secondary" @click="$emit('close')">Cancel</button>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue';

/**
 * LeaveRoomConfirmModal - Confirmation dialog for leaving a room
 *
 * @emits confirm - When user confirms leaving the room
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
