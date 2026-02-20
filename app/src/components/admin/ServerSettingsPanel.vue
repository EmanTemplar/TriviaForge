<template>
  <section>
    <h3>
      <AppIcon name="globe" size="sm" />
      Server Settings
    </h3>

    <div class="settings-content">
      <div class="info-section">
        <div class="info-field">
          <div class="info-label">
            <AppIcon name="server" size="sm" />
            Auto-Detected IP
          </div>
          <div class="info-value">{{ detectedIp || 'Loading...' }}</div>
        </div>

        <div class="info-field">
          <div class="info-label">Active QR Code URL</div>
          <div class="info-value">{{ activeServerUrl || 'Loading...' }}</div>
        </div>
      </div>

      <div class="custom-url-section">
        <FormInput
          v-model="customUrl"
          label="Custom Server URL"
          placeholder="http://192.168.1.x:3000"
        />
        <div class="helper-text">
          Leave empty to use the auto-detected IP above. Changes take effect immediately for new QR codes.
        </div>
      </div>

      <div class="button-row">
        <Button variant="success" @click="save">Save</Button>
        <Button variant="secondary" @click="clear">Clear</Button>
      </div>

      <div v-if="saveMessage" class="save-message" :class="'message-' + saveMessageType">
        {{ saveMessage }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import Button from '@/components/common/Button.vue'
import FormInput from '@/components/common/FormInput.vue'
import { useApi } from '@/composables/useApi.js'

const { get, post } = useApi()

const detectedIp = ref('')
const activeServerUrl = ref('')
const customUrl = ref('')
const saveMessage = ref('')
const saveMessageType = ref('success')

async function fetchOptions() {
  try {
    const response = await get('/api/options')
    const data = response.data
    detectedIp.value = data.detectedIp || ''
    activeServerUrl.value = data.activeServerUrl || ''
    customUrl.value = data.serverUrl || ''
  } catch (error) {
    console.error('Error fetching options:', error)
    showMessage('Failed to load server settings', 'error')
  }
}

async function save() {
  try {
    await post('/api/options', { serverUrl: customUrl.value })
    showMessage('Server URL saved successfully', 'success')
    await fetchOptions()
  } catch (error) {
    console.error('Error saving options:', error)
    const msg = error.response?.data?.error || 'Failed to save server URL'
    showMessage(msg, 'error')
  }
}

async function clear() {
  customUrl.value = ''
  await save()
}

function showMessage(message, type) {
  saveMessage.value = message
  saveMessageType.value = type
  setTimeout(() => {
    saveMessage.value = ''
  }, 3000)
}

onMounted(() => {
  fetchOptions()
})
</script>

<style scoped>
section {
  padding: 2rem;
  background: var(--bg-overlay-10);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

h3 {
  margin: 0 0 1.5rem 0;
  color: var(--info-light);
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.info-value {
  font-size: 1rem;
  color: var(--text-primary);
  font-family: monospace;
  padding: 0.5rem 0.75rem;
  background: var(--bg-overlay-20);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.custom-url-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.helper-text {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.button-row {
  display: flex;
  gap: 0.75rem;
}

.save-message {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  animation: slideIn 0.3s ease;
}

.message-success {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.message-error {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  section {
    padding: 1.5rem;
  }
}
</style>
