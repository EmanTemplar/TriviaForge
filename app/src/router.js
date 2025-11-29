import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

// Actual page components
import LoginPage from './pages/LoginPage.vue'
import DisplayPage from './pages/DisplayPage.vue'
import PlayerPage from './pages/PlayerPage.vue'
import PresenterPage from './pages/PresenterPage.vue'
import AdminPage from './pages/AdminPage.vue'
import PlayerManagePage from './pages/PlayerManagePage.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: { requiresAuth: true, requiredRole: 'admin' }
  },
  {
    path: '/presenter',
    name: 'presenter',
    component: PresenterPage,
    meta: { requiresAuth: true, requiredRole: 'admin' }
  },
  {
    path: '/player',
    name: 'player',
    component: PlayerPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/manage',
    name: 'player-manage',
    component: PlayerManagePage,
    meta: { requiresAuth: false }
  },
  {
    path: '/display',
    name: 'display',
    component: DisplayPage,
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.token) {
    // Redirect to login if authentication is required but user is not logged in
    next({ name: 'login' })
  } else if (to.meta.requiredRole && authStore.userRole !== to.meta.requiredRole) {
    // Redirect if user doesn't have required role
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
