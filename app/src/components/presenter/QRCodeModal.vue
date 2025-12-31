<template>
  <Modal :isOpen="isOpen" size="medium" title="Scan to Join" @close="$emit('close')">
    <template #default>
      <div class="qr-content">
        <img v-if="qrCodeData" :src="qrCodeData" alt="QR Code" class="qr-image" />
        <p v-if="qrCodeUrl" class="qr-url">{{ qrCodeUrl }}</p>
        <p v-if="!qrCodeData" class="loading">Generating QR code...</p>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '@/components/common/Modal.vue'

defineProps({
  isOpen: { type: Boolean, required: true },
  qrCodeData: { type: String, default: null },
  qrCodeUrl: { type: String, default: null }
})

defineEmits(['close'])
</script>

<style scoped>
.qr-content {
  text-align: center;
  padding: 1rem;
}

.qr-image {
  max-width: 300px;
  width: 100%;
  margin-bottom: 1rem;
  border: 2px solid var(--info-light);
  border-radius: 8px;
}

.qr-url {
  word-break: break-all;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.loading {
  color: var(--text-tertiary);
}
</style>
