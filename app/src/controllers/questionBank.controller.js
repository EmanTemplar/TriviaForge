/**
 * TriviaForge - Question Bank Controller
 *
 * Handles all question bank operations:
 * - List questions with pagination, filtering, sorting
 * - Get question details with answers, tags, quiz usage
 * - Update question text, type, answers
 * - Manage question tags
 * - Archive/restore (soft delete) and hard delete
 * - Bulk operations
 * - Create quiz from selected questions
 */

import { query, getClient, transaction } from '../config/database.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../utils/errors.js';

/**
 * List all questions with pagination, filtering, and sorting
 * GET /api/questions/bank
 *
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 25, max: 100)
 *   - search: Search in question text
 *   - type: Filter by question type (comma-separated)
 *   - tags: Filter by tag IDs (comma-separated)
 *   - hasImage: Filter by image presence (true/false)
 *   - archived: Include archived questions (true/false, default: false)
 *   - sortBy: Sort field (created_at, question_text, usage_count)
 *   - sortOrder: Sort direction (asc/desc, default: desc)
 *   - createdBy: Filter by creator user ID
 */
export async function listQuestions(req, res) {
  const {
    page = 1,
    limit = 25,
    search,
    type,
    tags,
    hasImage,
    archived = 'false',
    sortBy = 'created_at',
    sortOrder = 'desc',
    createdBy,
  } = req.query;

  // Validate and parse pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  // Validate sort parameters
  const validSortFields = ['created_at', 'question_text', 'usage_count', 'question_type'];
  const validSortOrders = ['asc', 'desc'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = validSortOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

  // Build query
  const conditions = [];
  const queryParams = [];
  let paramIndex = 1;

  // Filter out archived by default
  if (archived !== 'true') {
    conditions.push(`q.is_archived = FALSE`);
  }

  // Search filter
  if (search) {
    queryParams.push(`%${search}%`);
    conditions.push(`q.question_text ILIKE $${paramIndex++}`);
  }

  // Type filter
  if (type) {
    const types = type.split(',').map((t) => t.trim());
    queryParams.push(types);
    conditions.push(`q.question_type = ANY($${paramIndex++})`);
  }

  // Tags filter
  if (tags) {
    const tagIds = tags.split(',').map((t) => parseInt(t.trim(), 10)).filter((t) => !isNaN(t));
    if (tagIds.length > 0) {
      queryParams.push(tagIds);
      conditions.push(`EXISTS (
        SELECT 1 FROM question_tags qt
        WHERE qt.question_id = q.id AND qt.tag_id = ANY($${paramIndex++})
      )`);
    }
  }

  // Image filter
  if (hasImage === 'true') {
    conditions.push(`q.image_url IS NOT NULL`);
  } else if (hasImage === 'false') {
    conditions.push(`q.image_url IS NULL`);
  }

  // Creator filter
  if (createdBy) {
    queryParams.push(parseInt(createdBy, 10));
    conditions.push(`q.created_by = $${paramIndex++}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query
  const countQuery = `
    SELECT COUNT(DISTINCT q.id) as total
    FROM questions q
    ${whereClause}
  `;

  // Handle sorting - special case for usage_count
  let orderByClause;
  if (sortField === 'usage_count') {
    orderByClause = `ORDER BY usage_count ${sortDir}, q.created_at DESC`;
  } else {
    orderByClause = `ORDER BY q.${sortField} ${sortDir}`;
  }

  // Main query with aggregations
  const mainQuery = `
    SELECT
      q.id,
      q.question_text,
      q.question_type,
      q.image_url,
      q.image_type,
      q.is_archived,
      q.created_by,
      q.created_at,
      q.updated_at,
      u.username as created_by_username,
      COUNT(DISTINCT qq.quiz_id) as usage_count,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', t.id,
            'name', t.name,
            'tag_type', t.tag_type,
            'color', t.color
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) as tags
    FROM questions q
    LEFT JOIN users u ON q.created_by = u.id
    LEFT JOIN quiz_questions qq ON q.id = qq.question_id
    LEFT JOIN question_tags qt ON q.id = qt.question_id
    LEFT JOIN tags t ON qt.tag_id = t.id
    ${whereClause}
    GROUP BY q.id, q.question_text, q.question_type, q.image_url, q.image_type,
             q.is_archived, q.created_by, q.created_at, q.updated_at, u.username
    ${orderByClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(limitNum, offset);

  // Execute both queries
  const [countResult, questionsResult] = await Promise.all([
    query(countQuery, queryParams.slice(0, paramIndex - 3)),
    query(mainQuery, queryParams),
  ]);

  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limitNum);

  res.json({
    questions: questionsResult.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  });
}

/**
 * Get full details for a single question
 * GET /api/questions/:id/details
 *
 * Returns question with answers, tags, and quiz usage
 */
export async function getQuestionDetails(req, res) {
  const { id } = req.params;

  // Get question with answers
  const questionResult = await query(
    `
    SELECT
      q.id,
      q.question_text,
      q.question_type,
      q.image_url,
      q.image_type,
      q.is_archived,
      q.created_by,
      q.created_at,
      q.updated_at,
      u.username as created_by_username,
      u.email as created_by_email
    FROM questions q
    LEFT JOIN users u ON q.created_by = u.id
    WHERE q.id = $1
    `,
    [id]
  );

  if (questionResult.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  const question = questionResult.rows[0];

  // Get answers
  const answersResult = await query(
    `
    SELECT id, answer_text, is_correct, display_order
    FROM answers
    WHERE question_id = $1
    ORDER BY display_order
    `,
    [id]
  );

  // Get tags
  const tagsResult = await query(
    `
    SELECT t.id, t.name, t.tag_type, t.color
    FROM tags t
    JOIN question_tags qt ON t.id = qt.tag_id
    WHERE qt.question_id = $1
    ORDER BY t.tag_type, t.name
    `,
    [id]
  );

  // Get quiz usage
  const quizzesResult = await query(
    `
    SELECT
      qz.id,
      qz.title,
      qq.question_order
    FROM quizzes qz
    JOIN quiz_questions qq ON qz.id = qq.quiz_id
    WHERE qq.question_id = $1 AND qz.is_active = TRUE
    ORDER BY qz.title
    `,
    [id]
  );

  // Get session usage count
  const sessionResult = await query(
    `
    SELECT COUNT(DISTINCT sq.game_session_id) as session_count
    FROM session_questions sq
    WHERE sq.question_id = $1
    `,
    [id]
  );

  res.json({
    ...question,
    answers: answersResult.rows,
    tags: tagsResult.rows,
    quizzes: quizzesResult.rows,
    sessionCount: parseInt(sessionResult.rows[0].session_count, 10),
  });
}

/**
 * Update a question's text, type, and/or answers
 * PUT /api/questions/:id
 *
 * Body: {
 *   question_text?: string,
 *   question_type?: 'multiple_choice' | 'true_false' | 'short_answer',
 *   answers?: Array<{ id?: number, answer_text: string, is_correct: boolean, display_order: number }>
 * }
 */
export async function updateQuestion(req, res) {
  const { id } = req.params;
  const { question_text, question_type, answers } = req.body;

  // Check if question exists
  const existing = await query('SELECT * FROM questions WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Update question fields if provided
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (question_text !== undefined) {
      if (!question_text.trim()) {
        throw new BadRequestError('Question text cannot be empty');
      }
      updates.push(`question_text = $${paramIndex++}`);
      values.push(question_text.trim());
    }

    if (question_type !== undefined) {
      const validTypes = ['multiple_choice', 'true_false', 'short_answer'];
      if (!validTypes.includes(question_type)) {
        throw new BadRequestError('Invalid question type');
      }
      updates.push(`question_type = $${paramIndex++}`);
      values.push(question_type);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await client.query(
        `UPDATE questions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }

    // Update answers if provided
    if (answers && Array.isArray(answers)) {
      // Validate answers
      if (answers.length < 2) {
        throw new BadRequestError('Question must have at least 2 answers');
      }

      const hasCorrect = answers.some((a) => a.is_correct);
      if (!hasCorrect) {
        throw new BadRequestError('Question must have at least one correct answer');
      }

      // Delete existing answers and insert new ones
      await client.query('DELETE FROM answers WHERE question_id = $1', [id]);

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        if (!answer.answer_text?.trim()) {
          throw new BadRequestError(`Answer ${i + 1} text cannot be empty`);
        }

        await client.query(
          `INSERT INTO answers (question_id, answer_text, is_correct, display_order)
           VALUES ($1, $2, $3, $4)`,
          [id, answer.answer_text.trim(), answer.is_correct || false, answer.display_order ?? i]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch and return updated question
    const result = await query(
      `SELECT q.*, u.username as created_by_username
       FROM questions q
       LEFT JOIN users u ON q.created_by = u.id
       WHERE q.id = $1`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update tags for a question
 * PUT /api/questions/:id/tags
 *
 * Body: { tagIds: number[] }
 */
export async function updateQuestionTags(req, res) {
  const { id } = req.params;
  const { tagIds } = req.body;

  // Validate input
  if (!Array.isArray(tagIds)) {
    throw new BadRequestError('tagIds must be an array');
  }

  // Check if question exists
  const existing = await query('SELECT id FROM questions WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  // Validate all tag IDs exist
  if (tagIds.length > 0) {
    const tagsResult = await query(
      'SELECT id FROM tags WHERE id = ANY($1)',
      [tagIds]
    );
    if (tagsResult.rows.length !== tagIds.length) {
      throw new BadRequestError('One or more tag IDs are invalid');
    }
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Remove existing tags
    await client.query('DELETE FROM question_tags WHERE question_id = $1', [id]);

    // Add new tags
    if (tagIds.length > 0) {
      const insertValues = tagIds.map((tagId, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO question_tags (question_id, tag_id) VALUES ${insertValues}`,
        [id, ...tagIds]
      );
    }

    await client.query('COMMIT');

    // Fetch updated tags
    const tagsResult = await query(
      `SELECT t.id, t.name, t.tag_type, t.color
       FROM tags t
       JOIN question_tags qt ON t.id = qt.tag_id
       WHERE qt.question_id = $1
       ORDER BY t.tag_type, t.name`,
      [id]
    );

    res.json({
      questionId: parseInt(id, 10),
      tags: tagsResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Archive a question (soft delete)
 * PUT /api/questions/:id/archive
 */
export async function archiveQuestion(req, res) {
  const { id } = req.params;

  const result = await query(
    `UPDATE questions
     SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_archived = FALSE
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  res.json({
    success: true,
    message: 'Question archived successfully',
    questionId: parseInt(id, 10),
  });
}

/**
 * Restore an archived question
 * PUT /api/questions/:id/restore
 */
export async function restoreQuestion(req, res) {
  const { id } = req.params;

  const result = await query(
    `UPDATE questions
     SET is_archived = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_archived = TRUE
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  res.json({
    success: true,
    message: 'Question restored successfully',
    questionId: parseInt(id, 10),
  });
}

/**
 * Hard delete a question permanently
 * DELETE /api/questions/:id
 *
 * Query params:
 *   - confirm: Must be 'true' to proceed with deletion
 */
export async function deleteQuestion(req, res) {
  const { id } = req.params;
  const { confirm } = req.query;

  // Check if question exists
  const existing = await query('SELECT id FROM questions WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Question');
  }

  // Get usage info
  const usageResult = await query(
    `SELECT
       COUNT(DISTINCT qq.quiz_id) as quiz_count,
       COUNT(DISTINCT sq.game_session_id) as session_count
     FROM questions q
     LEFT JOIN quiz_questions qq ON q.id = qq.question_id
     LEFT JOIN session_questions sq ON q.id = sq.question_id
     WHERE q.id = $1`,
    [id]
  );

  const { quiz_count, session_count } = usageResult.rows[0];

  // If not confirmed and has usage, return warning
  if (confirm !== 'true' && (parseInt(quiz_count) > 0 || parseInt(session_count) > 0)) {
    return res.json({
      requiresConfirmation: true,
      message: 'This question is in use. Deleting it will affect existing data.',
      usage: {
        quizCount: parseInt(quiz_count, 10),
        sessionCount: parseInt(session_count, 10),
      },
    });
  }

  // Delete the question (cascades to answers and question_tags)
  await query('DELETE FROM questions WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Question permanently deleted',
    questionId: parseInt(id, 10),
    affectedQuizzes: parseInt(quiz_count, 10),
    affectedSessions: parseInt(session_count, 10),
  });
}

/**
 * Bulk apply tags to multiple questions
 * POST /api/questions/bulk-tag
 *
 * Body: {
 *   questionIds: number[],
 *   tagIds: number[],
 *   mode: 'add' | 'replace' (default: 'add')
 * }
 */
export async function bulkTagQuestions(req, res) {
  const { questionIds, tagIds, mode = 'add' } = req.body;

  // Validate input
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new BadRequestError('questionIds must be a non-empty array');
  }
  if (!Array.isArray(tagIds)) {
    throw new BadRequestError('tagIds must be an array');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify questions exist
    const questionsResult = await client.query(
      'SELECT id FROM questions WHERE id = ANY($1)',
      [questionIds]
    );
    if (questionsResult.rows.length !== questionIds.length) {
      throw new BadRequestError('One or more question IDs are invalid');
    }

    // Verify tags exist
    if (tagIds.length > 0) {
      const tagsResult = await client.query(
        'SELECT id FROM tags WHERE id = ANY($1)',
        [tagIds]
      );
      if (tagsResult.rows.length !== tagIds.length) {
        throw new BadRequestError('One or more tag IDs are invalid');
      }
    }

    // If replace mode, remove existing tags first
    if (mode === 'replace') {
      await client.query(
        'DELETE FROM question_tags WHERE question_id = ANY($1)',
        [questionIds]
      );
    }

    // Add tags to all questions
    if (tagIds.length > 0) {
      for (const questionId of questionIds) {
        for (const tagId of tagIds) {
          await client.query(
            `INSERT INTO question_tags (question_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT (question_id, tag_id) DO NOTHING`,
            [questionId, tagId]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Tags ${mode === 'replace' ? 'replaced' : 'added'} for ${questionIds.length} questions`,
      questionCount: questionIds.length,
      tagCount: tagIds.length,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Bulk archive multiple questions
 * POST /api/questions/bulk-archive
 *
 * Body: { questionIds: number[] }
 */
export async function bulkArchiveQuestions(req, res) {
  const { questionIds } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new BadRequestError('questionIds must be a non-empty array');
  }

  const result = await query(
    `UPDATE questions
     SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = ANY($1) AND is_archived = FALSE
     RETURNING id`,
    [questionIds]
  );

  res.json({
    success: true,
    message: `${result.rows.length} questions archived`,
    archivedCount: result.rows.length,
    archivedIds: result.rows.map((r) => r.id),
  });
}

/**
 * Bulk delete multiple questions permanently
 * DELETE /api/questions/bulk-delete
 *
 * Body: { questionIds: number[], confirm: boolean }
 */
export async function bulkDeleteQuestions(req, res) {
  const { questionIds, confirm } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new BadRequestError('questionIds must be a non-empty array');
  }

  // Get usage info for all questions
  const usageResult = await query(
    `SELECT
       q.id,
       COUNT(DISTINCT qq.quiz_id) as quiz_count,
       COUNT(DISTINCT sq.game_session_id) as session_count
     FROM questions q
     LEFT JOIN quiz_questions qq ON q.id = qq.question_id
     LEFT JOIN session_questions sq ON q.id = sq.question_id
     WHERE q.id = ANY($1)
     GROUP BY q.id`,
    [questionIds]
  );

  const totalQuizzes = usageResult.rows.reduce((sum, r) => sum + parseInt(r.quiz_count, 10), 0);
  const totalSessions = usageResult.rows.reduce((sum, r) => sum + parseInt(r.session_count, 10), 0);

  // If not confirmed and has usage, return warning
  if (!confirm && (totalQuizzes > 0 || totalSessions > 0)) {
    return res.json({
      requiresConfirmation: true,
      message: 'Some questions are in use. Deleting them will affect existing data.',
      usage: {
        totalQuizzes,
        totalSessions,
        questionCount: questionIds.length,
      },
    });
  }

  // Delete the questions
  const deleteResult = await query(
    'DELETE FROM questions WHERE id = ANY($1) RETURNING id',
    [questionIds]
  );

  res.json({
    success: true,
    message: `${deleteResult.rows.length} questions permanently deleted`,
    deletedCount: deleteResult.rows.length,
    deletedIds: deleteResult.rows.map((r) => r.id),
    affectedQuizzes: totalQuizzes,
    affectedSessions: totalSessions,
  });
}

/**
 * Create a new quiz from selected questions
 * POST /api/quizzes/from-selection
 *
 * Body: {
 *   title: string,
 *   description?: string,
 *   questionIds: number[],
 *   answerDisplayTimeout?: number
 * }
 */
export async function createQuizFromSelection(req, res) {
  const { title, description, questionIds, answerDisplayTimeout = 5000 } = req.body;
  const userId = req.user?.id;

  // Validate input
  if (!title?.trim()) {
    throw new BadRequestError('Quiz title is required');
  }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new BadRequestError('At least one question must be selected');
  }

  // Verify all questions exist and are not archived
  const questionsResult = await query(
    `SELECT id FROM questions WHERE id = ANY($1) AND is_archived = FALSE`,
    [questionIds]
  );

  if (questionsResult.rows.length !== questionIds.length) {
    throw new BadRequestError('One or more questions are invalid or archived');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create the quiz
    const quizResult = await client.query(
      `INSERT INTO quizzes (title, description, answer_display_timeout, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, answer_display_timeout, created_at`,
      [title.trim(), description?.trim() || null, answerDisplayTimeout, userId]
    );

    const quiz = quizResult.rows[0];

    // Link questions to quiz in the specified order
    for (let i = 0; i < questionIds.length; i++) {
      await client.query(
        `INSERT INTO quiz_questions (quiz_id, question_id, question_order)
         VALUES ($1, $2, $3)`,
        [quiz.id, questionIds[i], i + 1]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        answerDisplayTimeout: quiz.answer_display_timeout,
        createdAt: quiz.created_at,
        questionCount: questionIds.length,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  listQuestions,
  getQuestionDetails,
  updateQuestion,
  updateQuestionTags,
  archiveQuestion,
  restoreQuestion,
  deleteQuestion,
  bulkTagQuestions,
  bulkArchiveQuestions,
  bulkDeleteQuestions,
  createQuizFromSelection,
};
