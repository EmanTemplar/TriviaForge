<template>
  <section>
    <h2>Quiz Options</h2>
    <p class="section-description">Configure global quiz settings</p>

    <div class="options-box">
      <h3>Answer Display Timeout</h3>
      <p class="option-description">
        How long to show the revealed answer before auto-hiding (in seconds).
        Players will also see the answer until the next question is presented.
      </p>

      <div class="timeout-input-wrapper">
        <input
          :value="answerDisplayTime"
          @input="$emit('update:answerDisplayTime', Number($event.target.value))"
          type="number"
          min="5"
          max="300"
        />
        <span>seconds</span>
      </div>

      <div class="quick-buttons">
        <button @click="$emit('setQuickTimeout', 10)" class="btn-quick">10s</button>
        <button @click="$emit('setQuickTimeout', 30)" class="btn-quick">30s</button>
        <button @click="$emit('setQuickTimeout', 60)" class="btn-quick">1min</button>
        <button @click="$emit('setQuickTimeout', 120)" class="btn-quick">2min</button>
      </div>

      <button @click="$emit('saveOptions')" class="btn-primary">Save Options</button>

      <div v-if="saveMessage" :class="['options-save-msg', saveMessageType]">
        {{ saveMessage }}
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  answerDisplayTime: { type: Number, required: true },
  saveMessage: { type: String, default: '' },
  saveMessageType: { type: String, default: 'success' }
});

defineEmits(['update:answerDisplayTime', 'setQuickTimeout', 'saveOptions']);
</script>

<style scoped>
section {
  padding: 2rem;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: #4fc3f7;
  font-size: 1.8rem;
}

.section-description {
  color: #aaa;
  margin: 0 0 2rem 0;
  font-size: 0.95rem;
}

.options-box {
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 600px;
}

.options-box h3 {
  margin: 0 0 0.5rem 0;
  color: #4fc3f7;
  font-size: 1.2rem;
}

.option-description {
  color: #ccc;
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.timeout-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.timeout-input-wrapper input {
  width: 100px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  text-align: center;
}

.timeout-input-wrapper span {
  color: #aaa;
}

.quick-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.btn-quick {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-quick:hover {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: rgba(0, 123, 255, 0.3);
  border: 1px solid rgba(0, 123, 255, 0.5);
  border-radius: 8px;
  color: #4fc3f7;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.options-save-msg {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.options-save-msg.success {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.options-save-msg.error {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #ef5350;
}

@media (max-width: 768px) {
  section {
    padding: 1rem;
  }

  .options-box {
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
  }
}
</style>
