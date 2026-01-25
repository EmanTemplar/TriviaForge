/**
 * TriviaForge - Session Service
 *
 * Handles session persistence to database:
 * - Saving active room state to database
 * - Loading/restoring sessions from database
 * - Auto-save scheduling and management
 */

import { getClient, query } from '../config/database.js';
import { env } from '../config/environment.js';

/**
 * SessionService - Manages session persistence and auto-save
 */
class SessionService {
  constructor() {
    // Track auto-save intervals by room code
    this.autoSaveIntervals = {};
    this.AUTO_SAVE_INTERVAL = 120000; // 2 minutes (in milliseconds)
  }

  /**
   * Save room session to database
   * @param {string} roomCode - Room code
   * @param {Object} room - Room object with full state
   * @returns {Promise<string>} Session ID
   */
  async saveSession(roomCode, room) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Insert or update game_sessions
      // For resumed sessions, use resumedAt as the created_at timestamp
      const sessionTimestamp = room.resumedAt || room.createdAt;

      const sessionResult = await client.query(
        `
      INSERT INTO game_sessions (
        quiz_id, room_code, status, current_question_index,
        created_at, completed_at, original_session_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (room_code) DO UPDATE SET
        status = $3,
        current_question_index = $4,
        completed_at = $6
      RETURNING id
    `,
        [
          room.quizId,
          roomCode,
          room.status || 'in_progress',
          room.currentQuestionIndex,
          sessionTimestamp,
          room.completedAt || null,
          room.originalSessionId || null,
          room.createdBy || 1, // Admin user ID who created the room
        ]
      );

      const sessionId = sessionResult.rows[0].id;

      // 2. Insert or update session_questions (track presented/revealed status)
      const presentedSet = new Set(room.presentedQuestions || []);
      const revealedSet = new Set(room.revealedQuestions || []);

      for (let i = 0; i < room.quizData.questions.length; i++) {
        const question = room.quizData.questions[i];
        const isPresented = presentedSet.has(i);
        const isRevealed = revealedSet.has(i);

        await client.query(
          `
          INSERT INTO session_questions (
            game_session_id, question_id, presentation_order,
            is_presented, is_revealed
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (game_session_id, question_id) DO UPDATE SET
            presentation_order = EXCLUDED.presentation_order,
            is_presented = EXCLUDED.is_presented,
            is_revealed = EXCLUDED.is_revealed
        `,
          [sessionId, question.id, i, isPresented, isRevealed]
        );
      }

      // 3. Insert or update game_participants and their answers
      for (const player of Object.values(room.players)) {
        // Skip spectators from database saves
        if (player.isSpectator) continue;

        // Insert or update participant with user_id from guest/registered account
        const participantResult = await client.query(
          `
          INSERT INTO game_participants (
            user_id, game_session_id, display_name, score,
            is_connected, socket_id, joined_at, last_seen
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, game_session_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            is_connected = EXCLUDED.is_connected,
            socket_id = EXCLUDED.socket_id,
            last_seen = EXCLUDED.last_seen
          RETURNING id
        `,
          [
            player.userId || null, // user_id from guest or registered account
            sessionId,
            player.name,
            0, // score (calculated from correct answers)
            player.connected || false,
            player.id, // socket_id
            new Date(),
            new Date(),
          ]
        );

        const participantId = participantResult.rows[0].id;

        // 4. Insert participant answers
        if (player.answers && typeof player.answers === 'object') {
          for (const [questionIndexStr, choiceIndex] of Object.entries(player.answers)) {
            const questionIndex = parseInt(questionIndexStr);
            const question = room.quizData.questions[questionIndex];

            if (question && question.id) {
              // Find the answer_id for this choice
              const answerResult = await client.query(
                `
                SELECT id, is_correct
                FROM answers
                WHERE question_id = $1 AND display_order = $2
              `,
                [question.id, choiceIndex]
              );

              if (answerResult.rows.length > 0) {
                const answer = answerResult.rows[0];

                await client.query(
                  `
                  INSERT INTO participant_answers (
                    participant_id, question_id, answer_id, is_correct, answered_at
                  )
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT (participant_id, question_id) DO NOTHING
                `,
                  [participantId, question.id, answer.id, answer.is_correct, new Date()]
                );
              }
            }
          }
        }
      }

      // Remove participants who are no longer in the room (kicked/left)
      const currentUserIds = Object.values(room.players)
        .filter((p) => !p.isSpectator && p.userId)
        .map((p) => p.userId);

      if (currentUserIds.length > 0) {
        await client.query(
          `
          DELETE FROM game_participants
          WHERE game_session_id = $1
            AND user_id NOT IN (${currentUserIds.map((_, i) => `$${i + 2}`).join(', ')})
        `,
          [sessionId, ...currentUserIds]
        );
      }

      await client.query('COMMIT');

