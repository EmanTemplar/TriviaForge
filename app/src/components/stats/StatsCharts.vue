<template>
  <div class="stats-charts">
    <div class="chart-card">
      <h3><AppIcon name="target" size="sm" /> Accuracy Over Time</h3>
      <div v-if="hasData" class="chart-wrapper">
        <Line :data="accuracyChartData" :options="chartOptions" />
      </div>
      <div v-else class="chart-empty">
        <AppIcon name="line-chart" size="2xl" />
        <p>Play more games to see your accuracy trend</p>
      </div>
    </div>
    <div class="chart-card">
      <h3><AppIcon name="trophy" size="sm" /> Score Trend</h3>
      <div v-if="hasData" class="chart-wrapper">
        <Line :data="scoreChartData" :options="chartOptions" />
      </div>
      <div v-else class="chart-empty">
        <AppIcon name="line-chart" size="2xl" />
        <p>Play more games to see your score trend</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import AppIcon from '@/components/common/AppIcon.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  chartData: {
    type: Array,
    default: () => []
  }
})

// Theme colors (read from CSS custom properties)
const themeColors = ref({
  accent: '#3b82f6',
  secondary: '#22c55e',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  border: '#374151',
  bg: '#1f2937'
})

onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  themeColors.value = {
    accent: style.getPropertyValue('--info-light').trim() || '#3b82f6',
    secondary: style.getPropertyValue('--secondary-light').trim() || '#22c55e',
    text: style.getPropertyValue('--text-primary').trim() || '#e5e7eb',
    textMuted: style.getPropertyValue('--text-muted').trim() || '#9ca3af',
    border: style.getPropertyValue('--border-color').trim() || '#374151',
    bg: style.getPropertyValue('--bg-secondary').trim() || '#1f2937'
  }
})

const hasData = computed(() => props.chartData.length >= 1)

const labels = computed(() =>
  props.chartData.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
)

const accuracyChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Accuracy %',
    data: props.chartData.map(d => d.accuracy),
    borderColor: themeColors.value.secondary,
    backgroundColor: themeColors.value.secondary + '20',
    tension: 0.3,
    fill: true,
    pointRadius: 4,
    pointHoverRadius: 6
  }]
}))

const scoreChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Best Score',
    data: props.chartData.map(d => d.bestScore),
    borderColor: themeColors.value.accent,
    backgroundColor: themeColors.value.accent + '20',
    tension: 0.3,
    fill: true,
    pointRadius: 4,
    pointHoverRadius: 6
  }]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: themeColors.value.bg,
      titleColor: themeColors.value.text,
      bodyColor: themeColors.value.text,
      borderColor: themeColors.value.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      ticks: { color: themeColors.value.textMuted, maxRotation: 45 },
      grid: { color: themeColors.value.border + '40' }
    },
    y: {
      ticks: { color: themeColors.value.textMuted },
      grid: { color: themeColors.value.border + '40' },
      beginAtZero: true
    }
  }
}))
</script>

<style scoped>
.stats-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.chart-card h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.chart-wrapper {
  height: 250px;
  position: relative;
}

.chart-empty {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-muted);
}

.chart-empty p {
  margin: 0;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .stats-charts {
    grid-template-columns: 1fr;
  }
  .chart-wrapper {
    height: 200px;
  }
}
</style>
