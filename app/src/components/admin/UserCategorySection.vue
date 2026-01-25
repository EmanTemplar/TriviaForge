<template>
  <div class="user-category">
    <div class="category-header" :class="categoryClass">
      <h3>{{ icon }} {{ title }}</h3>
      <span class="category-count">{{ users.length }}</span>
    </div>
    <div class="users-list-scrollable">
      <div v-if="users.length === 0" class="empty-state"><em>{{ emptyMessage }}</em></div>
      <div v-for="user in users" :key="user.id" class="user-item" :class="itemClass">
        <div class="user-info">
          <div class="user-name">{{ user.username }}</div>
          <div class="user-type" :class="typeClass">{{ typeLabel }}</div>
        </div>
        <div class="user-stats">
          <div v-if="user.lastSeen" class="user-last-login">Last seen: {{ formatDate(user.lastSeen) }}</div>
          <div v-else class="user-last-login">{{ neverSeenMessage }}</div>
        </div>
        <div class="user-actions">
          <button
            v-if="showResetPassword"
            @click="$emit('resetPassword', user)"
            class="btn-reset"
            title="Reset Password"
          >🔑</button>
          <button
            v-if="showDowngrade"
            @click="$emit('downgrade', user)"
            class="btn-downgrade"
            title="Downgrade to Guest"
          >⬇️</button>
          <button
            v-if="showDeleteAdmin && !user.isRootAdmin"
            @click="$emit('deleteAdmin', user)"
            class="btn-delete"
            title="Delete Admin"
          >🗑️</button>
          <button
            v-else-if="showDelete && !user.isRootAdmin"
            @click="$emit('delete', user)"
            class="btn-delete"
            title="Delete User"
          >🗑️</button>
          <span v-if="user.isRootAdmin" class="root-badge" title="Root Administrator">👑</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  users: { type: Array, required: true },
  categoryClass: { type: String, required: true },
  itemClass: { type: String, required: true },
  typeClass: { type: String, required: true },
  typeLabel: { type: String, required: true },
  emptyMessage: { type: String, required: true },
  neverSeenMessage: { type: String, required: true },
  showResetPassword: { type: Boolean, default: false },
  showDowngrade: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: true },
  showDeleteAdmin: { type: Boolean, default: false },
  formatDate: { type: Function, required: true }
});

defineEmits(['resetPassword', 'downgrade', 'delete', 'deleteAdmin']);
</script>

<style scoped>
.user-category {
  margin-bottom: 2rem;
  background: var(--bg-overlay-10);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.category-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.category-header.admin-header {
  background: var(--info-bg-10);
  border-bottom-color: var(--info-light);
}

.category-header.player-header {
  background: var(--secondary-bg-10);
  border-bottom-color: var(--secondary-light);
}

.category-header.guest-header {
  background: var(--bg-tertiary-20);
  border-bottom-color: var(--border-color);
}

.category-count {
  font-weight: bold;
  color: var(--info-light);
  font-size: 1rem;
}

.users-list-scrollable {
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
}

.user-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--bg-overlay-10);
  transition: background 0.2s;
}

.user-item:last-child {
  border-bottom: none;
}

.user-item:hover {
  background: var(--bg-overlay-10);
}

.user-item.admin-item {
  background: var(--info-bg-10);
}

.user-item.player-item {
  background: var(--secondary-bg-10);
}

.user-item.guest-item {
  background: var(--bg-tertiary-20);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 1rem;
}

.user-type {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-type.type-admin {
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.user-type.type-player {
  background: var(--secondary-bg-20);
  border: 1px solid var(--secondary-light);
  color: var(--secondary-light);
}

.user-type.type-guest {
  background: var(--bg-tertiary-30);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.user-stats {
  flex: 1;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.user-last-login {
  color: var(--text-tertiary);
}

.user-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-reset,
.btn-downgrade,
.btn-delete {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-reset {
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  color: var(--info-light);
}

.btn-reset:hover {
  background: var(--info-bg-30);
}

.btn-downgrade {
  background: var(--warning-bg-20);
  border: 1px solid var(--warning-light);
  color: var(--warning-light);
}

.btn-downgrade:hover {
  background: var(--warning-bg-30);
}

.btn-delete {
  background: var(--danger-bg-20);
  border: 1px solid var(--danger-light);
  color: var(--danger-light);
}

.btn-delete:hover {
  background: var(--danger-bg-30);
}

.root-badge {
  font-size: 1.25rem;
  padding: 0.25rem;
}

@media (max-width: 768px) {
  .user-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-info {
    width: 100%;
  }

  .user-stats {
    width: 100%;
  }

  .user-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
