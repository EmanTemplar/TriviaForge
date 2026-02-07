import { sessionService } from './session.service.js';

const DEBUG_ENABLED = process.env.DEBUG_MODE === 'true';

/**
 * AutoModeService - Manages server-side auto-mode timers for trivia game rooms.
 * When enabled, automatically presents questions, waits for answers (with timer),
 * reveals answers, and advances through the quiz without presenter intervention.
 */
class AutoModeService {
  constructor() {
    this.io = null;
    this.roomService = null;
    this.pool = null;
    this.quizOptions = null;

    // Map<roomCode, autoModeState>
    this.rooms = new Map();
  }

  /**
   * Initialize the service with required dependencies.
   * @param {object} io - Socket.IO server instance
   * @param {object} roomService - Room management service
   * @param {object} pool - PostgreSQL connection pool
   * @param {object} quizOptions - Reference to quizOptions object (for answerDisplayTime)
   */
  initialize(io, roomService, pool, quizOptions) {
    this.io = io;
    this.roomService = roomService;
    this.pool = pool;
    this.quizOptions = quizOptions;
    if (DEBUG_ENABLED) console.log('[AutoMode] Service initialized');
  }

  /**
   * Start auto-mode for a room.
   * @param {string} roomCode - The room code
   * @param {object} config - Configuration
   * @param {number} config.questionTimerSeconds - Seconds per question
   * @param {number} config.revealDelaySeconds - Seconds between reveal and next question
   */
  startAutoMode(roomCode, { questionTimerSeconds, revealDelaySeconds }) {
    const room = this.roomService.liveRooms[roomCode];
    if (!room) {
      console.error(`[AutoMode] Cannot start - room ${roomCode} not found`);
      return;
    }

    // Clean up any existing auto-mode state for this room
    this.cleanup(roomCode);

    console.log(`[AutoMode] Starting for room ${roomCode} (question: ${questionTimerSeconds}s, reveal: ${revealDelaySeconds}s)`);

    room.autoMode = true;
    room.questionTimer = questionTimerSeconds;
    room.revealDelay = revealDelaySeconds;

    this.rooms.set(roomCode, {
      enabled: true,
      state: 'idle',
      questionTimerSeconds,
      revealDelaySeconds,
      currentTimerId: null,
      timerStartedAt: null,
      remainingTime: 0,
      pausedState: null
    });

    // Begin presenting the next unpresented question
    this._presentNextQuestion(roomCode);
  }

  /**
   * Stop auto-mode for a room.
   * @param {string} roomCode - The room code
   */
  stopAutoMode(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return;

    console.log(`[AutoMode] Stopping for room ${roomCode}`);

    if (state.currentTimerId) {
      clearTimeout(state.currentTimerId);
    }

    // Update room object
    const room = this.roomService.liveRooms[roomCode];
    if (room) {
      room.autoMode = false;
    }

    this.rooms.delete(roomCode);
  }

  /**
   * Pause auto-mode timer for a room.
   * @param {string} roomCode - The room code
   */
  pauseAutoMode(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state || !state.enabled) return;

    if (state.state !== 'question_timer' && state.state !== 'reveal_delay' && state.state !== 'all_answered_wait') {
      if (DEBUG_ENABLED) console.log(`[AutoMode] Cannot pause room ${roomCode} - not in timer state (${state.state})`);
      return;
    }

    if (DEBUG_ENABLED) console.log(`[AutoMode] Pausing room ${roomCode} (state: ${state.state})`);

    // Calculate remaining time
    const elapsed = (Date.now() - new Date(state.timerStartedAt).getTime()) / 1000;
    let totalTime;
    if (state.state === 'question_timer') {
      totalTime = state.questionTimerSeconds;
    } else if (state.state === 'all_answered_wait') {
      totalTime = Math.max(2, state.revealDelaySeconds);
    } else {
      totalTime = state.revealDelaySeconds;
    }
    const remaining = Math.max(0, totalTime - elapsed);

    // Clear current timer
    if (state.currentTimerId) {
      clearTimeout(state.currentTimerId);
      state.currentTimerId = null;
    }

    state.pausedState = state.state;
    state.remainingTime = remaining;
    state.state = 'paused';

