/**
 * Text Similarity Utilities for Duplicate Question Detection
 *
 * Provides normalized text comparison and Levenshtein distance
 * calculation for detecting similar questions.
 */

import crypto from 'crypto'

/**
 * Normalize text for comparison
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove punctuation
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return ''

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')        // Collapse multiple spaces/newlines
    .replace(/[^\w\s]/g, '')     // Remove punctuation
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(s1, s2) {
  if (s1.length === 0) return s2.length
  if (s2.length === 0) return s1.length

  const matrix = []

  // Initialize first column
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[s1.length][s2.length]
}

/**
 * Calculate similarity percentage between two texts
 *
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(text1, text2) {
  const s1 = normalizeText(text1)
  const s2 = normalizeText(text2)

  if (s1.length === 0 && s2.length === 0) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // For very long texts, truncate to first 200 chars for performance
  const maxLen = 200
  const t1 = s1.length > maxLen ? s1.substring(0, maxLen) : s1
  const t2 = s2.length > maxLen ? s2.substring(0, maxLen) : s2

  const distance = levenshteinDistance(t1, t2)
  const longerLength = Math.max(t1.length, t2.length)

  return (longerLength - distance) / longerLength
}

/**
 * Generate MD5 hash of normalized text for exact match detection
 *
 * @param {string} text - Text to hash
 * @returns {string} MD5 hash (32 chars)
 */
function generateTextHash(text) {
  const normalized = normalizeText(text)
  if (!normalized) return null

  return crypto.createHash('md5').update(normalized).digest('hex')
}

/**
 * Find similar questions from an array of existing questions
 *
 * @param {string} newText - New question text to check
 * @param {Array} existingQuestions - Array of {id, question_text, ...}
 * @param {number} threshold - Minimum similarity (0-1), default 0.8
 * @param {number|null} excludeId - Question ID to exclude (for editing)
 * @returns {Array} Similar questions sorted by similarity descending
 */
function findSimilarQuestions(newText, existingQuestions, threshold = 0.8, excludeId = null) {
  if (!newText || !existingQuestions || existingQuestions.length === 0) {
    return []
  }

  const newHash = generateTextHash(newText)
  const results = []

  for (const question of existingQuestions) {
    // Skip the question being edited
    if (excludeId && question.id === excludeId) continue

    // Check for exact match first (fast)
    const existingHash = question.text_hash || generateTextHash(question.question_text)
    if (newHash && existingHash && newHash === existingHash) {
      results.push({
        ...question,
        similarity: 1.0,
        isExactMatch: true
      })
      continue
    }

    // Calculate fuzzy similarity
    const similarity = calculateSimilarity(newText, question.question_text)

    if (similarity >= threshold) {
      results.push({
        ...question,
        similarity: Math.round(similarity * 100) / 100, // Round to 2 decimals
        isExactMatch: false
      })
    }
  }

  // Sort by similarity descending
  return results.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Find duplicate groups within a list of questions
 * Groups questions that are similar to each other
 *
 * @param {Array} questions - Array of {id, question_text, ...}
 * @param {number} threshold - Minimum similarity (0-1), default 0.8
 * @returns {Array} Array of groups, each containing similar questions
 */
function findDuplicateGroups(questions, threshold = 0.8) {
  if (!questions || questions.length < 2) return []

  const groups = []
  const processed = new Set()

  for (let i = 0; i < questions.length; i++) {
    if (processed.has(questions[i].id)) continue

    const group = [questions[i]]
    processed.add(questions[i].id)

    for (let j = i + 1; j < questions.length; j++) {
      if (processed.has(questions[j].id)) continue

      const similarity = calculateSimilarity(
        questions[i].question_text,
        questions[j].question_text
      )

      if (similarity >= threshold) {
        group.push({
          ...questions[j],
          similarity: Math.round(similarity * 100) / 100
        })
        processed.add(questions[j].id)
      }
    }

    // Only add groups with more than one question
    if (group.length > 1) {
      // Calculate average similarity for the group
      const avgSimilarity = group.length > 1
        ? group.slice(1).reduce((sum, q) => sum + q.similarity, 0) / (group.length - 1)
        : 1

      groups.push({
        questions: group,
        similarity: Math.round(avgSimilarity * 100) / 100
      })
    }
  }

  // Sort groups by similarity descending
  return groups.sort((a, b) => b.similarity - a.similarity)
}

export {
  normalizeText,
  levenshteinDistance,
  calculateSimilarity,
  generateTextHash,
  findSimilarQuestions,
  findDuplicateGroups
}
