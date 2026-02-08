<template>
  <section class="health-section">
    <div class="health-header">
      <h2>Session Health</h2>
      <div class="header-actions">
        <div class="auto-refresh-toggle">
          <label class="toggle-label">
            <input type="checkbox" v-model="autoRefresh" @change="toggleAutoRefresh" />
            <span class="toggle-text">Auto-refresh</span>
          </label>
        </div>
        <button class="refresh-btn" @click="fetchStats" :disabled="loading">
          <AppIcon :name="loading ? 'loader' : 'refresh-cw'" size="sm" :class="{ spinning: loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-box">
      <AppIcon name="alert-circle" size="lg" />
      <span>{{ error }}</span>
      <button class="retry-btn" @click="fetchStats">Retry</button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading && !stats" class="loading-box">
      <AppIcon name="loader" size="xl" class="spinning" />
      <span>Loading server statistics...</span>
    </div>

    <!-- Stats Content -->
    <template v-else-if="stats">
      <!-- Memory & Uptime Row -->
      <div class="stats-grid">
        <!-- Memory Usage Card -->
        <div class="stats-card">
          <h3><AppIcon name="cpu" size="lg" /> Memory Usage</h3>
          <div class="memory-bars">
            <div class="memory-item">
              <div class="memory-header">
                <span class="memory-label">Heap Used</span>
                <span class="memory-value">{{ stats.memory.heapUsedMB }} MB</span>
              </div>
              <div class="memory-bar">
                <div
                  class="memory-fill"
                  :class="getMemoryClass(stats.memory.heapUsedMB, stats.memory.heapTotalMB)"
                  :style="{ width: `${(stats.memory.heapUsedMB / stats.memory.heapTotalMB) * 100}%` }"
                ></div>
              </div>
              <div class="memory-total">of {{ stats.memory.heapTotalMB }} MB total</div>
            </div>
            <div class="memory-item">
              <div class="memory-header">
                <span class="memory-label">RSS (Resident Set)</span>
                <span class="memory-value">{{ stats.memory.rssMB }} MB</span>
              </div>
            </div>
            <div class="memory-item">
              <div class="memory-header">
                <span class="memory-label">External</span>
                <span class="memory-value">{{ stats.memory.externalMB }} MB</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Server Uptime Card -->
        <div class="stats-card">
          <h3><AppIcon name="clock" size="lg" /> Server Uptime</h3>
          <div class="uptime-display">
            <div class="uptime-value">{{ stats.uptime.formatted }}</div>
            <div class="uptime-label">{{ formatSeconds(stats.uptime.seconds) }}</div>
          </div>
          <div class="uptime-since">
            <span class="since-label">Running since</span>
            <span class="since-value">{{ calculateStartTime(stats.uptime.seconds) }}</span>
          </div>
        </div>
      </div>

      <!-- Session Counts -->
      <div class="stats-card sessions-card">
        <h3><AppIcon name="users" size="lg" /> Session Counts</h3>
        <div class="session-grid">
          <div class="session-item" :class="{ highlight: stats.sessions.liveRooms > 0 }">
            <div class="session-value">{{ stats.sessions.liveRooms }}</div>
            <div class="session-label">Live Rooms</div>
          </div>
          <div class="session-item">
            <div class="session-value">{{ stats.sessions.playerSessions }}</div>
            <div class="session-label">Player Sessions</div>
          </div>
          <div class="session-item">
            <div class="session-value">{{ stats.sessions.socketToPlayer }}</div>
            <div class="session-label">Socket Mappings</div>
          </div>
          <div class="session-item">
            <div class="session-value">{{ stats.sessions.roomSessions }}</div>
            <div class="session-label">Room Sessions</div>
          </div>
          <div class="session-item">
            <div class="session-value">{{ stats.sessions.socketRateLimits }}</div>
            <div class="session-label">Rate Limit Entries</div>
          </div>
          <div class="session-item">
            <div class="session-value">{{ stats.sessions.autoSaveIntervals }}</div>
            <div class="session-label">Auto-Save Active</div>
          </div>
        </div>
      </div>

      <!-- Live Rooms Details -->
      <div class="stats-card rooms-card">
        <h3><AppIcon name="monitor" size="lg" /> Live Rooms ({{ stats.liveRoomDetails.length }})</h3>
        <div v-if="stats.liveRoomDetails.length === 0" class="no-rooms">
          <AppIcon name="inbox" size="xl" />
          <span>No active rooms</span>
        </div>
        <div v-else class="rooms-table-wrapper">
          <table class="rooms-table">
            <thead>
              <tr>
                <th>Room Code</th>
                <th>Quiz</th>
                <th>Players</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="room in stats.liveRoomDetails" :key="room.roomCode">
                <td class="room-code">{{ room.roomCode }}</td>
                <td class="quiz-title">{{ truncate(room.quizTitle, 30) }}</td>
                <td class="player-count">{{ room.playerCount }}</td>
                <td class="progress">
                  <span v-if="room.currentQuestion !== null">
                    {{ room.currentQuestion + 1 }} / {{ room.totalQuestions }}
                  </span>
                  <span v-else class="not-started">Not started</span>
                </td>
                <td>
                  <span class="status-badge" :class="room.status">{{ room.status }}</span>
                </td>
                <td class="last-activity">{{ formatTimeAgo(room.lastActivityAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Last Updated -->
      <div class="last-updated">
        Last updated: {{ formatTimestamp(stats.timestamp) }}
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useApi } from '@/composables/useApi.js'

const { get } = useApi()

const stats = ref(null)
const loading = ref(false)
const error = ref(null)
const autoRefresh = ref(false)
let refreshInterval = null

const fetchStats = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await get('/api/admin/memory')
    if (response.data.success) {
      stats.value = response.data.data
    } else {
      error.value = response.data.error || 'Failed to fetch statistics'
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to connect to server'
  } finally {
    loading.value = false
  }
}

const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    refreshInterval = setInterval(fetchStats, 10000) // Every 10 seconds
  } else {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

const getMemoryClass = (used, total) => {
  const ratio = used / total
  if (ratio > 0.9) return 'critical'
  if (ratio > 0.7) return 'warning'
  return 'healthy'
}

const formatSeconds = (seconds) => {
  return `${seconds.toLocaleString()} seconds`
}

const calculateStartTime = (uptimeSeconds) => {
  const startTime = new Date(Date.now() - uptimeSeconds * 1000)
  return startTime.toLocaleString()
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown'

  const now = Date.now()
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  const diff = Math.floor((now - time) / 1000)

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const truncate = (str, maxLength) => {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
}

onMounted(() => {
  fetchStats()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.health-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--primary-color);
}

.health-header h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 2rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.toggle-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s, opacity 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error & Loading States */
.error-box,
.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  background: var(--bg-overlay-10);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.error-box {
  border-color: var(--error-color);
  color: var(--error-color);
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: var(--error-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.stats-card {
  background: var(--bg-overlay-10);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.stats-card h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--primary-color);
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

/* Memory Bars */
.memory-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.memory-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-label {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.memory-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.memory-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.memory-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.memory-fill.healthy {
  background: var(--success-color);
}

.memory-fill.warning {
  background: var(--warning-color);
}

.memory-fill.critical {
  background: var(--error-color);
}

.memory-total {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* Uptime Display */
.uptime-display {
  text-align: center;
  padding: 1rem 0;
}

.uptime-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary);
}

.uptime-label {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.uptime-since {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.85rem;
}

.since-label {
  color: var(--text-tertiary);
}

.since-value {
  color: var(--text-secondary);
}

/* Session Counts */
.sessions-card {
  width: 100%;
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.session-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.session-item.highlight {
  background: var(--primary-bg-10);
  border: 1px solid var(--primary-color);
}

.session-value {
  font-size: 1.75rem;
  font-weight: bold;
  color: var(--text-primary);
}

.session-item.highlight .session-value {
  color: var(--primary-color);
}

.session-label {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  text-align: center;
}

/* Rooms Table */
.rooms-card {
  width: 100%;
}

.no-rooms {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-tertiary);
}

.rooms-table-wrapper {
  overflow-x: auto;
}

.rooms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.rooms-table th,
.rooms-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.rooms-table th {
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rooms-table td {
  color: var(--text-secondary);
}

.room-code {
  font-family: monospace;
  font-weight: 600;
  color: var(--primary-color) !important;
}

.quiz-title {
  max-width: 200px;
}

.player-count {
  text-align: center;
}

.progress {
  font-family: monospace;
}

.not-started {
  color: var(--text-tertiary);
  font-style: italic;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.in_progress,
.status-badge.in-progress {
  background: var(--success-bg-10);
  color: var(--success-color);
}

.status-badge.waiting {
  background: var(--warning-bg-10);
  color: var(--warning-color);
}

.status-badge.completed {
  background: var(--info-bg-10);
  color: var(--info-color);
}

.last-activity {
  font-size: 0.85rem;
  color: var(--text-tertiary) !important;
}

/* Last Updated */
.last-updated {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .health-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .health-header h2 {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .session-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .rooms-table {
    font-size: 0.8rem;
  }

  .rooms-table th,
  .rooms-table td {
    padding: 0.5rem;
  }
}
</style>
