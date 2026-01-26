/**
 * TriviaForge - Session Controller
 *
 * Handles all session-related operations:
 * - List sessions (all, completed, incomplete)
 * - Get session details
 * - Delete session (cascade delete)
 */

import { getClient, query } from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Helper: List sessions from database with optional filtering
 * @param {Object} options - Filter options
 * @param {number} options.userId - User ID for filtering (null for all)
 * @param {boolean} options.isRootAdmin - If true, returns all sessions
 * @returns {Promise<Array>} Array of session objects
 */
async function listSessionsFromDB(options = {}) {
  const { userId = null, isRootAdmin = false } = options;

  try {
    // Build query with optional filtering by created_by
    let queryText = `
      SELECT
        gs.id,
        gs.room_code,
        gs.status,
        gs.created_at,
        gs.completed_at,
        gs.original_session_id,
        gs.created_by,
        u.username as created_by_username,
        q.title as quiz_title,
        COUNT(DISTINCT CASE WHEN gp.display_name != 'Spectator Display' THEN gp.id END) as player_count,
        COUNT(DISTINCT sq.id) as question_count,
        COUNT(DISTINCT CASE WHEN sq.is_presented THEN sq.id END) as presented_count
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      LEFT JOIN users u ON gs.created_by = u.id
      LEFT JOIN game_participants gp ON gs.id = gp.game_session_id
      LEFT JOIN session_questions sq ON gs.id = sq.game_session_id
    `;

    const queryParams = [];

    // Filter by created_by if not root admin
    if (!isRootAdmin && userId) {
      queryText += ` WHERE gs.created_by = $1`;
      queryParams.push(userId);
    }

    queryText += `
      GROUP BY gs.id, gs.room_code, gs.status, gs.created_at, gs.completed_at, gs.original_session_id, gs.created_by, u.username, q.title
      ORDER BY gs.created_at DESC
    `;

    const result = await query(queryText, queryParams);

    return result.rows.map((row) => ({
      session_id: row.id,
      room_code: row.room_code,
      quiz_title: row.quiz_title,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.completed_at,
      resumed_at: row.original_session_id ? row.created_at : null, // If this is a resumed session, created_at is when it was resumed
      original_session_id: row.original_session_id,
      created_by: row.created_by,
      created_by_username: row.created_by_username || 'Unknown',
      player_count: parseInt(row.player_count),
      question_count: parseInt(row.question_count),
      presented_count: parseInt(row.presented_count),
    }));
  } catch (err) {
    console.error('Error listing sessions from database:', err);
    return [];
  }
}

/**
 * Helper: Parse session ID from filename or direct ID
 * @param {string} filename - Session filename or ID
 * @returns {number} Parsed session ID
 * @throws {BadRequestError} If ID format is invalid
 */
function parseSessionId(filename) {
  const sessionId = filename.includes('_')
    ? parseInt(filename.split('_')[1].replace('.json', ''))
    : parseInt(filename);

  if (isNaN(sessionId)) {
    throw new BadRequestError('Invalid session ID format');
  }

  return sessionId;
}

/**
 * List all sessions
 * GET /api/sessions
 */
