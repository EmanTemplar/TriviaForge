<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <AppIcon name="bar-chart-3" class="brand-icon" />
      <span>TriviaForge Stats</span>
    </div>

    <div class="navbar-links">
      <!-- Admin links -->
      <RouterLink
        v-if="authStore.userRole === 'admin'"
        to="/admin"
        class="nav-link nav-link--admin"
        :class="{ 'nav-link--active': route.path.startsWith('/admin') }"
      >
        <AppIcon name="clipboard-list" size="sm" /> Admin
      </RouterLink>
      <RouterLink
        v-if="authStore.userRole === 'admin'"
        to="/presenter"
        class="nav-link nav-link--admin"
        :class="{ 'nav-link--active': route.path.startsWith('/presenter') }"
      >
        <AppIcon name="presentation" size="sm" /> Presenter
      </RouterLink>

      <span v-if="authStore.userRole === 'admin'" class="nav-separator" />

      <!-- Always visible links -->
      <RouterLink
        to="/player"
        class="nav-link"
        :class="{ 'nav-link--active': route.path.startsWith('/player') }"
      >
        <AppIcon name="users" size="sm" /> Multiplayer
      </RouterLink>
      <RouterLink
        to="/solo"
        class="nav-link"
        :class="{ 'nav-link--active': route.path.startsWith('/solo') }"
      >
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </RouterLink>
    </div>

    <div class="navbar-actions">
      <button
        v-if="showLogout"
        class="nav-link nav-link--danger"
        @click="$emit('logout')"
      >
        <AppIcon name="log-out" size="sm" /> Logout
      </button>
    </div>

    <!-- Hamburger -->
    <button class="navbar-hamburger" @click="menuOpen = !menuOpen" aria-label="Toggle menu">
      <AppIcon :name="menuOpen ? 'x' : 'menu'" size="sm" />
    </button>

    <!-- Mobile menu -->
    <div class="navbar-mobile-menu" :class="{ open: menuOpen }">
      <RouterLink
        v-if="authStore.userRole === 'admin'"
        to="/admin"
        class="nav-link nav-link--admin"
        :class="{ 'nav-link--active': route.path.startsWith('/admin') }"
        @click="menuOpen = false"
      >
        <AppIcon name="clipboard-list" size="sm" /> Admin
      </RouterLink>
      <RouterLink
        v-if="authStore.userRole === 'admin'"
        to="/presenter"
        class="nav-link nav-link--admin"
        :class="{ 'nav-link--active': route.path.startsWith('/presenter') }"
        @click="menuOpen = false"
      >
        <AppIcon name="presentation" size="sm" /> Presenter
      </RouterLink>

      <RouterLink
        to="/player"
        class="nav-link"
        :class="{ 'nav-link--active': route.path.startsWith('/player') }"
        @click="menuOpen = false"
      >
        <AppIcon name="users" size="sm" /> Multiplayer
      </RouterLink>
      <RouterLink
        to="/solo"
        class="nav-link"
        :class="{ 'nav-link--active': route.path.startsWith('/solo') }"
        @click="menuOpen = false"
      >
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </RouterLink>

      <span v-if="showLogout" class="nav-separator" />

      <button
        v-if="showLogout"
        class="nav-link nav-link--danger"
        @click="$emit('logout'); menuOpen = false"
      >
        <AppIcon name="log-out" size="sm" /> Logout
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import AppIcon from '@/components/common/AppIcon.vue'

defineProps({
  showLogout: { type: Boolean, default: false }
})

defineEmits(['logout'])

const route = useRoute()
const authStore = useAuthStore()
const menuOpen = ref(false)

// Click outside to close mobile menu
const closeMenu = (e) => {
  if (menuOpen.value && !e.target.closest('.navbar')) {
    menuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
</script>

<style scoped>
/* All base styles from navbars.css — only component-specific overrides here */
</style>
