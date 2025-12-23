/**
 * TriviaForge - Quiz Service
 *
 * Handles quiz data retrieval and manipulation for Socket.IO handlers.
 * Note: REST API quiz operations are in quiz.controller.js
 */

import { getClient, query } from '../config/database.js';

/**
 * QuizService - Manages quiz data operations
 */
class QuizService {
  /**
   * Fetch a complete quiz by ID with all questions and answers
   * Used by Socket.IO handlers for room management
   * @param {number} quizId - The quiz ID to fetch
   * @returns {Promise<Object|null>} Quiz object with questions and answers, or null if not found
   */
  async getQuizById(quizId) {
    const client = await getClient();
    try {
      // Fetch quiz metadata
      const quizResult = await client.query(
        'SELECT id, title, description, answer_display_timeout, created_at FROM quizzes WHERE id = $1 AND is_active = TRUE',
        [quizId]
      );

      if (quizResult.rows.length === 0) {
        return null;
      }

      const quiz = quizResult.rows[0];

      // Fetch questions with answers (using the view for convenience)
      const questionsResult = await client.query(
        `
        SELECT
          qs.id as question_id,
          qs.question_text,
          qs.question_type,
          qq.question_order,
          a.id as answer_id,
          a.answer_text,
          a.is_correct,
          a.display_order
        FROM quiz_questions qq
        JOIN questions qs ON qq.question_id = qs.id
        LEFT JOIN answers a ON qs.id = a.question_id
        WHERE qq.quiz_id = $1
        ORDER BY qq.question_order, a.display_order
      `,
        [quizId]
      );

      // Group answers by question
      const questionsMap = new Map();
      for (const row of questionsResult.rows) {
        if (!questionsMap.has(row.question_id)) {
          questionsMap.set(row.question_id, {
            id: row.question_id,
            text: row.question_text,
            type: row.question_type,
            order: row.question_order,
            choices: [],
          });
        }

        if (row.answer_id) {
          questionsMap.get(row.question_id).choices.push({
            id: row.answer_id,
            text: row.answer_text,
            isCorrect: row.is_correct,
            order: row.display_order,
          });
        }
      }

      const questions = Array.from(questionsMap.values()).sort((a, b) => a.order - b.order);

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        answerDisplayTimeout: quiz.answer_display_timeout,
        createdAt: quiz.created_at,
        questions,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Parse quiz filename to extract quiz ID
   * @param {string} quizFilename - Quiz filename (quiz_123.json or just 123)
   * @returns {number|null} Quiz ID or null if invalid
   */
  parseQuizId(quizFilename) {
    const quizId = quizFilename.includes('_')
      ? parseInt(quizFilename.split('_')[1].replace('.json', ''))
      : parseInt(quizFilename);

    return isNaN(quizId) ? null : quizId;
  }

  /**
   * Format quiz for Socket.IO room (legacy format)
   * @param {Object} quiz - Quiz from database
   * @param {string} quizFilename - Original filename
   * @returns {Object} Formatted quiz data
   */
  formatQuizForRoom(quiz, quizFilename) {
    return {
      filename: quizFilename,
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
   * Validate quiz has required data
   * @param {Object} quiz - Quiz object
   * @returns {boolean} True if valid
   */
  isValidQuiz(quiz) {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return false;
    }

    // Check each question has choices and a correct answer
    for (const question of quiz.questions) {
      if (!question.choices || question.choices.length === 0) {
        return false;
      }
      if (!question.choices.some((c) => c.isCorrect)) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const quizService = new QuizService();
export default quizService;
