<template>
  <nav class="navbar">
    <!-- Brand -->
    <div class="navbar-brand">
      <AppIcon name="users" size="sm" class="brand-icon" />
      TriviaForge Player
    </div>

    <!-- Center: progress button and question counter -->
    <div class="nav-progress-container">
      <span v-if="inRoom && totalQuestions > 0" class="question-counter">
        {{ revealedCount }} / {{ totalQuestions }}
      </span>
      <button v-if="inRoom" id="progressBtn" class="progress-btn" @click="$emit('showProgress')">
        <AppIcon name="bar-chart-3" size="sm" /> Progress
      </button>
    </div>

    <!-- Desktop links -->
    <div class="navbar-links">
      <template v-if="authStore.userRole === 'admin'">
        <RouterLink to="/admin" class="nav-link" :class="{ 'nav-link--active': route.path === '/admin' }">
          <AppIcon name="clipboard-list" size="sm" /> Admin
        </RouterLink>
        <RouterLink to="/presenter" class="nav-link" :class="{ 'nav-link--active': route.path === '/presenter' }">
          <AppIcon name="presentation" size="sm" /> Presenter
        </RouterLink>
        <span class="nav-separator"></span>
      </template>

      <RouterLink to="/display" class="nav-link" :class="{ 'nav-link--active': route.path === '/display' }">
        <AppIcon name="monitor" size="sm" /> Spectate
      </RouterLink>

      <RouterLink v-if="loginUsername" to="/stats" class="nav-link" :class="{ 'nav-link--active': route.path === '/stats' }">
        <AppIcon name="bar-chart-3" size="sm" /> My Stats
      </RouterLink>

      <RouterLink to="/solo" class="nav-link" :class="{ 'nav-link--active': route.path === '/solo' }">
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </RouterLink>
    </div>

    <!-- Actions: room code, connection status, theme, hamburger -->
    <div class="navbar-actions">
      <template v-if="inRoom">
        <span class="navbar-room-code">{{ currentRoomCode || '----' }}</span>
        <span class="connection-status" :class="connectionStateClass">{{ connectionStateSymbol }}</span>
      </template>

      <ThemeSelector />

      <button class="navbar-hamburger" @click="$emit('toggleMenu')" aria-label="Toggle menu">
        <AppIcon :name="menuOpen ? 'x' : 'menu'" size="sm" />
      </button>
    </div>

    <!-- Mobile menu -->
    <div class="navbar-mobile-menu" :class="{ open: menuOpen }">
      <template v-if="authStore.userRole === 'admin'">
        <RouterLink to="/admin" class="nav-link" :class="{ 'nav-link--active': route.path === '/admin' }" @click="$emit('toggleMenu')">
          <AppIcon name="clipboard-list" size="sm" /> Admin
        </RouterLink>
        <RouterLink to="/presenter" class="nav-link" :class="{ 'nav-link--active': route.path === '/presenter' }" @click="$emit('toggleMenu')">
          <AppIcon name="presentation" size="sm" /> Presenter
        </RouterLink>
      </template>

      <RouterLink to="/display" class="nav-link" :class="{ 'nav-link--active': route.path === '/display' }" @click="$emit('toggleMenu')">
        <AppIcon name="monitor" size="sm" /> Spectate / Display
      </RouterLink>

      <RouterLink v-if="loginUsername" to="/stats" class="nav-link" :class="{ 'nav-link--active': route.path === '/stats' }" @click="$emit('toggleMenu')">
        <AppIcon name="bar-chart-3" size="sm" /> My Stats
      </RouterLink>

      <RouterLink to="/solo" class="nav-link" :class="{ 'nav-link--active': route.path === '/solo' }" @click="$emit('toggleMenu')">
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </RouterLink>

      <template v-if="inRoom">
        <span class="nav-separator"></span>
        <a href="#" class="nav-link nav-link--danger" @click.prevent="$emit('leaveRoom'); $emit('toggleMenu')">
          <AppIcon name="log-out" size="sm" /> Leave Room
        </a>

        <!-- Players list (mobile only) -->
        <div class="mobile-players-section">
          <div class="mobile-players-label">Players in Room</div>
          <div class="menu-players">
            <div v-for="(player, idx) in nonSpectatorPlayers" :key="player.id" class="player-item">
              <span>{{ idx + 1 }}.</span>
              <span class="player-status" :class="{ online: player.connected, offline: !player.connected }">●</span>
              <span>{{ player.name }}</span>
              <AppIcon v-if="player.choice !== null" name="check" size="sm" class="player-answered" />
            </div>
            <em v-if="nonSpectatorPlayers.length === 0">Not in a room yet</em>
          </div>
        </div>
      </template>

      <template v-if="loginUsername">
        <span class="nav-separator"></span>
        <a href="#" class="nav-link nav-link--danger" @click.prevent="$emit('logout'); $emit('toggleMenu')">
          <AppIcon name="log-out" size="sm" /> Logout
        </a>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink, useRoute } from 'vue-router';
import ThemeSelector from './ThemeSelector.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { useAuthStore } from '@/stores/auth.js';

const route = useRoute();
const authStore = useAuthStore();

defineProps({
  inRoom: { type: Boolean, required: true },
  currentRoomCode: { type: String, default: null },
  connectionStateClass: { type: String, required: true },
  connectionStateSymbol: { type: String, required: true },
  menuOpen: { type: Boolean, required: true },
  nonSpectatorPlayers: { type: Array, required: true },
  loginUsername: { type: String, default: '' },
  revealedCount: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 }
});

defineEmits(['showProgress', 'toggleMenu', 'leaveRoom', 'logout']);
</script>

<style scoped>
/* Center area: progress button + question counter */
.nav-progress-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}

.question-counter {
  padding: 0.25rem 0.65rem;
  background: var(--bg-overlay-10);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.progress-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.85rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.2s;
}

.progress-btn:hover {
  background: var(--info-bg-30);
}

/* Connection status indicator */
.connection-status {
  font-size: 1.1rem;
  transition: color 0.2s;
  flex-shrink: 0;
}

.connection-status.status-connected {
  color: var(--secondary-light);
}

.connection-status.status-away {
  color: var(--warning-light);
}

.connection-status.status-disconnected {
  color: var(--danger-light);
}

.connection-status.status-warning {
  color: var(--warning-light);
  animation: pulse-warning 1.5s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Mobile players section */
.mobile-players-section {
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.mobile-players-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.menu-players {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  padding: 0.4rem 0.5rem;
  background: var(--bg-overlay-10);
  border-radius: 6px;
}

.player-status {
  font-size: 1rem;
  flex-shrink: 0;
}

.player-status.online {
  color: var(--secondary-light);
}

.player-status.offline {
  color: var(--danger-light);
}

.player-answered {
  color: var(--secondary-light);
  margin-left: auto;
}

/* Hide progress container on very small screens if needed */
@media (max-width: 480px) {
  .nav-progress-container {
    display: none;
  }
}
</style>
