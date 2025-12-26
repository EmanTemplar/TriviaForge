<template>
  <section>
    <h2>User Management</h2>
    <p class="section-description">View and manage all user accounts</p>

    <div class="users-header">
      <button @click="$emit('refresh')" class="btn-refresh">🔄 Refresh Users</button>
      <div class="user-count">{{ totalUsers }} total user(s)</div>
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
      @delete="$emit('deleteUser', $event)"
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
import { computed } from 'vue';
import UserCategorySection from './UserCategorySection.vue';

const props = defineProps({
  adminUsers: { type: Array, required: true },
  playerUsers: { type: Array, required: true },
  guestUsers: { type: Array, required: true },
  formatDate: { type: Function, required: true }
});

defineEmits(['refresh', 'deleteUser', 'resetPassword', 'downgrade']);

const totalUsers = computed(() => {
  return props.adminUsers.length + props.playerUsers.length + props.guestUsers.length;
});
</script>

<style scoped>
section {
  padding: 2rem;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: #4fc3f7;
  font-size: 1.8rem;
}

.section-description {
  color: #aaa;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.user-count {
  color: #4fc3f7;
  font-weight: 500;
  font-size: 1rem;
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
