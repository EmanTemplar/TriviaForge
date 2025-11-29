<template>
  <div id="app-container">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style scoped>
#app-container {
  width: 100%;
  height: 100vh;
}
</style>
