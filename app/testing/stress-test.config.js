/**
 * TriviaForge Stress Test Configuration
 *
 * Define custom stress test scenarios that scale with your app
 * Add new scenarios as you implement new features
 */

export const stressTestScenarios = {
  // Light Load - Typical small group
  light: {
    name: 'Light Load Test',
    players: 5,
    questions: 3,
    answerDelay: 2000,
    questionDelay: 5000,
    disconnects: false,
    verbose: false,
    description: 'Small group scenario - 5 players'
  },

  // Medium Load - Average party/event
  medium: {
    name: 'Medium Load Test',
    players: 15,
    questions: 5,
    answerDelay: 2000,
    questionDelay: 5000,
    disconnects: false,
    verbose: false,
    description: 'Medium party scenario - 15 players'
  },

  // Heavy Load - Large event (like Metrica)
  heavy: {
    name: 'Heavy Load Test',
    players: 25,
    questions: 10,
    answerDelay: 3000,
    questionDelay: 5000,
    disconnects: false,
    verbose: false,
    description: 'Large event scenario - 25 players, full quiz'
  },

  // Extreme Load - Stress testing limits
  extreme: {
    name: 'Extreme Load Test',
    players: 50,
    questions: 10,
    answerDelay: 2000,
    questionDelay: 4000,
    disconnects: false,
    verbose: false,
    description: 'Maximum capacity test - 50 players'
  },

  // Quick Validation - Fast iteration during development
  quick: {
    name: 'Quick Validation',
    players: 3,
    questions: 2,
    answerDelay: 500,
    questionDelay: 1000,
    disconnects: false,
    verbose: false,
    description: 'Fast development test - 3 players, 2 questions'
  },

  // Chaos Test - Simulate real-world unpredictability
  chaos: {
    name: 'Chaos Engineering Test',
    players: 20,
    questions: 5,
    answerDelay: 3000,
    questionDelay: 5000,
    disconnects: true,  // Enable when disconnect simulation is implemented
    verbose: false,
    description: 'Unpredictable scenario with disconnections'
  },

  // Full Quiz Marathon - Complete quiz run
  marathon: {
    name: 'Full Quiz Marathon',
    players: 10,
    questions: 50,  // Full quiz
    answerDelay: 1500,
    questionDelay: 3000,
    disconnects: false,
    verbose: false,
    description: 'Complete quiz test - all questions'
  },

  // Verbose Debug - Detailed logging for troubleshooting
  debug: {
    name: 'Debug Test',
    players: 5,
    questions: 3,
    answerDelay: 2000,
    questionDelay: 5000,
    disconnects: false,
    verbose: true,
    description: 'Detailed logging for debugging'
  }
};

/**
 * Custom scenario builder
 * Use this to create one-off test scenarios
 */
export function createCustomScenario(options) {
  return {
    name: options.name || 'Custom Test',
    players: options.players || 5,
    questions: options.questions || 3,
    answerDelay: options.answerDelay || 2000,
    questionDelay: options.questionDelay || 5000,
    disconnects: options.disconnects || false,
    verbose: options.verbose || false,
    description: options.description || 'Custom test scenario'
  };
}

/**
 * Feature-specific test templates
 * Add new templates as you implement features
 */
export const featureTests = {
  // Template for testing real-time features
  realtime: {
    name: 'Real-time Features Test',
    players: 15,
    questions: 5,
    answerDelay: 1000,  // Fast answers to stress real-time updates
    questionDelay: 2000,
    disconnects: false,
    verbose: false,
    description: 'Test real-time updates and Socket.IO performance'
  },

  // Template for testing database performance
  database: {
    name: 'Database Performance Test',
    players: 30,
    questions: 10,
    answerDelay: 500,  // Rapid database writes
    questionDelay: 1000,
    disconnects: false,
    verbose: false,
    description: 'Test database connection pooling and query performance'
  },

  // Template for testing connection stability
  connection: {
    name: 'Connection Stability Test',
    players: 20,
    questions: 5,
    answerDelay: 2000,
    questionDelay: 5000,
    disconnects: true,  // Enable when implemented
    verbose: true,
    description: 'Test reconnection logic and connection state management'
  },

  // Add more feature tests as you build:
  // powerups: { ... },
  // teams: { ... },
  // betting: { ... },
  // etc.
};

/**
 * Scaling recommendations based on feature set
 */
export const scalingGuidelines = {
  baseline: 'Start with light test (5 players)',
  development: 'Use quick test for rapid iteration',
  preDeployment: 'Run medium + heavy tests',
  production: 'Validate with extreme test before major events',
  newFeature: 'Create custom scenario for feature-specific testing'
};

export default stressTestScenarios;
