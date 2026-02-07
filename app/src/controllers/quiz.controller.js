/**
 * TriviaForge - Quiz Controller
 *
 * Handles all quiz-related operations:
 * - CRUD operations for quizzes
 * - Excel import/export functionality
 * - Quiz template generation
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { query, getClient, transaction } from '../config/database.js';
import {
  NotFoundError,
  BadRequestError,
  DatabaseError,
} from '../utils/errors.js';
import { sendSuccess } from '../utils/responses.js';

// Ensure uploads directory exists on startup
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'questions');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Helper: Get quiz by ID with all questions and answers
 *
 * @param {number} quizId - Quiz ID
 * @returns {Promise<Object|null>} Quiz object or null if not found
 */
async function getQuizById(quizId) {
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

    // Fetch questions with answers (direct query to include image fields)
    const questionsResult = await client.query(
      `
      SELECT
        qs.id AS question_id,
        qs.question_text,
        qs.question_type,
        qs.image_url,
        qs.image_type,
        qq.question_order,
        a.id AS answer_id,
        a.answer_text,
        a.is_correct,
        a.display_order
      FROM quiz_questions qq
      JOIN questions qs ON qq.question_id = qs.id
      JOIN answers a ON qs.id = a.question_id
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
          imageUrl: row.image_url,
          imageType: row.image_type,
          order: row.question_order,
          choices: [],
        });
      }
      questionsMap.get(row.question_id).choices.push({
        id: row.answer_id,
        text: row.answer_text,
        isCorrect: row.is_correct,
        order: row.display_order,
      });
    }

    // Convert map to array sorted by question_order
    const questions = Array.from(questionsMap.values()).sort(
      (a, b) => a.order - b.order
    );

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
 * Helper: List all active quizzes (basic info only)
 *
 * @returns {Promise<Array>} Array of quiz objects
 */
async function listQuizzesFromDB() {
  const result = await query(`
    SELECT
      q.id,
      q.title,
      q.description,
      q.created_at,
      q.question_timer,
      q.reveal_delay,
      q.available_live,
      q.available_solo,
      COUNT(qq.question_id) as question_count
    FROM quizzes q
    LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
    WHERE q.is_active = TRUE
    GROUP BY q.id, q.title, q.description, q.created_at, q.question_timer, q.reveal_delay, q.available_live, q.available_solo
    ORDER BY q.created_at DESC
  `);

  return result.rows;
}

/**
 * List all quizzes
 *
 * GET /api/quizzes
 */
export async function listQuizzes(req, res, next) {
  try {
    const quizzes = await listQuizzesFromDB();

    // Format response to match expected structure for frontend
    const formatted = quizzes.map((q) => ({
      id: q.id,
      filename: `quiz_${q.id}.json`, // For backward compatibility with frontend
      title: q.title,
      description: q.description,
      questionCount: parseInt(q.question_count),
      createdAt: q.created_at,
      // v5.4.0: Timer and availability settings
      questionTimer: q.question_timer,
      revealDelay: q.reveal_delay,
      availableLive: q.available_live !== false, // Default true
      availableSolo: q.available_solo !== false, // Default true
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single quiz by ID
 *
 * GET /api/quizzes/:filename
 * Note: :filename param is actually the quiz ID (for backward compatibility)
 * Format: quiz_123.json → extract ID 123
 */
export async function getQuiz(req, res, next) {
  try {
    // Extract quiz ID from filename format (quiz_123.json → 123)
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    const quiz = await getQuizById(quizId);

    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Format response to match expected frontend structure
    const formatted = {
      filename: `quiz_${quiz.id}.json`,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        imageUrl: q.imageUrl || null,
        imageType: q.imageType || null,
        choices: q.choices.map((c) => c.text),
        correctChoice: q.choices.findIndex((c) => c.isCorrect),
      })),
    };

    res.json(formatted);
  } catch (err) {
    next(err);
  }
}

/**
 * Create new quiz
 *
 * POST /api/quizzes
 * Body: { title, description, questions }
 */
export async function createQuiz(req, res, next) {
  const { title, description, questions, questionTimer, revealDelay, availableLive, availableSolo } = req.body;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Insert quiz (use authenticated user's ID) - v5.4.0: includes timer and availability settings
    const userId = req.user?.user_id || 1; // Fallback for backward compatibility
    const quizResult = await client.query(
      `INSERT INTO quizzes (title, description, created_by, question_timer, reveal_delay, available_live, available_solo)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE), COALESCE($7, TRUE)) RETURNING id`,
      [title, description, userId, questionTimer || null, revealDelay || null, availableLive, availableSolo]
    );
    const quizId = quizResult.rows[0].id;

    // Insert each question with answers
    for (let i = 0; i < (questions || []).length; i++) {
      const q = questions[i];

      // Insert question - use provided type or default to multiple_choice
      const questionType = q.type || 'multiple_choice';
      const imageUrl = q.imageUrl || null;
      const imageType = q.imageType || null;
      const questionResult = await client.query(
        'INSERT INTO questions (question_text, question_type, image_url, image_type, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [q.text, questionType, imageUrl, imageType, userId]
      );
      const questionId = questionResult.rows[0].id;

      // Link question to quiz
      await client.query(
        'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
        [quizId, questionId, i + 1]
      );

      // Insert answers
      for (let j = 0; j < (q.choices || []).length; j++) {
        const isCorrect = j === q.correctChoice;
        await client.query(
          'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
          [questionId, q.choices[j], isCorrect, j]
        );
      }
    }

    await client.query('COMMIT');

    // Return formatted response
    const filename = `quiz_${quizId}.json`;
    res.json({
      filename,
      id: quizId,
      title,
      description,
      questions: questions || [],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating quiz:', err);
    next(new DatabaseError('Failed to create quiz', err));
  } finally {
    client.release();
  }
}

/**
 * Update existing quiz
 *
 * PUT /api/quizzes/:filename
 * Body: { title, description, questions }
 */
export async function updateQuiz(req, res, next) {
  const client = await getClient();

  try {
    // Extract quiz ID from filename
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    const { title, description, questions, questionTimer, revealDelay, availableLive, availableSolo } = req.body;

    // If questions is provided, it must be an array
    if (questions !== undefined && !Array.isArray(questions)) {
      throw new BadRequestError('Questions must be an array');
    }

    await client.query('BEGIN');

    // Check if this is a metadata-only update (no questions provided)
    const isMetadataOnlyUpdate = questions === undefined;

    if (isMetadataOnlyUpdate) {
      // Only update the fields that are provided (v5.4.0: availability toggles)
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (questionTimer !== undefined) {
        updates.push(`question_timer = $${paramIndex++}`);
        values.push(questionTimer || null);
      }
      if (revealDelay !== undefined) {
        updates.push(`reveal_delay = $${paramIndex++}`);
        values.push(revealDelay || null);
      }
      if (availableLive !== undefined) {
        updates.push(`available_live = $${paramIndex++}`);
        values.push(availableLive);
      }
      if (availableSolo !== undefined) {
        updates.push(`available_solo = $${paramIndex++}`);
        values.push(availableSolo);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(quizId);
        await client.query(
          `UPDATE quizzes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      await client.query('COMMIT');

      // Return the updated quiz
      const updatedQuiz = await client.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
      return res.json({
        success: true,
        quiz: updatedQuiz.rows[0]
      });
    }

    // Full update with questions - original logic
    // Update quiz metadata (v5.4.0: includes timer and availability settings)
    await client.query(
      `UPDATE quizzes SET
        title = $1,
        description = $2,
        question_timer = $3,
        reveal_delay = $4,
        available_live = COALESCE($5, TRUE),
        available_solo = COALESCE($6, TRUE),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7`,
      [title, description, questionTimer || null, revealDelay || null, availableLive, availableSolo, quizId]
    );

    // Get list of questions currently associated with this quiz
    const oldQuestionsResult = await client.query(
      'SELECT question_id FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );
    const oldQuestionIds = oldQuestionsResult.rows.map((row) => row.question_id);

    // Delete quiz-question relationships first
    await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

    // Try to delete old questions that are NOT referenced by session_questions
    // (Questions used in sessions will be preserved for historical data)
    if (oldQuestionIds.length > 0) {
      await client.query(
        `
        DELETE FROM questions
        WHERE id = ANY($1::int[])
        AND NOT EXISTS (
          SELECT 1 FROM session_questions WHERE question_id = questions.id
        )
      `,
        [oldQuestionIds]
      );
    }

    // Insert new questions with answers (use authenticated user's ID)
    const userId = req.user?.user_id || 1; // Fallback for backward compatibility
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Insert question - use provided type or default to multiple_choice
      const questionType = q.type || 'multiple_choice';
      const imageUrl = q.imageUrl || null;
      const imageType = q.imageType || null;
      const questionResult = await client.query(
        'INSERT INTO questions (question_text, question_type, image_url, image_type, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [q.text, questionType, imageUrl, imageType, userId]
      );
      const questionId = questionResult.rows[0].id;

      // Link question to quiz
      await client.query(
        'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
        [quizId, questionId, i + 1]
      );

      // Insert answers
      for (let j = 0; j < (q.choices || []).length; j++) {
        const isCorrect = j === q.correctChoice;
        await client.query(
          'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
          [questionId, q.choices[j], isCorrect, j]
        );
      }
    }

    await client.query('COMMIT');

    // Return formatted response
    res.json({
      filename: `quiz_${quizId}.json`,
      id: quizId,
      title,
      description,
      questions,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating quiz:', err);
    next(new DatabaseError('Failed to update quiz', err));
  } finally {
    client.release();
  }
}