      console.log(`✅ [SESSION SERVICE] Session ${roomCode} saved (session_id: ${sessionId})`);
      return sessionId.toString();
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ [SESSION SERVICE] Error saving session:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Load session from database by session ID
   * @param {number} sessionId - Database session ID
   * @param {Object} quiz - Quiz data from database
   * @returns {Promise<Object>} Session data object
   */
  async loadSession(sessionId, quiz) {
    try {
      // Fetch session metadata
      const sessionResult = await query(
        `
        SELECT
          id, quiz_id, room_code, status, current_question_index,
          created_at, completed_at, original_session_id, original_room_code
        FROM game_sessions
        WHERE id = $1
      `,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }

      const session = sessionResult.rows[0];

      // Fetch presented/revealed questions
      const questionsResult = await query(
        `
        SELECT presentation_order, is_presented, is_revealed
        FROM session_questions
        WHERE game_session_id = $1
        ORDER BY presentation_order
      `,
        [sessionId]
      );

      const presentedQuestions = [];
      const revealedQuestions = [];

      for (const row of questionsResult.rows) {
        if (row.is_presented) presentedQuestions.push(row.presentation_order);
        if (row.is_revealed) revealedQuestions.push(row.presentation_order);
      }

      // Fetch participants and answers
      const participantsResult = await query(
        `
        SELECT
          gp.id as participant_id,
          gp.display_name,
          gp.user_id,
          gp.is_connected,
          gp.socket_id,
          u.username,
          pa.question_id,
          sq.presentation_order,
          pa.answer_id,
          a.display_order as choice_index
        FROM game_participants gp
        LEFT JOIN users u ON gp.user_id = u.id
        LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
        LEFT JOIN session_questions sq ON pa.question_id = sq.question_id AND sq.game_session_id = $1
        LEFT JOIN answers a ON pa.answer_id = a.id
        WHERE gp.game_session_id = $1
        ORDER BY gp.display_name, sq.presentation_order
      `,
        [sessionId]
      );

      // Reconstruct players object
      const players = {};
      for (const row of participantsResult.rows) {
        const username = row.username || row.display_name;
        const isSpectator =
          row.username === 'Display' || row.display_name === 'Spectator Display';

        if (!players[username]) {
          players[username] = {
            name: row.display_name,
            id: row.socket_id,
            userId: row.user_id,
            connected: row.is_connected,
            answers: {},
            isSpectator,
          };
        }

        if (row.presentation_order !== null && row.choice_index !== null) {
          players[username].answers[row.presentation_order] = row.choice_index;
        }
      }

      // Return reconstructed session data
      return {
        sessionId: session.id,
        quiz_id: session.quiz_id,
        roomCode: session.room_code,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        presentedQuestions,
        revealedQuestions,
        players,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        originalSessionId: session.original_session_id,
        quizData: this._formatQuizForSession(quiz),
      };
    } catch (err) {
      console.error('[SESSION SERVICE] Error loading session:', err);
      throw err;
    }
  }

  /**
   * Format quiz data for session (convert from database format)
   * @param {Object} quiz - Quiz from database
   * @returns {Object} Formatted quiz data
   * @private
   */
  _formatQuizForSession(quiz) {
    return {
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        choices: q.choices.map((c) => c.text),
        correctChoice: q.choices.findIndex((c) => c.isCorrect),
      })),
    };
  }

  /**
   * Schedule auto-save for a room
   * @param {string} roomCode - Room code
   * @param {Function} getRoomFn - Function to get current room state
   */
  scheduleAutoSave(roomCode, getRoomFn) {
    // Clear existing interval if any
    this.clearAutoSave(roomCode);

    if (env.isVerboseLogging) {
      console.log(`[SESSION SERVICE] Auto-save started for room ${roomCode} (every 2 minutes)`);
    }

    // Set new interval
    this.autoSaveIntervals[roomCode] = setInterval(async () => {
      try {
        const room = getRoomFn(roomCode);
        if (!room) {
          this.clearAutoSave(roomCode);
          return;
        }

        if (env.isVerboseLogging) {
          console.log(`[SESSION SERVICE] Auto-saving room ${roomCode}...`);
        }

        await this.saveSession(roomCode, room);

        if (env.isVerboseLogging) {
          console.log(`[SESSION SERVICE] ✅ Auto-save complete for room ${roomCode}`);
        }
      } catch (err) {
        console.error(`[SESSION SERVICE] ❌ Auto-save failed for room ${roomCode}:`, err);
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Clear auto-save interval for a room
   * @param {string} roomCode - Room code
   */
  clearAutoSave(roomCode) {
    if (this.autoSaveIntervals[roomCode]) {
      clearInterval(this.autoSaveIntervals[roomCode]);
      delete this.autoSaveIntervals[roomCode];

      if (env.isVerboseLogging) {
        console.log(`[SESSION SERVICE] Auto-save stopped for room ${roomCode}`);
      }
    }
  }

  /**
   * Clear all auto-save intervals
   */
  clearAllAutoSaves() {
    Object.keys(this.autoSaveIntervals).forEach((roomCode) => {
      this.clearAutoSave(roomCode);
    });
  }

  /**
   * Get number of active auto-saves
   * @returns {number}
   */
  getActiveAutoSaveCount() {
    return Object.keys(this.autoSaveIntervals).length;
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
