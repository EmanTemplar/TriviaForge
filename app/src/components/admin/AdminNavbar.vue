<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <AppIcon name="clipboard-list" class="brand-icon" /> TriviaForge Admin
    </div>

    <div class="navbar-links">
      <router-link to="/admin" class="nav-link" :class="{ 'nav-link--active': $route.path === '/admin' }">
        <AppIcon name="clipboard-list" size="sm" /> Admin
      </router-link>
      <router-link to="/presenter" class="nav-link" :class="{ 'nav-link--active': $route.path === '/presenter' }">
        <AppIcon name="presentation" size="sm" /> Presenter
      </router-link>
      <router-link to="/player" class="nav-link" :class="{ 'nav-link--active': $route.path === '/player' }">
        <AppIcon name="users" size="sm" /> Player
      </router-link>
      <router-link to="/solo" class="nav-link" :class="{ 'nav-link--active': $route.path === '/solo' }">
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </router-link>
      <router-link to="/display" class="nav-link" :class="{ 'nav-link--active': $route.path === '/display' }">
        <AppIcon name="monitor" size="sm" /> Display
      </router-link>
    </div>

    <!-- Account dropdown -->
    <div class="navbar-account" ref="dropdownRef">
      <button class="navbar-account-btn" @click="dropdownOpen = !dropdownOpen">
        <AppIcon name="user" size="sm" /> {{ username || 'Admin' }}
        <AppIcon :name="dropdownOpen ? 'chevron-up' : 'chevron-down'" size="xs" />
      </button>
      <div class="navbar-dropdown" :class="{ open: dropdownOpen }">
        <button class="nav-link" @click="$emit('settings'); dropdownOpen = false">
          <AppIcon name="settings" size="sm" /> Settings
        </button>
        <button class="nav-link nav-link--danger" @click="$emit('logout'); dropdownOpen = false">
          <AppIcon name="log-out" size="sm" /> Logout
        </button>
      </div>
    </div>

    <!-- Hamburger -->
    <button class="navbar-hamburger" @click="$emit('toggle-menu')">
      <AppIcon :name="menuOpen ? 'x' : 'menu'" size="md" />
    </button>

    <!-- Mobile menu -->
    <div class="navbar-mobile-menu" :class="{ open: menuOpen }">
      <router-link to="/admin" class="nav-link" :class="{ 'nav-link--active': $route.path === '/admin' }" @click="$emit('toggle-menu')">
        <AppIcon name="clipboard-list" size="sm" /> Admin
      </router-link>
      <router-link to="/presenter" class="nav-link" :class="{ 'nav-link--active': $route.path === '/presenter' }" @click="$emit('toggle-menu')">
        <AppIcon name="presentation" size="sm" /> Presenter
      </router-link>
      <router-link to="/player" class="nav-link" :class="{ 'nav-link--active': $route.path === '/player' }" @click="$emit('toggle-menu')">
        <AppIcon name="users" size="sm" /> Player
      </router-link>
      <router-link to="/solo" class="nav-link" :class="{ 'nav-link--active': $route.path === '/solo' }" @click="$emit('toggle-menu')">
        <AppIcon name="gamepad-2" size="sm" /> Solo
      </router-link>
      <router-link to="/display" class="nav-link" :class="{ 'nav-link--active': $route.path === '/display' }" @click="$emit('toggle-menu')">
        <AppIcon name="monitor" size="sm" /> Display
      </router-link>
      <div class="nav-separator"></div>
      <button class="nav-link" @click="$emit('settings'); $emit('toggle-menu')">
        <AppIcon name="settings" size="sm" /> Settings
      </button>
      <button class="nav-link nav-link--danger" @click="$emit('logout'); $emit('toggle-menu')">
        <AppIcon name="log-out" size="sm" /> Logout
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';

defineProps({
  username: { type: String, default: 'Admin' },
  menuOpen: { type: Boolean, required: true }
});

defineEmits(['toggle-menu', 'logout', 'settings']);

const dropdownOpen = ref(false);
const dropdownRef = ref(null);

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    dropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Hide account dropdown on mobile (shown in mobile menu instead) */
@media (max-width: 1024px) {
  .navbar-account {
    display: none;
  }
}
</style>
