<template>
  <Modal :isOpen="isOpen" size="medium" title="Set Up Two-Factor Authentication" @close="handleClose">
    <div class="two-factor-setup">
      <!-- Step 1: Scan QR Code -->
      <div v-if="step === 'setup'" class="setup-step">
        <p class="step-description">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>

        <div v-if="loading" class="loading-state">
          <span class="loading-spinner"></span>
          <span>Generating QR code...</span>
        </div>

        <div v-else-if="qrCode" class="qr-container">
          <img :src="qrCode" alt="2FA QR Code" class="qr-code" />
        </div>

        <div v-if="secret" class="manual-entry">
          <p class="manual-label">Can't scan? Enter this code manually:</p>
          <div class="secret-code">
            <code>{{ secret }}</code>
            <button type="button" class="btn-copy" @click="copySecret" title="Copy to clipboard">
              {{ copied ? '✓' : '📋' }}
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="verification-section">
          <label for="verifyCode">Enter the 6-digit code from your app:</label>
          <div class="code-input-wrapper">
            <FormInput
              id="verifyCode"
              v-model="verificationCode"
              type="text"
              placeholder="000000"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              @keyup.enter="verifyAndEnable"
            />
          </div>
        </div>
      </div>

      <!-- Step 2: Save Backup Codes -->
      <div v-if="step === 'backup'" class="backup-step">
        <div class="success-banner">
          <span class="success-icon">✓</span>
          <span>Two-factor authentication is now enabled!</span>
        </div>

        <p class="backup-warning">
          <strong>Important:</strong> Save these backup codes in a secure location.
          Each code can only be used once if you lose access to your authenticator app.
        </p>

        <div class="backup-codes-container">
          <div v-for="code in backupCodes" :key="code" class="backup-code">
            {{ code }}
          </div>
        </div>

        <div class="backup-actions">
          <button type="button" class="btn-secondary" @click="downloadBackupCodes">
            Download Codes
          </button>
          <button type="button" class="btn-secondary" @click="copyBackupCodes">
            {{ copiedBackup ? 'Copied!' : 'Copy All' }}
          </button>
        </div>

        <div class="confirmation-checkbox">
          <input
            id="savedCodes"
            v-model="savedCodesConfirmed"
            type="checkbox"
          />
          <label for="savedCodes">I have saved my backup codes in a secure location</label>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="step === 'setup'" class="footer-buttons">
        <Button variant="secondary" @click="handleClose">Cancel</Button>
        <Button
          variant="success"
          :disabled="verificationCode.length !== 6 || verifying"
          @click="verifyAndEnable"
        >
          {{ verifying ? 'Verifying...' : 'Verify & Enable' }}
        </Button>
      </div>
      <div v-else class="footer-buttons">
        <Button
          variant="success"
          :disabled="!savedCodesConfirmed"
          @click="handleComplete"
        >
          Done
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import Button from '@/components/common/Button.vue';
import FormInput from '@/components/common/FormInput.vue';
import { useApi } from '@/composables/useApi.js';

const props = defineProps({
  isOpen: { type: Boolean, required: true },
});

const emit = defineEmits(['close', 'enabled']);

const { get, post } = useApi();

// State
const step = ref('setup');
const loading = ref(false);
const verifying = ref(false);
const error = ref(null);
const qrCode = ref(null);
const secret = ref(null);
const verificationCode = ref('');
const backupCodes = ref([]);
const copied = ref(false);
const copiedBackup = ref(false);
const savedCodesConfirmed = ref(false);

// Fetch QR code when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await setupTOTP();
  } else {
    resetState();
  }
});

onMounted(async () => {
  if (props.isOpen) {
    await setupTOTP();
  }
});

async function setupTOTP() {
  loading.value = true;
  error.value = null;

  try {
    const response = await post('/api/auth/totp/setup');
    qrCode.value = response.data.qrCode;
    secret.value = response.data.secret;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to generate QR code';
  } finally {
    loading.value = false;
  }
}

async function verifyAndEnable() {
  if (verificationCode.value.length !== 6) return;

  verifying.value = true;
  error.value = null;

  try {
    const response = await post('/api/auth/totp/enable', {
      token: verificationCode.value,
    });

    backupCodes.value = response.data.backupCodes;
    step.value = 'backup';
  } catch (err) {
    error.value = err.response?.data?.message || 'Invalid verification code';
  } finally {
    verifying.value = false;
  }
}

function copySecret() {
  navigator.clipboard.writeText(secret.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function copyBackupCodes() {
  const codesText = backupCodes.value.join('\n');
  navigator.clipboard.writeText(codesText);
  copiedBackup.value = true;
  setTimeout(() => { copiedBackup.value = false; }, 2000);
}

function downloadBackupCodes() {
  const codesText = `TriviaForge Backup Codes\n========================\n\nSave these codes in a secure location.\nEach code can only be used once.\n\n${backupCodes.value.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;

  const blob = new Blob([codesText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'triviaforge-backup-codes.txt';
  link.click();
  URL.revokeObjectURL(url);
}

function handleClose() {
  if (step.value === 'backup') {
    // Already enabled, emit success
    emit('enabled');
  }
  emit('close');
}

function handleComplete() {
  emit('enabled');
  emit('close');
}

function resetState() {
  step.value = 'setup';
  loading.value = false;
  verifying.value = false;
  error.value = null;
  qrCode.value = null;
  secret.value = null;
  verificationCode.value = '';
  backupCodes.value = [];
  copied.value = false;
  copiedBackup.value = false;
  savedCodesConfirmed.value = false;
}
</script>

<style scoped>
.two-factor-setup {
  padding: 1rem 0;
}

.step-description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  text-align: center;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-tertiary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: var(--info-light);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.qr-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.qr-code {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  background: white;
  padding: 8px;
}

.manual-entry {
  text-align: center;
  margin-bottom: 1.5rem;
}

.manual-label {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin-bottom: 0.5rem;
}

.secret-code {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-overlay-20);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.secret-code code {
  font-family: monospace;
  font-size: 0.95rem;
  color: var(--info-light);
  letter-spacing: 1px;
}

.btn-copy {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.verification-section {
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.verification-section label {
  display: block;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.code-input-wrapper {
  max-width: 200px;
  margin: 0 auto;
}

.code-input-wrapper :deep(input) {
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 0.5rem;
  font-family: monospace;
}

.error-message {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
}

/* Backup step styles */
.backup-step {
  text-align: center;
}

.success-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.success-icon {
  font-size: 1.5rem;
}

.backup-warning {
  color: var(--warning-light);
  background: var(--warning-bg-10);
  border: 1px solid var(--warning-light);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  text-align: left;
}

.backup-codes-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.backup-code {
  font-family: monospace;
  font-size: 1rem;
  background: var(--bg-overlay-20);
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.backup-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.confirmation-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-overlay-10);
  border-radius: 6px;
}

.confirmation-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.confirmation-checkbox label {
  color: var(--text-secondary);
  cursor: pointer;
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-overlay-30);
}
</style>
