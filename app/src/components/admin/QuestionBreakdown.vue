<template>
  <div class="question-breakdown">
    <h4>Question Breakdown</h4>
    <div v-for="(question, qIdx) in questions" :key="qIdx" class="question-detail">
      <div class="question-header">
        <strong>Q{{ qIdx + 1 }}:</strong> {{ question.text }}
      </div>
      <div class="question-choices">
        <div
          v-for="(choice, cIdx) in question.choices"
          :key="cIdx"
          :class="['choice-item', { 'choice-correct': cIdx === question.correctChoice }]"
        >
          <strong>{{ String.fromCharCode(65 + cIdx) }}.</strong> {{ choice }}
          <span v-if="cIdx === question.correctChoice" class="correct-indicator">✓ Correct</span>
        </div>
      </div>
      <div v-if="presentedQuestions && presentedQuestions.includes(qIdx)" class="player-answers">
        <div class="player-answers-header" @click="$emit('toggleQuestion', qIdx)">
          <strong>Player Responses:</strong>
          <span class="toggle-arrow" :class="{ expanded: expandedQuestions.has(qIdx) }">▼</span>
        </div>
        <div v-if="expandedQuestions.has(qIdx)" class="player-responses-grid">
          <div
            v-for="player in playerResults"
            :key="player.name"
            :class="['player-response', {
              'response-correct': player.answers[qIdx] === question.correctChoice,
              'response-incorrect': player.answers[qIdx] !== undefined && player.answers[qIdx] !== question.correctChoice,
              'response-unanswered': player.answers[qIdx] === undefined
            }]"
          >
            <span class="player-name">{{ player.name }}:</span>
            <span class="player-answer">
              <template v-if="player.answers[qIdx] !== undefined">
                {{ String.fromCharCode(65 + player.answers[qIdx]) }}
                <span v-if="player.answers[qIdx] === question.correctChoice" class="answer-result">✓</span>
                <span v-else class="answer-result">✗</span>
              </template>
              <template v-else>
                <em>No answer</em>
              </template>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="not-presented">
        <em>Question not presented</em>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  questions: { type: Array, required: true },
  playerResults: { type: Array, required: true },
  presentedQuestions: { type: Array, default: () => [] },
  expandedQuestions: { type: Set, required: true }
});

defineEmits(['toggleQuestion']);
</script>

<style scoped>
.question-breakdown {
  margin-top: 2rem;
}

.question-breakdown h4 {
  margin: 0 0 1rem 0;
  color: #4fc3f7;
  font-size: 1.1rem;
}

.question-detail {
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.question-header {
  margin-bottom: 0.75rem;
  color: #fff;
  font-size: 1rem;
  line-height: 1.5;
}

.question-header strong {
  color: #4fc3f7;
}

.question-choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.choice-item {
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.choice-item.choice-correct {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
  color: #81c784;
}

.choice-item strong {
  margin-right: 0.5rem;
}

.correct-indicator {
  color: #81c784;
  font-weight: bold;
}

.player-answers {
  margin-top: 1rem;
}

.player-answers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4fc3f7;
  font-weight: 500;
}

.player-answers-header:hover {
  background: rgba(79, 195, 247, 0.15);
}

.toggle-arrow {
  transition: transform 0.2s;
  color: #4fc3f7;
}

.toggle-arrow.expanded {
  transform: rotate(180deg);
}

.player-responses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.player-response {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.player-response.response-correct {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.player-response.response-incorrect {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.player-response.response-unanswered {
  background: rgba(158, 158, 158, 0.1);
  border: 1px solid rgba(158, 158, 158, 0.2);
}

.player-name {
  color: #ccc;
  font-weight: 500;
}

.player-answer {
  color: #fff;
  font-weight: bold;
}

.answer-result {
  margin-left: 0.25rem;
}

.not-presented {
  padding: 1rem;
  text-align: center;
  color: #666;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

@media (max-width: 768px) {
  .player-responses-grid {
    grid-template-columns: 1fr;
  }
}
</style>
