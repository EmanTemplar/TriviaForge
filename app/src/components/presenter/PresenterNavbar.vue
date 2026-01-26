<template>
  <nav class="navbar">
    <div class="logo">Trivia Presenter</div>
    <div class="room-code" v-if="currentRoomCode">Room: {{ currentRoomCode }}</div>
    <div v-else class="room-code"></div>
    <div class="hamburger" @click.stop="$emit('toggleMenu')" id="hamburger">&#9776;</div>
    <ul class="menu" :class="{ open: menuOpen }" id="menu">
      <li><RouterLink to="/admin">Admin</RouterLink></li>
      <li><RouterLink to="/player">Player</RouterLink></li>
      <li><RouterLink to="/presenter/room">Presenter</RouterLink></li>
      <li><RouterLink to="/display">Spectate</RouterLink></li>
      <li class="account-dropdown">
        <button class="account-button" @click.stop="toggleDropdown">
          <span class="account-name">{{ username || 'Admin' }}</span>
          <span class="dropdown-arrow">{{ dropdownOpen ? '▲' : '▼' }}</span>
        </button>
        <div v-if="dropdownOpen" class="dropdown-menu">
          <a href="#" @click.prevent="handleSettings" class="dropdown-item">
            <span class="dropdown-icon">⚙️</span> Account Settings
          </a>
          <a href="#" @click.prevent="handleLogout" class="dropdown-item logout-item">
            <span class="dropdown-icon">🚪</span> Logout
          </a>
        </div>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

defineProps({
  currentRoomCode: { type: String, default: null },
  menuOpen: { type: Boolean, default: false },
  username: { type: String, default: '' }
})

const emit = defineEmits(['toggleMenu', 'logout', 'settings'])

const dropdownOpen = ref(false)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleSettings = () => {
  closeDropdown()
  emit('settings')
}

const handleLogout = () => {
  closeDropdown()
  emit('logout')
}

// Handle clicks outside the dropdown
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.account-dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.navbar {
  background: var(--bg-secondary);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  position: relative;
  z-index: 100;
}

.logo {
  font-weight: bold;
  font-size: 1.2rem;
  color: var(--info-light);
}

.room-code {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  flex: 1;
  text-align: center;
  min-height: 20px;
}

.hamburger {
  display: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--info-light);
}

.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
  align-items: center;
}

.menu li {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.menu a {
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu a:hover {
  background: var(--info-bg-20);
}

/* Account Dropdown */
.account-dropdown {
  position: relative;
}

.account-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--info-bg-20);
  border: 1px solid var(--info-light);
  border-radius: 8px;
  color: var(--info-light);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.account-button:hover {
  background: var(--info-bg-30);
}

.dropdown-arrow {
  font-size: 0.7rem;
  opacity: 0.7;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 180px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--bg-overlay-50);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.dropdown-item:hover {
  background: var(--bg-overlay-20);
  color: var(--info-light);
}

.dropdown-icon {
  font-size: 1rem;
}

.dropdown-item.logout-item {
  border-top: 1px solid var(--border-color);
  color: var(--danger-light);
}

.dropdown-item.logout-item:hover {
  background: var(--danger-bg-10);
  color: var(--danger-color);
}

@media (max-width: 1024px) {
  .hamburger {
    display: block !important;
    z-index: 101;
  }

  .menu {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem;
    gap: 0.5rem;
    display: none !important;
    z-index: 99;
  }

  .menu.open {
    display: flex !important;
  }

  .menu li {
    width: 100%;
    white-space: normal;
  }

  .menu a {
    display: block;
    padding: 0.75rem;
    width: 100%;
    border-radius: 8px;
  }

  /* Mobile dropdown adjustments */
  .account-dropdown {
    width: 100%;
  }

  .account-button {
    width: 100%;
    justify-content: space-between;
  }

  .dropdown-menu {
    position: static;
    width: 100%;
    margin-top: 0.5rem;
    box-shadow: none;
    border: 1px solid var(--border-color);
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }

  .logo {
    font-size: 1rem;
  }
}
</style>
