/**
 * TriviaForge - Solo Play Controller
 * Version: v5.4.0
 *
 * Handles solo play REST API endpoints:
 * - List solo-enabled quizzes (public, no auth required)
 * - Get quiz for play (without correct answers)
 * - Create solo session
 * - Submit answer (returns immediate feedback)
 * - Complete session
 * - Get session results
 */

import { getClient, query } from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { sendSuccess } from '../utils/responses.js';
import crypto from 'crypto';

/**
 * Generate a random room code for solo sessions
 * Format: S-XXXX (S prefix for solo, 4 random chars)
 */
function generateSoloRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = 'S-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * List all solo-enabled quizzes (available_solo = TRUE)
 * Public endpoint - no authentication required
 */
export async function listSoloQuizzes(req, res, next) {
  try {
    const result = await query(
      `SELECT
        q.id,
        q.title,
        q.description,
        q.question_timer,
        q.reveal_delay,
        COUNT(qq.question_id) as question_count
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      WHERE q.is_active = TRUE AND q.available_solo = TRUE
      GROUP BY q.id
      ORDER BY q.created_at DESC`
    );

    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
}

/**
 * Get a quiz for solo play
 * Returns quiz data WITHOUT correct answers (validated server-side)
 */
export async function getSoloQuiz(req, res, next) {
  const { id } = req.params;

  try {
    const client = await getClient();

    try {
      // Fetch quiz metadata
      const quizResult = await client.query(
        `SELECT id, title, description, question_timer, reveal_delay
         FROM quizzes
         WHERE id = $1 AND is_active = TRUE AND available_solo = TRUE`,
        [id]
      );

      if (quizResult.rows.length === 0) {
        throw new NotFoundError('Quiz not found or not available for solo play');
      }

      const quiz = quizResult.rows[0];

      // Fetch questions WITHOUT correctChoice
      const questionsResult = await client.query(
        `SELECT
          qs.id AS question_id,
          qs.question_text,
          qs.question_type,
          qs.image_url,
          qq.question_order,
          a.answer_text,
          a.display_order
        FROM quiz_questions qq
        JOIN questions qs ON qq.question_id = qs.id
        JOIN answers a ON qs.id = a.question_id
        WHERE qq.quiz_id = $1
        ORDER BY qq.question_order, a.display_order`,
        [id]
      );

      // Group questions (without correct answer info)
      const questionsMap = new Map();
      for (const row of questionsResult.rows) {
        if (!questionsMap.has(row.question_id)) {
          questionsMap.set(row.question_id, {
            id: row.question_id,
            text: row.question_text,
            type: row.question_type,
            imageUrl: row.image_url,
            order: row.question_order,
            choices: []
          });
        }
        questionsMap.get(row.question_id).choices.push(row.answer_text);
      }

      const questions = Array.from(questionsMap.values()).sort((a, b) => a.order - b.order);

      sendSuccess(res, {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questionTimer: quiz.question_timer || 30,
        revealDelay: quiz.reveal_delay || 5,
        questionCount: questions.length,
        questions
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new solo play session
 * Body: { quizId, playerName }
 * Returns: session info + first question
 */
export async function createSoloSession(req, res, next) {
  const { quizId, playerName } = req.body;

  if (!quizId || !playerName) {
    return next(new BadRequestError('quizId and playerName are required'));
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify quiz exists and is solo-enabled
    const quizResult = await client.query(
      `SELECT id, title, question_timer, reveal_delay
       FROM quizzes
       WHERE id = $1 AND is_active = TRUE AND available_solo = TRUE`,
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Quiz not found or not available for solo play');
    }

    const quiz = quizResult.rows[0];

    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateSoloRoomCode();
      const existing = await client.query('SELECT 1 FROM game_sessions WHERE room_code = $1', [roomCode]);
      if (existing.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      await client.query('ROLLBACK');
      throw new Error('Failed to generate unique room code');
    }

    // Create game session
    const sessionResult = await client.query(
      `INSERT INTO game_sessions (quiz_id, room_code, status, session_type)
       VALUES ($1, $2, 'in_progress', 'solo')
       RETURNING id, room_code, created_at`,
      [quizId, roomCode]
    );

    const session = sessionResult.rows[0];

    // Create participant
    const participantResult = await client.query(
      `INSERT INTO game_participants (game_session_id, display_name)
       VALUES ($1, $2)
       RETURNING id`,
      [session.id, playerName]
    );

    const participantId = participantResult.rows[0].id;

    // Create session_questions records
    const questionsResult = await client.query(
      `SELECT qq.question_id, qq.question_order
       FROM quiz_questions qq
       WHERE qq.quiz_id = $1
       ORDER BY qq.question_order`,
      [quizId]
    );

    for (const q of questionsResult.rows) {
      await client.query(
        `INSERT INTO session_questions (game_session_id, question_id, presentation_order, is_presented, is_revealed)
         VALUES ($1, $2, $3, FALSE, FALSE)`,
        [session.id, q.question_id, q.question_order]
      );
    }

    // Get first question (without correct answer)
    const firstQuestionResult = await client.query(
      `SELECT
        qs.id AS question_id,
        qs.question_text,
        qs.question_type,
        qs.image_url,
        qq.question_order
       FROM quiz_questions qq
       JOIN questions qs ON qq.question_id = qs.id
       WHERE qq.quiz_id = $1
       ORDER BY qq.question_order
       LIMIT 1`,
      [quizId]
    );

    let firstQuestion = null;
    if (firstQuestionResult.rows.length > 0) {
      const q = firstQuestionResult.rows[0];

      // Get choices
      const choicesResult = await client.query(
        `SELECT answer_text FROM answers WHERE question_id = $1 ORDER BY display_order`,
        [q.question_id]
      );

      firstQuestion = {
        id: q.question_id,
        index: 0,
        text: q.question_text,
        type: q.question_type,
        imageUrl: q.image_url,
        choices: choicesResult.rows.map(r => r.answer_text)
      };
    }

    await client.query('COMMIT');

    sendSuccess(res, {
      sessionId: session.id,
      roomCode: session.room_code,
      quizTitle: quiz.title,
      questionTimer: quiz.question_timer || 30,
      revealDelay: quiz.reveal_delay || 5,
      totalQuestions: questionsResult.rows.length,
      participantId,
      currentQuestionIndex: 0,
      currentQuestion: firstQuestion
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Submit an answer for the current question
 * Body: { questionId, answerIndex, participantId }
 * Returns: { isCorrect, correctChoice, nextQuestion }
 */
export async function submitSoloAnswer(req, res, next) {
  const { id: sessionId } = req.params;
  const { questionId, answerIndex, participantId } = req.body;

  if (questionId === undefined || answerIndex === undefined || !participantId) {
    return next(new BadRequestError('questionId, answerIndex, and participantId are required'));
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify session exists and is in progress
    const sessionResult = await client.query(
      `SELECT gs.id, gs.quiz_id, gs.status
       FROM game_sessions gs
       WHERE gs.id = $1 AND gs.session_type = 'solo'`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Solo session not found');
    }

    const session = sessionResult.rows[0];

    if (session.status === 'completed') {
      await client.query('ROLLBACK');
      throw new BadRequestError('Session is already completed');
    }

    // Verify participant belongs to this session
    const participantCheck = await client.query(
      `SELECT id FROM game_participants WHERE id = $1 AND game_session_id = $2`,
      [participantId, sessionId]
    );

    if (participantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new BadRequestError('Invalid participant');
    }

    // Check if already answered this question
    const existingAnswer = await client.query(
      `SELECT id FROM participant_answers WHERE participant_id = $1 AND question_id = $2`,
      [participantId, questionId]
    );

    if (existingAnswer.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new BadRequestError('Question already answered');
    }

    // Get correct answer for this question
    const correctAnswerResult = await client.query(
      `SELECT a.display_order
       FROM answers a
       WHERE a.question_id = $1 AND a.is_correct = TRUE`,
      [questionId]
    );

    if (correctAnswerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new BadRequestError('Question not found');
    }

    const correctChoice = correctAnswerResult.rows[0].display_order;
    const isCorrect = answerIndex === correctChoice;

    // Record the answer
    await client.query(
      `INSERT INTO participant_answers (participant_id, question_id, answer_id, is_correct, answered_at)
       SELECT $1, $2, a.id, $3, NOW()
       FROM answers a
       WHERE a.question_id = $2 AND a.display_order = $4`,
      [participantId, questionId, isCorrect, answerIndex]
    );

    // Mark question as presented and revealed in session_questions
    await client.query(
      `UPDATE session_questions
       SET is_presented = TRUE, is_revealed = TRUE
       WHERE game_session_id = $1 AND question_id = $2`,
      [sessionId, questionId]
    );

    // Update participant score if correct
    if (isCorrect) {
      await client.query(
        `UPDATE game_participants SET score = score + 1 WHERE id = $1`,
        [participantId]
      );
    }

    // Get next question
    const nextQuestionResult = await client.query(
      `SELECT
        qs.id AS question_id,
        qs.question_text,
        qs.question_type,
        qs.image_url,
        qq.question_order
       FROM quiz_questions qq
       JOIN questions qs ON qq.question_id = qs.id
       WHERE qq.quiz_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM participant_answers pa
         WHERE pa.participant_id = $2 AND pa.question_id = qs.id
       )
       ORDER BY qq.question_order
       LIMIT 1`,
      [session.quiz_id, participantId]
    );

    let nextQuestion = null;
    let nextQuestionIndex = null;
    if (nextQuestionResult.rows.length > 0) {
      const q = nextQuestionResult.rows[0];
      nextQuestionIndex = q.question_order - 1; // 0-indexed

      // Get choices for next question
      const choicesResult = await client.query(
        `SELECT answer_text FROM answers WHERE question_id = $1 ORDER BY display_order`,
        [q.question_id]
      );

      nextQuestion = {
        id: q.question_id,
        index: nextQuestionIndex,
        text: q.question_text,
        type: q.question_type,
        imageUrl: q.image_url,
        choices: choicesResult.rows.map(r => r.answer_text)
      };
    }

    // Get correct answer text for feedback
    const correctAnswerTextResult = await client.query(
      `SELECT answer_text FROM answers WHERE question_id = $1 AND is_correct = TRUE`,
      [questionId]
    );
    const correctAnswerText = correctAnswerTextResult.rows[0]?.answer_text;

    await client.query('COMMIT');

    sendSuccess(res, {
      isCorrect,
      correctChoice,
      correctAnswerText,
      hasNextQuestion: nextQuestion !== null,
      nextQuestionIndex,
      nextQuestion
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Complete a solo session
 */
export async function completeSoloSession(req, res, next) {
  const { id: sessionId } = req.params;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify session exists
    const sessionResult = await client.query(
      `SELECT id, status FROM game_sessions WHERE id = $1 AND session_type = 'solo'`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new NotFoundError('Solo session not found');
    }

    if (sessionResult.rows[0].status === 'completed') {
      await client.query('ROLLBACK');
      throw new BadRequestError('Session is already completed');
    }

    // Mark session as completed
    await client.query(
      `UPDATE game_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    await client.query('COMMIT');

    sendSuccess(res, { message: 'Session completed' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Get full results breakdown for a solo session
 */
export async function getSoloResults(req, res, next) {
  const { id: sessionId } = req.params;

  try {
    const client = await getClient();

    try {
      // Get session and quiz info
      const sessionResult = await client.query(
        `SELECT gs.id, gs.quiz_id, gs.room_code, gs.status, gs.created_at, gs.completed_at,
                q.title as quiz_title
         FROM game_sessions gs
         JOIN quizzes q ON gs.quiz_id = q.id
         WHERE gs.id = $1 AND gs.session_type = 'solo'`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Solo session not found');
      }

      const session = sessionResult.rows[0];

      // Get participant info
      const participantResult = await client.query(
        `SELECT id, display_name, score FROM game_participants WHERE game_session_id = $1`,
        [sessionId]
      );

      const participant = participantResult.rows[0];

      // Get total questions
      const totalQuestionsResult = await client.query(
        `SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_id = $1`,
        [session.quiz_id]
      );
      const totalQuestions = parseInt(totalQuestionsResult.rows[0].count);

      // Get per-question breakdown
      const answersResult = await client.query(
        `SELECT
          qq.question_order,
          qs.question_text,
          pa.is_correct,
          a_selected.answer_text as selected_answer,
          a_selected.display_order as selected_index,
          a_correct.answer_text as correct_answer,
          a_correct.display_order as correct_index
         FROM quiz_questions qq
         JOIN questions qs ON qq.question_id = qs.id
         LEFT JOIN participant_answers pa ON pa.question_id = qs.id AND pa.participant_id = $1
         LEFT JOIN answers a_selected ON pa.answer_id = a_selected.id
         JOIN answers a_correct ON a_correct.question_id = qs.id AND a_correct.is_correct = TRUE
         WHERE qq.quiz_id = $2
         ORDER BY qq.question_order`,
        [participant.id, session.quiz_id]
      );

      const questions = answersResult.rows.map((row, idx) => ({
        index: idx,
        text: row.question_text,
        answered: row.selected_answer !== null,
        isCorrect: row.is_correct || false,
        selectedAnswer: row.selected_answer,
        selectedIndex: row.selected_index,
        correctAnswer: row.correct_answer,
        correctIndex: row.correct_index
      }));

      const correctCount = questions.filter(q => q.isCorrect).length;
      const answeredCount = questions.filter(q => q.answered).length;
      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      sendSuccess(res, {
        sessionId: session.id,
        quizId: session.quiz_id,
        roomCode: session.room_code,
        quizTitle: session.quiz_title,
        status: session.status,
        startedAt: session.created_at,
        completedAt: session.completed_at,
        playerName: participant.display_name,
        score: participant.score,
        totalQuestions,
        correctCount,
        answeredCount,
        percentage,
        questions
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}
