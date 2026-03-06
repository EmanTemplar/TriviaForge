<template>
  <nav class="navbar">
    <!-- Brand -->
    <div class="navbar-brand">
      <AppIcon name="presentation" class="brand-icon" />
      TriviaForge Presenter
    </div>

    <!-- Room code badge -->
    <span v-if="currentRoomCode" class="navbar-room-code">{{ currentRoomCode }}</span>

    <!-- Desktop nav links -->
    <div class="navbar-links">
      <RouterLink
        to="/admin"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/admin' }"
      >
        <AppIcon name="clipboard-list" size="sm" />
        Admin
      </RouterLink>
      <RouterLink
        to="/presenter"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/presenter' }"
      >
        <AppIcon name="presentation" size="sm" />
        Presenter
      </RouterLink>
      <RouterLink
        to="/player"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/player' }"
      >
        <AppIcon name="users" size="sm" />
        Player
      </RouterLink>
      <RouterLink
        to="/solo"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/solo' }"
      >
        <AppIcon name="gamepad-2" size="sm" />
        Solo
      </RouterLink>
      <RouterLink
        to="/display"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/display' }"
      >
        <AppIcon name="monitor" size="sm" />
        Display
      </RouterLink>
    </div>

    <!-- Account dropdown (desktop) -->
    <div class="navbar-account" ref="accountRef">
      <button class="navbar-account-btn" @click.stop="toggleDropdown">
        <AppIcon name="user" size="sm" />
        {{ username || 'Account' }}
        <AppIcon :name="dropdownOpen ? 'chevron-up' : 'chevron-down'" size="sm" />
      </button>
      <div class="navbar-dropdown" :class="{ open: dropdownOpen }">
        <a href="#" class="nav-link" @click.prevent="handleSettings">
          <AppIcon name="settings" size="sm" />
          Settings
        </a>
        <div class="nav-separator" />
        <a href="#" class="nav-link nav-link--danger" @click.prevent="handleLogout">
          <AppIcon name="log-out" size="sm" />
          Logout
        </a>
      </div>
    </div>

    <!-- Hamburger (mobile) -->
    <button class="navbar-hamburger" @click.stop="$emit('toggleMenu')" aria-label="Toggle menu">
      <AppIcon :name="menuOpen ? 'x' : 'menu'" size="md" />
    </button>

    <!-- Mobile menu -->
    <div class="navbar-mobile-menu" :class="{ open: menuOpen }">
      <RouterLink
        to="/admin"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/admin' }"
      >
        <AppIcon name="clipboard-list" size="sm" />
        Admin
      </RouterLink>
      <RouterLink
        to="/presenter"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/presenter' }"
      >
        <AppIcon name="presentation" size="sm" />
        Presenter
      </RouterLink>
      <RouterLink
        to="/player"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/player' }"
      >
        <AppIcon name="users" size="sm" />
        Player
      </RouterLink>
      <RouterLink
        to="/solo"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/solo' }"
      >
        <AppIcon name="gamepad-2" size="sm" />
        Solo
      </RouterLink>
      <RouterLink
        to="/display"
        class="nav-link"
        :class="{ 'nav-link--active': $route.path === '/display' }"
      >
        <AppIcon name="monitor" size="sm" />
        Display
      </RouterLink>
      <div class="nav-separator" />
      <a href="#" class="nav-link" @click.prevent="handleSettings">
        <AppIcon name="settings" size="sm" />
        Settings
      </a>
      <a href="#" class="nav-link nav-link--danger" @click.prevent="handleLogout">
        <AppIcon name="log-out" size="sm" />
        Logout
      </a>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  currentRoomCode: { type: String, default: null },
  menuOpen: { type: Boolean, default: false },
  username: { type: String, default: '' }
})

const emit = defineEmits(['toggleMenu', 'logout', 'settings'])

const dropdownOpen = ref(false)
const accountRef = ref(null)

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

const handleClickOutside = (event) => {
  if (accountRef.value && !accountRef.value.contains(event.target)) {
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
@media (max-width: 1024px) {
  .navbar-account {
    display: none;
  }
}
</style>