/**
 * Delete quiz (soft delete - sets is_active = false)
 *
 * DELETE /api/quizzes/:filename
 */
export async function deleteQuiz(req, res, next) {
  try {
    // Extract quiz ID from filename
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      throw new BadRequestError('Invalid quiz ID format');
    }

    // Soft delete: set is_active to false
    const result = await query(
      'UPDATE quizzes SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [quizId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Quiz');
    }

    sendSuccess(res, null, 'Quiz deleted successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Upload image for question
 *
 * POST /api/quizzes/upload-image
 * Multipart form data with 'image' field
 */
export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('No image file uploaded');
    }

    // Return the URL path for the uploaded image
    const imageUrl = `/uploads/questions/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    next(err);
  }
}

/**
 * Download Excel quiz template
 *
 * GET /api/quiz-template
 */
export async function downloadTemplate(req, res, next) {
  try {
    // Create a new workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quiz');

    // Set column widths
    worksheet.columns = [
      { width: 40 }, // Question Text
      { width: 18 }, // Choice A
      { width: 18 }, // Choice B
      { width: 18 }, // Choice C
      { width: 18 }, // Choice D
      { width: 18 }, // Choice E
      { width: 18 }, // Choice F
      { width: 18 }, // Choice G
      { width: 18 }, // Choice H
      { width: 18 }, // Choice I
      { width: 18 }, // Choice J
      { width: 30 }, // Correct Answer
    ];

    // Row 1: Quiz Title (label + editable)
    worksheet.getRow(1).values = ['Quiz Title', 'My Quiz Title'];
    worksheet.getCell('A1').font = { bold: true };
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' },
    }; // Light green
    worksheet.getCell('B1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    }; // White (editable)
    worksheet.getCell('B1').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Row 2: Description (label + editable)
    worksheet.getRow(2).values = ['Description', 'Description of the quiz'];
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('A2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' },
    }; // Light green
    worksheet.getCell('B2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    }; // White (editable)
    worksheet.getCell('B2').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Row 3: Empty

    // Row 4: Index reference (reference only - light gray background)
    const indexRow = worksheet.getRow(4);
    indexRow.values = [
      'Index →',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '← Use these numbers',
    ];
    indexRow.font = { bold: true, color: { argb: 'FF666666' } };
    indexRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 12; col++) {
      const cell = worksheet.getCell(4, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }; // Light gray
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // Row 5: Column headers (reference only - blue background)
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
      'Question Text',
      'Choice A',
      'Choice B',
      'Choice C',
      'Choice D',
      'Choice E',
      'Choice F',
      'Choice G',
      'Choice H',
      'Choice I',
      'Choice J',
      'Correct Answer (0-based index)',
    ];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 1; col <= 12; col++) {
      const cell = worksheet.getCell(5, col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      }; // Blue
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    // Sample questions (rows 6-9) - white background (editable)
    const sampleData = [
      ['What is 2+2?', '3', '4', '5', '6', '', '', '', '', '', '', '1'],
      ['What color is the sky?', 'Red', 'Blue', 'Green', 'Yellow', '', '', '', '', '', '', '1'],
      [
        'Sample question with 6 choices',
        'Choice 1',
        'Choice 2',
        'Choice 3',
        'Choice 4',
        'Choice 5',
        'Choice 6',
        '',
        '',
        '',
        '',
        '3',
      ],
      [
        'Sample question with 10 choices',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        '9',
      ],
    ];

    for (let i = 0; i < sampleData.length; i++) {
      const row = worksheet.getRow(6 + i);
      row.values = sampleData[i];

      // Style each cell in the sample rows
      for (let col = 1; col <= 12; col++) {
        const cell = worksheet.getCell(6 + i, col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' },
        }; // White
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Center align the correct answer column
        if (col === 12) {
          cell.alignment = { horizontal: 'center' };
        }
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_template.xlsx"');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err) {
    console.error('Error generating template:', err);
    next(new DatabaseError('Failed to generate template', err));
  }
}

/**
 * Import quiz from Excel file
 *
 * POST /api/import-quiz
 * Multipart form data with 'file' field
 *
 * Query params:
 *   - preview: If 'true', returns parsed questions without creating the quiz
 *
 * Body (when not in preview mode):
 *   - decisions: Object mapping rowIndex to { action: 'use-existing'|'create-new'|'skip', existingQuestionId: number|null }
 */
export async function importQuiz(req, res, next) {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const isPreview = req.query.preview === 'true';
    // Parse decisions from body (sent as JSON string in form data)
    let decisions = {};
    if (req.body.decisions) {
      try {
        decisions = typeof req.body.decisions === 'string'
          ? JSON.parse(req.body.decisions)
          : req.body.decisions;
      } catch (e) {
        console.error('Error parsing decisions:', e);
      }
    }

    // Parse Excel file with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    // Convert worksheet to array format (similar to xlsx.utils.sheet_to_json with header: 1)
    const data = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      // ExcelJS row.values is 1-indexed, slice(1) to make it 0-indexed like xlsx
      data.push(row.values.slice(1));
    });

    // Extract quiz metadata (first 2 rows)
    if (data.length < 6) {
      throw new BadRequestError('Invalid template format. Please use the provided template.');
    }

    const title = data[0][1] || 'Untitled Quiz';
    const description = data[1][1] || '';

    // Extract questions (starting from row 5, after the index reference and header rows)
    const questions = [];
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 1; // 1-indexed row number for user display

      // Skip empty rows
      if (!row || !row[0]) continue;

      const questionText = row[0];
      const choices = [];

      // Collect all non-empty choices (columns 1-10)
      for (let j = 1; j <= 10; j++) {
        if (row[j] && row[j].toString().trim() !== '') {
          choices.push(row[j].toString());
        }
      }

      // Get correct answer index (column 11, since columns 1-10 are choices)
      const correctChoice = parseInt(row[11]);

      // Validate
      if (
        !questionText ||
        choices.length < 2 ||
        isNaN(correctChoice) ||
        correctChoice < 0 ||
        correctChoice >= choices.length
      ) {
        throw new BadRequestError(
          `Invalid question at row ${rowIndex}: Must have question text, at least 2 choices, and valid correct answer index`
        );
      }

      // Create question object with rowIndex for duplicate tracking
      questions.push({
        text: questionText,
        choices: choices,
        correctChoice: correctChoice,
        rowIndex: rowIndex,
        id: `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      });
    }

    if (questions.length === 0) {
      throw new BadRequestError('No valid questions found in the file');
    }

    // If preview mode, return parsed questions without creating
    if (isPreview) {
      return res.json({
        success: true,
        preview: true,
        title,
        description,
        questions: questions.map(q => ({
          rowIndex: q.rowIndex,
          text: q.text,
          choices: q.choices,
          correctChoice: q.correctChoice
        })),
        questionCount: questions.length,
      });
    }

    // Save quiz to database (use authenticated user's ID)
    const userId = req.user?.user_id || 1; // Fallback for backward compatibility
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Insert quiz
      const quizResult = await client.query(
        'INSERT INTO quizzes (title, description, created_by) VALUES ($1, $2, $3) RETURNING id',
        [title, description, userId]
      );
      const quizId = quizResult.rows[0].id;

      // Track statistics
      let createdCount = 0;
      let linkedCount = 0;
      let skippedCount = 0;

      // Insert each question with answers
      let questionOrder = 1;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const decision = decisions[q.rowIndex];

        // Handle skip decision
        if (decision?.action === 'skip') {
          skippedCount++;
          continue;
        }

        // Handle use-existing decision
        if (decision?.action === 'use-existing' && decision.existingQuestionId) {
          // Verify the existing question exists
          const existingCheck = await client.query(
            'SELECT id FROM questions WHERE id = $1 AND is_archived = FALSE',
            [decision.existingQuestionId]
          );

          if (existingCheck.rows.length > 0) {
            // Link existing question to quiz
            await client.query(
              'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
              [quizId, decision.existingQuestionId, questionOrder++]
            );
            linkedCount++;
            continue;
          }
          // If existing question not found, fall through to create new
        }

        // Create new question (default action or create-new decision)
        const questionType = q.type || 'multiple_choice';
        const questionResult = await client.query(
          'INSERT INTO questions (question_text, question_type, created_by) VALUES ($1, $2, $3) RETURNING id',
          [q.text, questionType, userId]
        );
        const questionId = questionResult.rows[0].id;

        // Link question to quiz
        await client.query(
          'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
          [quizId, questionId, questionOrder++]
        );

        // Insert answers
        for (let j = 0; j < q.choices.length; j++) {
          const isCorrect = j === q.correctChoice;
          await client.query(
            'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
            [questionId, q.choices[j], isCorrect, j]
          );
        }

        createdCount++;
      }

      await client.query('COMMIT');

      const filename = `quiz_${quizId}.json`;
      res.json({
        success: true,
        filename,
        id: quizId,
        title,
        questionCount: questionOrder - 1, // Total questions in quiz
        stats: {
          created: createdCount,
          linked: linkedCount,
          skipped: skippedCount,
        },
      });
    } catch (dbErr) {
      console.error('❌ Database error:', dbErr);
      await client.query('ROLLBACK');
      throw new DatabaseError('Failed to save quiz to database', dbErr);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error importing quiz:', err);
    next(err);
  }
}

// Export all controller functions
export default {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  uploadImage,
  downloadTemplate,
  importQuiz,
};
