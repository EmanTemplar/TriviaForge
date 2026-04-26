/**
 * TriviaForge - Deduplication Service
 *
 * Owns all duplicate-detection logic for the question bank:
 * - Fetches candidate questions from the database
 * - Computes exact-match hashes and fuzzy similarity scores
 * - Exposes higher-level methods so controllers never touch
 *   the similarity utilities or raw DB queries directly
 */

import { query } from '../config/database.js'
import {
  generateTextHash,
  findSimilarQuestions,
  findDuplicateGroups,
} from '../utils/similarity.js'

/**
 * SQL fragment that selects the columns needed for duplicate checks.
 * Used by every query in this service to keep column lists consistent.
 */
const QUESTION_COLUMNS = `
  q.id, q.question_text, q.question_type, q.text_hash,
  COUNT(DISTINCT qq.quiz_id) as usage_count,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) as tags
`

const QUESTION_JOINS = `
  FROM questions q
  LEFT JOIN quiz_questions qq ON q.id = qq.question_id
  LEFT JOIN question_tags qt  ON q.id = qt.question_id
  LEFT JOIN tags t             ON qt.tag_id = t.id
`

/** Coerce usage_count to an integer on every row returned from the DB */
function normalizeRows(rows) {
  return rows.map((q) => ({ ...q, usage_count: parseInt(q.usage_count, 10) }))
}

/**
 * Check whether a single question text has duplicates in the database.
 *
 * Strategy:
 *  1. Hash the incoming text and do a fast exact-match lookup.
 *  2. If no exact match, fetch all non-archived questions and run
 *     fuzzy matching against them.
 *
 * @param {string} questionText - The text to check
 * @param {object} [options]
 * @param {number|null} [options.excludeId]  - Question ID to exclude (editing)
 * @param {number}      [options.threshold]  - Similarity threshold 0–1 (default 0.8)
 * @returns {Promise<{ hasDuplicates: boolean, exactMatch: object|null, similarQuestions: object[] }>}
 */
export async function checkForDuplicates(questionText, options = {}) {
  const { excludeId = null, threshold = 0.8 } = options

  // --- 1. Exact hash match (fast path) ---
  const newHash = generateTextHash(questionText)
  let exactMatch = null

  if (newHash) {
    const exactResult = await query(
      `SELECT ${QUESTION_COLUMNS}
       ${QUESTION_JOINS}
       WHERE q.text_hash = $1 AND q.is_archived = FALSE
       ${excludeId ? 'AND q.id != $2' : ''}
       GROUP BY q.id
       LIMIT 1`,
      excludeId ? [newHash, excludeId] : [newHash]
    )

    if (exactResult.rows.length > 0) {
      exactMatch = {
        ...exactResult.rows[0],
        usage_count: parseInt(exactResult.rows[0].usage_count, 10),
        similarity: 1.0,
        isExactMatch: true,
      }
    }
  }

  if (exactMatch) {
    return { hasDuplicates: true, exactMatch, similarQuestions: [] }
  }

  // --- 2. Fuzzy matching against all non-archived questions ---
  const questionsResult = await query(
    `SELECT ${QUESTION_COLUMNS}
     ${QUESTION_JOINS}
     WHERE q.is_archived = FALSE
     ${excludeId ? 'AND q.id != $1' : ''}
     GROUP BY q.id`,
    excludeId ? [excludeId] : []
  )

  const existingQuestions = normalizeRows(questionsResult.rows)

  const similarQuestions = findSimilarQuestions(
    questionText,
    existingQuestions,
    threshold,
    excludeId
  )

  return {
    hasDuplicates: similarQuestions.length > 0,
    exactMatch: null,
    similarQuestions: similarQuestions.slice(0, 10), // cap at top 10
  }
}

/**
 * Check duplicates for a batch of question texts.
 *
 * Fetches the full question list once, then runs fuzzy matching for each
 * incoming question without additional round-trips.
 *
 * @param {Array<{ text: string, rowIndex: number }>} questions - Incoming questions
 * @param {object} [options]
 * @param {number} [options.threshold] - Similarity threshold 0–1 (default 0.8)
 * @returns {Promise<{ results: object[], totalDuplicates: number }>}
 */
export async function checkBatchForDuplicates(questions, options = {}) {
  const { threshold = 0.8 } = options

  // Fetch all existing questions once
  const existingResult = await query(
    `SELECT ${QUESTION_COLUMNS}
     ${QUESTION_JOINS}
     WHERE q.is_archived = FALSE
     GROUP BY q.id`
  )

  const existingQuestions = normalizeRows(existingResult.rows)

  const results = []
  let totalDuplicates = 0

  for (const item of questions) {
    const { text, rowIndex } = item

    if (!text?.trim() || text.trim().length < 10) {
      results.push({ rowIndex, hasDuplicates: false, similarQuestions: [] })
      continue
    }

    const similarQuestions = findSimilarQuestions(
      text,
      existingQuestions,
      threshold,
      null
    )

    const hasDuplicates = similarQuestions.length > 0
    if (hasDuplicates) totalDuplicates++

    results.push({
      rowIndex,
      questionText: text,
      hasDuplicates,
      similarQuestions: similarQuestions.slice(0, 3), // top 3 per question
    })
  }

  return { results, totalDuplicates }
}

/**
 * Find all duplicate groups across the entire question bank.
 *
 * Also applies the ignored-pairs filter so that previously dismissed
 * pairs are excluded from the returned groups.
 *
 * @param {object} [options]
 * @param {number}  [options.threshold]       - Similarity threshold 0–1 (default 0.8)
 * @param {boolean} [options.includeArchived] - Whether to include archived questions (default false)
 * @returns {Promise<{ groups: object[], totalQuestions: number }>}
 */
export async function findAllDuplicateGroups(options = {}) {
  const { threshold = 0.8, includeArchived = false } = options

  const archivedClause = includeArchived ? '' : 'WHERE q.is_archived = FALSE'

  const questionsResult = await query(
    `SELECT ${QUESTION_COLUMNS}, q.created_at
     ${QUESTION_JOINS}
     ${archivedClause}
     GROUP BY q.id
     ORDER BY q.created_at DESC`
  )

  const questions = normalizeRows(questionsResult.rows)

  // Fetch ignored pairs
  const ignoredResult = await query(
    'SELECT question_id_1, question_id_2 FROM ignored_duplicate_pairs'
  )

  // Build a Set of both-direction keys for fast lookup
  const ignoredPairs = new Set()
  for (const row of ignoredResult.rows) {
    ignoredPairs.add(`${row.question_id_1}-${row.question_id_2}`)
    ignoredPairs.add(`${row.question_id_2}-${row.question_id_1}`)
  }

  // Compute all duplicate groups
  let groups = findDuplicateGroups(questions, threshold)

  // Filter out ignored pairs within each group
  groups = groups
    .map((group) => {
      const baseQuestion = group.questions[0]
      const filteredQuestions = [baseQuestion]

      for (let i = 1; i < group.questions.length; i++) {
        const q = group.questions[i]
        const pairKey = `${Math.min(baseQuestion.id, q.id)}-${Math.max(baseQuestion.id, q.id)}`
        if (!ignoredPairs.has(pairKey)) {
          filteredQuestions.push(q)
        }
      }

      return { ...group, questions: filteredQuestions }
    })
    .filter((group) => group.questions.length > 1)

  return { groups, totalQuestions: questions.length }
}