    if (DEBUG_ENABLED) console.log(`[AutoMode] Paused with ${remaining.toFixed(1)}s remaining`);
  }

  /**
   * Resume auto-mode timer for a room.
   * @param {string} roomCode - The room code
   */
  resumeAutoMode(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state || !state.enabled || state.state !== 'paused') {
      if (DEBUG_ENABLED) console.log(`[AutoMode] Cannot resume room ${roomCode} - not paused`);
      return;
    }

    if (DEBUG_ENABLED) console.log(`[AutoMode] Resuming room ${roomCode} (was: ${state.pausedState}, remaining: ${state.remainingTime.toFixed(1)}s)`);

    const previousState = state.pausedState;
    state.state = previousState;
    state.pausedState = null;
    state.timerStartedAt = new Date().toISOString();

    let callback;
    if (previousState === 'question_timer' || previousState === 'all_answered_wait') {
      callback = () => this._revealAnswer(roomCode);
    } else {
      callback = () => this._presentNextQuestion(roomCode);
    }

    state.currentTimerId = setTimeout(callback, state.remainingTime * 1000);
  }

  /**
   * Handle all players answering - skip question timer and wait briefly before reveal.
   * @param {string} roomCode - The room code
   */
  onAllPlayersAnswered(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state || !state.enabled || state.state !== 'question_timer') {
      return;
    }

    if (DEBUG_ENABLED) console.log(`[AutoMode] All players answered in room ${roomCode}, waiting before reveal`);

    if (state.currentTimerId) {
      clearTimeout(state.currentTimerId);
      state.currentTimerId = null;
    }

    // Use reveal delay (or minimum 2 seconds) as the pre-reveal wait time
    // This gives players a moment to see that everyone has answered
    const preRevealDelay = Math.max(2, state.revealDelaySeconds);

    // Update state to show we're in the pre-reveal wait period
    state.state = 'all_answered_wait';
    state.timerStartedAt = new Date().toISOString();

    // Notify clients that all players answered (they can show a brief message)
    this.io.to(roomCode).emit('allPlayersAnswered', {
      roomCode,
      waitSeconds: preRevealDelay
    });

    if (DEBUG_ENABLED) console.log(`[AutoMode] Waiting ${preRevealDelay}s before reveal`);

    state.currentTimerId = setTimeout(() => {
      this._revealAnswer(roomCode);
    }, preRevealDelay * 1000);
  }

  /**
   * Clean up auto-mode state for a room.
   * @param {string} roomCode - The room code
   */
  cleanup(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return;

    if (DEBUG_ENABLED) console.log(`[AutoMode] Cleaning up room ${roomCode}`);

    if (state.currentTimerId) {
      clearTimeout(state.currentTimerId);
    }

    this.rooms.delete(roomCode);
  }

  /**
   * Get current auto-mode state for a room (for UI sync).
   * @param {string} roomCode - The room code
   * @returns {object|null} Current state or null
   */
  getState(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return null;

    let timeRemaining = null;
    if (state.state === 'question_timer' || state.state === 'reveal_delay' || state.state === 'all_answered_wait') {
      const elapsed = (Date.now() - new Date(state.timerStartedAt).getTime()) / 1000;
      let totalTime;
      if (state.state === 'question_timer') {
        totalTime = state.questionTimerSeconds;
      } else if (state.state === 'all_answered_wait') {
        totalTime = Math.max(2, state.revealDelaySeconds);
      } else {
        totalTime = state.revealDelaySeconds;
      }
      timeRemaining = Math.max(0, totalTime - elapsed);
    } else if (state.state === 'paused') {
      timeRemaining = state.remainingTime;
    }

    return {
      enabled: state.enabled,
      state: state.state,
      questionTimerSeconds: state.questionTimerSeconds,
      revealDelaySeconds: state.revealDelaySeconds,
      timeRemaining,
      pausedState: state.pausedState
    };
  }

  // ---- Internal methods ----

  /**
   * Present the next unpresented question in the quiz.
   * @private
   */
  _presentNextQuestion(roomCode) {
    const room = this.roomService.liveRooms[roomCode];
    const state = this.rooms.get(roomCode);

    if (!room || !state || !state.enabled) {
      if (DEBUG_ENABLED) console.log(`[AutoMode] _presentNextQuestion: room or state invalid for ${roomCode}`);
      return;
    }

    const questions = room.quizData?.questions || [];

    // Find next unpresented question index (sequential order)
    let nextIndex = -1;
    for (let i = 0; i < questions.length; i++) {
      if (!room.presentedQuestions.includes(i)) {
        nextIndex = i;
        break;
      }
    }

    // No questions left - complete the quiz
    if (nextIndex === -1) {
      if (DEBUG_ENABLED) console.log(`[AutoMode] No more questions in room ${roomCode}, completing quiz`);
      this._completeQuiz(roomCode);
      return;
    }

    if (DEBUG_ENABLED) console.log(`[AutoMode] Presenting question ${nextIndex} in room ${roomCode}`);

    // Update room state (matches server.js presentQuestion handler)
    room.currentQuestionIndex = nextIndex;
    if (!room.presentedQuestions.includes(nextIndex)) {
      room.presentedQuestions.push(nextIndex);
    }

    // Start auto-save on first question (matches server.js line 1789-1791)
    if (nextIndex === 0) {
      sessionService.scheduleAutoSave(roomCode, (code) => this.roomService.getRoom(code));
    }

    // Reset player choices (matches server.js lines 1795-1803)
    Object.values(room.players).forEach(player => {
      if (player.answers && player.answers[nextIndex] !== undefined) {
        player.choice = player.answers[nextIndex];
      } else {
        player.choice = null;
      }
    });

    const question = questions[nextIndex];
    const timerStartedAt = new Date().toISOString();

    // Emit questionPresented (matches server.js line 1806, extended with auto-mode fields)
    this.io.to(roomCode).emit('questionPresented', {
      questionIndex: nextIndex,
      question,
      presentedQuestions: room.presentedQuestions,
      autoMode: true,
      timerStartedAt,
      timerDuration: state.questionTimerSeconds
    });

    // Emit player list update (matches server.js line 1809)
    this.io.to(roomCode).emit('playerListUpdate', {
      roomCode,
      players: Object.values(room.players).filter(p => !p.isSpectator)
    });

    // Start the question timer
    this._startQuestionTimer(roomCode);
  }

  /**
   * Start the question countdown timer.
   * @private
   */
  _startQuestionTimer(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return;

    state.state = 'question_timer';
    state.timerStartedAt = new Date().toISOString();

    if (DEBUG_ENABLED) console.log(`[AutoMode] Question timer started for room ${roomCode} (${state.questionTimerSeconds}s)`);

    state.currentTimerId = setTimeout(() => {
      this._revealAnswer(roomCode);
    }, state.questionTimerSeconds * 1000);
  }

  /**
   * Reveal the answer to the current question.
   * Matches the existing server.js revealAnswer handler format.
   * @private
   */
  _revealAnswer(roomCode) {
    const room = this.roomService.liveRooms[roomCode];
    const state = this.rooms.get(roomCode);

    if (!room || !state || !state.enabled) {
      if (DEBUG_ENABLED) console.log(`[AutoMode] _revealAnswer: room or state invalid for ${roomCode}`);
      return;
    }

    if (room.currentQuestionIndex === null || room.currentQuestionIndex === undefined) {
      console.error(`[AutoMode] Cannot reveal - no current question in room ${roomCode}`);
      return;
    }

    const questionIndex = room.currentQuestionIndex;
    if (DEBUG_ENABLED) console.log(`[AutoMode] Revealing answer for question ${questionIndex} in room ${roomCode}`);

    const question = room.quizData.questions[questionIndex];

    // Track revealed question (matches server.js lines 1935-1937)
    if (!room.revealedQuestions.includes(questionIndex)) {
      room.revealedQuestions.push(questionIndex);
    }

    // Calculate results (matches server.js lines 1939-1945)
    const results = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .map(p => ({
        name: p.name,
        choice: p.choice,
        is_correct: p.choice === question.correctChoice
      }));

    // Emit questionRevealed (matches server.js lines 1947-1953)
    this.io.to(roomCode).emit('questionRevealed', {
      questionIndex,
      question,
      results,
      revealedQuestions: room.revealedQuestions,
      answerDisplayTime: this.quizOptions?.answerDisplayTime || 30
    });

    // Start reveal delay timer
    this._startRevealDelay(roomCode);
  }

  /**
   * Start the delay between reveal and next question.
   * @private
   */
  _startRevealDelay(roomCode) {
    const state = this.rooms.get(roomCode);
    if (!state) return;

    state.state = 'reveal_delay';
    state.timerStartedAt = new Date().toISOString();

    if (DEBUG_ENABLED) console.log(`[AutoMode] Reveal delay started for room ${roomCode} (${state.revealDelaySeconds}s)`);

    state.currentTimerId = setTimeout(() => {
      this._presentNextQuestion(roomCode);
    }, state.revealDelaySeconds * 1000);
  }

  /**
   * Complete the quiz, save session, and clean up.
   * Matches the existing server.js completeQuiz handler.
   * @private
   */
  async _completeQuiz(roomCode) {
    const room = this.roomService.liveRooms[roomCode];

    if (!room) {
      console.error(`[AutoMode] Cannot complete quiz - room ${roomCode} not found`);
      return;
    }

    console.log(`[AutoMode] Completing quiz for room ${roomCode}`);

    room.status = 'completed';
    room.completedAt = new Date().toISOString();

    // Stop auto-save
    sessionService.clearAutoSave(roomCode);

    // Save session if there are answers (matches server.js lines 1968-1979)
    const hasAnswers = Object.values(room.players).some(player =>
      player.answers && Object.keys(player.answers).length > 0
    );

    if (hasAnswers) {
      try {
        const filename = await sessionService.saveSession(roomCode, room);
        console.log(`[AutoMode] Session saved: ${filename}`);
        this.io.to(roomCode).emit('quizCompleted', {
          message: 'Quiz completed and saved!',
          filename
        });
      } catch (err) {
        console.error(`[AutoMode] Error saving session for room ${roomCode}:`, err);
        this.io.to(roomCode).emit('quizCompleted', {
          message: 'Quiz completed (error saving session)'
        });
      }
    } else {
      this.io.to(roomCode).emit('quizCompleted', {
        message: 'Quiz completed (no answers recorded)'
      });
    }

    // Emit active rooms update
    this.io.emit('activeRoomsUpdate', this.roomService.getActiveRoomsSummary());

    // Clean up auto-mode state
    this.cleanup(roomCode);
  }
}

export const autoModeService = new AutoModeService();
