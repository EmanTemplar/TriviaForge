<template>
  <div id="app-container">
    <RouterView />
    <Notification />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import Notification from '@/components/common/Notification.vue'
</script>

<style scoped>
#app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
