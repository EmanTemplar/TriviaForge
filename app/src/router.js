import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

// Pages (will be created in Phase 3+)
// These are placeholder imports that will be added as we create the pages
const LoginPage = { template: '<div>Login Page</div>' }
const AdminPage = { template: '<div>Admin Page</div>' }
const PresenterPage = { template: '<div>Presenter Page</div>' }
const PlayerPage = { template: '<div>Player Page</div>' }
const PlayerManagePage = { template: '<div>Player Management Page</div>' }
const DisplayPage = { template: '<div>Display Page</div>' }

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
    path: '/presenter/:roomCode',
    name: 'presenter',
    component: PresenterPage,
    meta: { requiresAuth: true, requiredRole: 'presenter' }
  },
  {
    path: '/player/:roomCode',
    name: 'player',
    component: PlayerPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/manage',
    name: 'player-manage',
    component: PlayerManagePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/display/:roomCode',
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
