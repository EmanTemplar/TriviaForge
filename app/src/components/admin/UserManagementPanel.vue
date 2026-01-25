<template>
  <section>
    <h2>User Management</h2>
    <p class="section-description">View and manage all user accounts</p>

    <div class="users-header">
      <div class="header-buttons">
        <button @click="$emit('refresh')" class="btn-refresh">🔄 Refresh Users</button>
        <button v-if="isRootAdmin" @click="showCreateAdminModal = true" class="btn-create-admin">+ Create Admin</button>
      </div>
      <div class="user-count">{{ totalUsers }} total user(s)</div>
    </div>

    <!-- Create Admin Modal -->
    <div v-if="showCreateAdminModal" class="modal-overlay" @click.self="closeCreateAdminModal">
      <div class="modal-content">
        <h3>Create New Admin</h3>
        <form @submit.prevent="handleCreateAdmin">
          <div class="form-group">
            <label for="newAdminUsername">Username</label>
            <input
              id="newAdminUsername"
              v-model="newAdmin.username"
              type="text"
              placeholder="Enter username"
              required
              minlength="3"
            />
          </div>
          <div class="form-group">
            <label for="newAdminPassword">Password</label>
            <input
              id="newAdminPassword"
              v-model="newAdmin.password"
              type="password"
              placeholder="Enter password"
              required
              minlength="8"
            />
          </div>
          <div class="form-group">
            <label for="newAdminEmail">Email (optional)</label>
            <input
              id="newAdminEmail"
              v-model="newAdmin.email"
              type="email"
              placeholder="Enter email"
            />
          </div>
          <div v-if="createAdminError" class="error-message">{{ createAdminError }}</div>
          <div class="modal-actions">
            <button type="button" @click="closeCreateAdminModal" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-submit" :disabled="isCreatingAdmin">
              {{ isCreatingAdmin ? 'Creating...' : 'Create Admin' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Admins Section -->
    <UserCategorySection
      title="Administrators"
      icon="🔐"
      :users="adminUsers"
      categoryClass="admin-header"
      itemClass="admin-item"
      typeClass="type-admin"
      typeLabel="Admin"
      emptyMessage="No administrators"
      neverSeenMessage="Never logged in"
      :formatDate="formatDate"
      :showDeleteAdmin="isRootAdmin"
      @delete="$emit('deleteUser', $event)"
      @deleteAdmin="$emit('deleteAdmin', $event)"
    />

    <!-- Registered Players Section -->
    <UserCategorySection
      title="Registered Players"
      icon="👤"
      :users="playerUsers"
      categoryClass="player-header"
      itemClass="player-item"
      typeClass="type-player"
      typeLabel="Player"
      emptyMessage="No registered players"
      neverSeenMessage="Never played"
      :showResetPassword="true"
      :showDowngrade="true"
      :formatDate="formatDate"
      @resetPassword="$emit('resetPassword', $event)"
      @downgrade="$emit('downgrade', $event)"
      @delete="$emit('deleteUser', $event)"
    />

    <!-- Guests Section -->
    <UserCategorySection
      title="Guest Users"
      icon="👥"
      :users="guestUsers"
      categoryClass="guest-header"
      itemClass="guest-item"
      typeClass="type-guest"
      typeLabel="Guest"
      emptyMessage="No guest users"
      neverSeenMessage="Never played"
      :formatDate="formatDate"
      @delete="$emit('deleteUser', $event)"
    />
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import UserCategorySection from './UserCategorySection.vue';

const props = defineProps({
  adminUsers: { type: Array, required: true },
  playerUsers: { type: Array, required: true },
  guestUsers: { type: Array, required: true },
  formatDate: { type: Function, required: true },
  isRootAdmin: { type: Boolean, default: false }
});

const emit = defineEmits(['refresh', 'deleteUser', 'resetPassword', 'downgrade', 'createAdmin', 'deleteAdmin']);

const totalUsers = computed(() => {
  return props.adminUsers.length + props.playerUsers.length + props.guestUsers.length;
});

// Create Admin Modal State
const showCreateAdminModal = ref(false);
const isCreatingAdmin = ref(false);
const createAdminError = ref(null);
const newAdmin = reactive({
  username: '',
  password: '',
  email: ''
});

const closeCreateAdminModal = () => {
  showCreateAdminModal.value = false;
  createAdminError.value = null;
  newAdmin.username = '';
  newAdmin.password = '';
  newAdmin.email = '';
};

const handleCreateAdmin = () => {
  if (!newAdmin.username.trim() || !newAdmin.password.trim()) {
    createAdminError.value = 'Username and password are required';
    return;
  }

  if (newAdmin.password.length < 8) {
    createAdminError.value = 'Password must be at least 8 characters';
    return;
  }

  isCreatingAdmin.value = true;
  createAdminError.value = null;

  emit('createAdmin', {
    username: newAdmin.username.trim(),
    password: newAdmin.password,
    email: newAdmin.email.trim() || null
  });
};

// Called by parent when admin creation succeeds
const onAdminCreated = () => {
  isCreatingAdmin.value = false;
  closeCreateAdminModal();
};

// Called by parent when admin creation fails
const onAdminCreateError = (error) => {
  isCreatingAdmin.value = false;
  createAdminError.value = error;
};

// Expose methods for parent to call
defineExpose({ onAdminCreated, onAdminCreateError });
</script>

<style scoped>
section {
  padding: 2rem;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: var(--info-light);
  font-size: 1.8rem;
}

.section-description {
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  font-size: 0.95rem;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.btn-refresh {
  padding: 0.75rem 1.5rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-refresh:hover {
  background: var(--bg-overlay-30);
  color: var(--text-primary);
}

.header-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-create-admin {
  padding: 0.75rem 1.5rem;
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  border-radius: 8px;
  color: var(--secondary-light);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.btn-create-admin:hover {
  background: var(--secondary-bg-30);
}

.user-count {
  color: var(--info-light);
  font-weight: 500;
  font-size: 1rem;
}

/* Create Admin Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  color: var(--secondary-light);
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--secondary-light);
}

.error-message {
  color: var(--danger-light);
  background: var(--danger-bg-10);
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-cancel {
  padding: 0.75rem 1.5rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel:hover {
  background: var(--bg-overlay-20);
}

.btn-submit {
  padding: 0.75rem 1.5rem;
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  border-radius: 6px;
  color: var(--secondary-light);
  cursor: pointer;
  font-weight: 600;
}

.btn-submit:hover:not(:disabled) {
  background: var(--secondary-bg-30);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  section {
    padding: 1rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .users-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-count {
    width: 100%;
  }
}
</style>
