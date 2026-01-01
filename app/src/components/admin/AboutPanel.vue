<template>
  <section class="about-section">
    <div class="about-header">
      <h2>About TriviaForge</h2>
      <div class="version-box">
        <div class="version-label">Version</div>
        <div class="version-number">{{ VERSION }}</div>
      </div>
    </div>

    <div class="about-grid">
      <!-- Features Column -->
      <div class="about-card">
        <h3>✨ Key Features</h3>
        <ul>
          <li>✓ Vue 3 modern interface</li>
          <li>✓ Real-time quiz presentations</li>
          <li>✓ Live leaderboards & rankings</li>
          <li>✓ Independent room architecture</li>
          <li>✓ Player connection monitoring</li>
          <li>✓ Player authentication & accounts</li>
          <li>✓ Excel bulk import</li>
          <li>✓ Session resumption</li>
          <li>✓ Mobile-optimized interface</li>
          <li>✓ Spectator display mode</li>
          <li>✓ Answer history tracking</li>
        </ul>
      </div>

      <!-- Getting Started Column -->
      <div class="about-card">
        <h3>🚀 Quick Start</h3>
        <ol>
          <li><strong>Create a Quiz</strong> - Use the Quiz Management tab to create or import quizzes</li>
          <li><strong>Launch Session</strong> - Go to Presenter page and make a quiz live</li>
          <li><strong>Share Code</strong> - Players join using the room code or QR code</li>
          <li><strong>Present Questions</strong> - Navigate and reveal answers in real-time</li>
        </ol>
      </div>

      <!-- Support Column -->
      <div class="about-card">
        <h3>💡 Getting Help</h3>
        <ul>
          <li>📖 <a href="https://github.com/EmanTemplar/TriviaForge" target="_blank">View Documentation</a></li>
          <li>🐛 <a href="https://github.com/EmanTemplar/TriviaForge/issues" target="_blank">Report Issues</a></li>
          <li>💬 <a href="https://github.com/EmanTemplar/TriviaForge/discussions" target="_blank">Ask Questions</a></li>
          <li>⭐ <a href="https://github.com/EmanTemplar/TriviaForge" target="_blank">Star on GitHub</a></li>
        </ul>
      </div>
    </div>

    <!-- System Information -->
    <div class="system-info-box">
      <h3>📊 System Information</h3>
      <div class="system-grid">
        <div class="system-item">
          <div class="system-label">Application</div>
          <div class="system-value">TriviaForge</div>
        </div>
        <div class="system-item">
          <div class="system-label">Environment</div>
          <div class="system-value">Production</div>
        </div>
        <div class="system-item">
          <div class="system-label">Database</div>
          <div class="system-value">PostgreSQL 15</div>
        </div>
        <div class="system-item">
          <div class="system-label">Real-time Protocol</div>
          <div class="system-value">WebSocket (Socket.IO)</div>
        </div>
      </div>
    </div>

    <!-- About Text -->
    <div class="about-text-box">
      <h3>About This Application</h3>
      <p>
        TriviaForge is a modern, real-time trivia game platform designed for educators, event organizers, and trivia enthusiasts. It enables interactive quiz sessions with instant feedback, live leaderboards, and comprehensive player analytics.
      </p>
      <p>
        With features like session resumption, user authentication, player connection monitoring, and mobile-optimized interfaces, TriviaForge provides a seamless experience for presenters and players. Whether you're running classroom quizzes, corporate events, or casual game nights, TriviaForge adapts to your needs.
      </p>
      <p>
        Built with modern web technologies including Vue 3, Vite, Node.js, Socket.IO for real-time communication, and PostgreSQL for robust data management, TriviaForge ensures reliability, performance, and data integrity. Version {{ VERSION }} ({{ VERSION_NAME }}) includes major CSS architecture improvements: component-first refactoring with enhanced Button, FormInput, and Card components, elimination of 500+ lines of duplicate CSS, fully theme-aware styling system (no hardcoded colors), and creation of shared CSS patterns for maintainability.
      </p>
    </div>

    <!-- License Info -->
    <div class="license-box">
      <p>
        <strong>License:</strong> Licensed under the PolyForm Noncommercial License 1.0.0 - Free for educational and personal use. See GitHub for full license details.
      </p>
    </div>
  </section>
</template>

<script setup>
import { VERSION, VERSION_NAME } from '@/config/version.js'
</script>

<style scoped>
.about-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.about-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--info-light);
}

.about-header h2 {
  color: var(--info-light);
  margin: 0;
  font-size: 2rem;
}

.version-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--info-bg-10);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--info-light);
}

.version-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.version-number {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--info-light);
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.about-card {
  background: var(--bg-overlay-10);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.about-card h3 {
  color: var(--info-light);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.about-card ul,
.about-card ol {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.about-card li {
  margin-bottom: 0.5rem;
}

.about-card a {
  color: var(--info-light);
  text-decoration: none;
  transition: color 0.2s;
}

.about-card a:hover {
  color: var(--info-color);
  text-decoration: underline;
}

.system-info-box {
  background: var(--bg-overlay-10);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.system-info-box h3 {
  color: var(--info-light);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.system-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.system-label {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-value {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.about-text-box {
  background: var(--bg-overlay-10);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.about-text-box h3 {
  color: var(--info-light);
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
}

.about-text-box p {
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 1rem;
}

.about-text-box p:last-child {
  margin-bottom: 0;
}

.license-box {
  background: var(--bg-overlay-10);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--info-light);
}

.license-box p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.license-box strong {
  color: var(--info-light);
}

@media (max-width: 768px) {
  .about-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .about-header h2 {
    font-size: 1.5rem;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }

  .system-grid {
    grid-template-columns: 1fr;
  }
}
</style>