export async function listSessions(req, res, next) {
  try {
    const sessions = await listSessionsFromDB({
      userId: req.user?.user_id,
      isRootAdmin: req.user?.is_root_admin || false,
    });

    // Format for frontend compatibility
    const formatted = sessions.map((s) => ({
      filename: `session_${s.session_id}.json`, // For backward compatibility
      sessionId: s.session_id,
      roomCode: s.room_code,
      quizTitle: s.quiz_title,
      status: s.status,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      resumedAt: s.resumed_at || null,
      playerCount: s.player_count,
      questionCount: s.question_count,
      presentedCount: s.presented_count,
      createdByUsername: s.created_by_username,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * List incomplete sessions only
 * GET /api/sessions/incomplete
 */
export async function listIncompleteSessions(req, res, next) {
  try {
    const sessions = await listSessionsFromDB({
      userId: req.user?.user_id,
      isRootAdmin: req.user?.is_root_admin || false,
    });
    const incomplete = sessions.filter((s) => s.status !== 'completed');

    // Format for frontend compatibility
    const formatted = incomplete.map((s) => ({
      filename: `session_${s.session_id}.json`, // For backward compatibility
      sessionId: s.session_id,
      roomCode: s.room_code,
      quizTitle: s.quiz_title,
      status: s.status,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      resumedAt: s.resumed_at || null,
      playerCount: s.player_count,
      questionCount: s.question_count,
      presentedCount: s.presented_count,
      createdByUsername: s.created_by_username,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * List completed sessions only
 * GET /api/sessions/completed
 */
export async function listCompletedSessions(req, res, next) {
  try {
    const sessions = await listSessionsFromDB({
      userId: req.user?.user_id,
      isRootAdmin: req.user?.is_root_admin || false,
    });
    const completed = sessions.filter((s) => s.status === 'completed');

    // Format for frontend compatibility
    const formatted = completed.map((s) => ({
      filename: `session_${s.session_id}.json`, // For backward compatibility
      sessionId: s.session_id,
      roomCode: s.room_code,
      quizTitle: s.quiz_title,
      status: s.status,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      resumedAt: s.resumed_at || null,
      playerCount: s.player_count,
      questionCount: s.question_count,
      presentedCount: s.presented_count,
      createdByUsername: s.created_by_username,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single session with full details
 * GET /api/sessions/:filename
 *
 * @param {string} req.params.filename - Session filename (session_123.json) or ID
 */
export async function getSession(req, res, next) {
  try {
    const sessionId = parseSessionId(req.params.filename);

    // Fetch session with all related data
    const sessionResult = await query(
      `
      SELECT
        gs.id,
        gs.room_code,
        gs.status,
        gs.created_at,
        gs.completed_at,
        gs.original_session_id,
        q.id as quiz_id,
        q.title as quiz_title
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      WHERE gs.id = $1
    `,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new NotFoundError('Session');
    }

    const session = sessionResult.rows[0];

    // Fetch participants with their answers (excluding Spectator Display)
    const participantsResult = await query(
      `
      SELECT
        gp.display_name,
        pa.question_id,
        pa.answer_id,
        sq.presentation_order,
        a.display_order as choice_index,
        pa.is_correct
      FROM game_participants gp
      LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
      LEFT JOIN session_questions sq ON pa.question_id = sq.question_id AND sq.game_session_id = $1
      LEFT JOIN answers a ON pa.answer_id = a.id
      WHERE gp.game_session_id = $1 AND gp.display_name != 'Spectator Display'
      ORDER BY gp.display_name, sq.presentation_order
    `,
      [sessionId]
    );

    // Group answers by player and calculate statistics
    const playersMap = new Map();
    for (const row of participantsResult.rows) {
      if (!playersMap.has(row.display_name)) {
        playersMap.set(row.display_name, {
          name: row.display_name,
          answers: {},
          correct: 0,
          answered: 0,
        });
      }
      const player = playersMap.get(row.display_name);
      if (row.question_id && row.presentation_order !== null) {
        player.answers[row.presentation_order] = row.choice_index;
        player.answered++;
        if (row.is_correct) {
          player.correct++;
        }
      }
    }

    // Fetch quiz questions with full details
    const questionsResult = await query(
      `
      SELECT
        sq.presentation_order,
        sq.is_presented,
        sq.is_revealed,
        qs.question_text,
        qs.id as question_id
      FROM session_questions sq
      JOIN questions qs ON sq.question_id = qs.id
      WHERE sq.game_session_id = $1
      ORDER BY sq.presentation_order
    `,
      [sessionId]
    );

    const presentedQuestions = [];
    const revealedQuestions = [];
    const questions = [];

    for (const row of questionsResult.rows) {
      if (row.is_presented) presentedQuestions.push(row.presentation_order);
      if (row.is_revealed) revealedQuestions.push(row.presentation_order);

      // Fetch answers for this question
      const answersResult = await query(
        `
        SELECT answer_text, is_correct, display_order
        FROM answers
        WHERE question_id = $1
        ORDER BY display_order
      `,
        [row.question_id]
      );

      const choices = answersResult.rows.map((a) => a.answer_text);
      const correctChoice = answersResult.rows.findIndex((a) => a.is_correct);

      questions.push({
        text: row.question_text,
        choices,
        correctChoice,
      });
    }

    // Format response to match frontend expectations
    const playerResults = Array.from(playersMap.values());

    const response = {
      filename: `session_${session.id}.json`, // For deletion and backwards compatibility
      sessionId: session.id,
      roomCode: session.room_code,
      quizTitle: session.quiz_title,
      quizFilename: `quiz_${session.quiz_id}.json`,
      status: session.status,
      createdAt: session.created_at,
      completedAt: session.completed_at,
      originalRoomCode: session.original_session_id
        ? `Room ${session.original_session_id}`
        : null,
      presentedQuestions,
      revealedQuestions,
      questions,
      players: playerResults, // For backwards compatibility
      playerResults, // With calculated statistics for modal
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete session (cascade delete)
 * DELETE /api/sessions/:filename
 *
 * @param {string} req.params.filename - Session filename (session_123.json) or ID
 */
export async function deleteSession(req, res, next) {
  const client = await getClient();
  try {
    const sessionId = parseSessionId(req.params.filename);

    await client.query('BEGIN');

    // Delete child records first to avoid foreign key constraint violations
    // Delete participant answers
    await client.query(
      'DELETE FROM participant_answers WHERE participant_id IN (SELECT id FROM game_participants WHERE game_session_id = $1)',
      [sessionId]
    );

    // Delete participants
    await client.query('DELETE FROM game_participants WHERE game_session_id = $1', [
      sessionId,
    ]);

    // Delete session questions
    await client.query('DELETE FROM session_questions WHERE game_session_id = $1', [sessionId]);

    // Finally delete the session itself
    const result = await client.query('DELETE FROM game_sessions WHERE id = $1 RETURNING id', [
      sessionId,
    ]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Session');
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Export all controller functions
export default {
  listSessions,
  listIncompleteSessions,
  listCompletedSessions,
  getSession,
  deleteSession,
};
