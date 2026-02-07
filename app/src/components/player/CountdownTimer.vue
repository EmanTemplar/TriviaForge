<template>
  <div class="countdown-timer">
    <div class="timer-bar-container">
      <div
        class="timer-bar"
        :class="{
          'warning': percentRemaining <= 50 && percentRemaining > 25,
          'danger': percentRemaining <= 25,
          'pulse': remainingSeconds <= 5 && remainingSeconds > 0 && !paused,
          'inactive': !active,
          'paused': paused
        }"
        :style="{ width: barWidth }"
      ></div>
    </div>
    <div
      class="timer-text"
      :class="{
        'pulse': remainingSeconds <= 5 && remainingSeconds > 0,
        'expired': remainingSeconds <= 0
      }"
    >
      {{ displayText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  startedAt: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  paused: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['expired']);

const remainingSeconds = ref(props.duration);
const percentRemaining = ref(100);
let animationFrameId = null;
let intervalId = null;
let hasExpired = false;

const barWidth = computed(() => `${Math.max(0, percentRemaining.value)}%`);

const displayText = computed(() => {
  if (remainingSeconds.value <= 0) {
    return "Time's Up!";
  }
  if (props.paused) {
    return `⏸ ${remainingSeconds.value}s`;
  }
  return `${remainingSeconds.value}s`;
});

function calculateTimeRemaining() {
  const startTime = new Date(props.startedAt).getTime();
  const now = Date.now();
  const elapsed = (now - startTime) / 1000;
  const remaining = Math.max(0, props.duration - elapsed);

  return {
    seconds: Math.ceil(remaining),
    percent: (remaining / props.duration) * 100
  };
}

function updateBar() {
  if (!props.active || props.paused) {
    return;
  }

  const { percent } = calculateTimeRemaining();
  percentRemaining.value = Math.max(0, percent);

  if (percentRemaining.value > 0) {
    animationFrameId = requestAnimationFrame(updateBar);
  }
}

function updateText() {
  if (!props.active || props.paused) {
    return;
  }

  const { seconds } = calculateTimeRemaining();
  remainingSeconds.value = seconds;

  if (seconds <= 0 && !hasExpired) {
    hasExpired = true;
    emit('expired');
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}

function startTimer() {
  stopTimer();
  hasExpired = false;

  // Initial update
  const { seconds, percent } = calculateTimeRemaining();
  remainingSeconds.value = seconds;
  percentRemaining.value = Math.max(0, percent);

  // Start smooth bar animation
  animationFrameId = requestAnimationFrame(updateBar);

  // Start text updates every second
  intervalId = setInterval(updateText, 1000);
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

watch(() => [props.startedAt, props.duration], () => {
  // Only restart timer if not paused
  if (!props.paused) {
    startTimer();
  }
}, { immediate: false });

watch(() => props.active, (isActive) => {
  if (isActive && !props.paused) {
    startTimer();
  } else {
    stopTimer();
  }
});

watch(() => props.paused, (isPaused) => {
  if (isPaused) {
    stopTimer();
  } else if (props.active) {
    startTimer();
  }
});

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.countdown-timer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timer-bar-container {
  width: 100%;
  height: 32px;
  background-color: var(--bg-overlay-20);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.timer-bar {
  height: 100%;
  background-color: var(--secondary-light);
  transition: background-color 0.3s ease;
  border-radius: 5px;
}

.timer-bar.warning {
  background-color: var(--warning-light);
}

.timer-bar.danger {
  background-color: var(--danger-light);
}

.timer-bar.inactive {
  opacity: 0.5;
}

.timer-bar.paused {
  opacity: 0.7;
  animation: pausedPulse 1.5s ease-in-out infinite;
}

@keyframes pausedPulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.4;
  }
}

.timer-bar.pulse {
  animation: pulse 0.8s ease-in-out infinite;
}

.timer-text {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.timer-text.pulse {
  animation: textPulse 0.8s ease-in-out infinite;
}

.timer-text.expired {
  color: var(--danger-light);
  font-weight: 700;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes textPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@media (max-width: 768px) {
  .timer-bar-container {
    height: 28px;
  }

  .timer-text {
    font-size: 1rem;
  }
}
</style>
