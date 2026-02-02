/**
 * TriviaForge - Tag Controller
 *
 * Handles all tag-related operations:
 * - List tags (with optional type filter)
 * - Create tag
 * - Update tag
 * - Delete tag
 */

import { query } from '../config/database.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';

/**
 * List all tags with optional filtering by type
 * GET /api/tags?type=category,difficulty
 */
export async function listTags(req, res) {
  const { type } = req.query;

  let queryText = `
    SELECT
      t.id,
      t.name,
      t.tag_type,
      t.color,
      t.created_by,
      t.created_at,
      u.username as created_by_username,
      COUNT(qt.question_id) as usage_count
    FROM tags t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN question_tags qt ON t.id = qt.tag_id
  `;

  const queryParams = [];

  // Filter by type if provided
  if (type) {
    const types = type.split(',').map((t) => t.trim().toLowerCase());
    queryParams.push(types);
    queryText += ` WHERE t.tag_type = ANY($1)`;
  }

  queryText += `
    GROUP BY t.id, t.name, t.tag_type, t.color, t.created_by, t.created_at, u.username
    ORDER BY t.tag_type, t.name
  `;

  const result = await query(queryText, queryParams);

  res.json({
    tags: result.rows,
    count: result.rows.length,
  });
}

/**
 * Get a single tag by ID
 * GET /api/tags/:id
 */
export async function getTag(req, res) {
  const { id } = req.params;

  const result = await query(
    `
    SELECT
      t.id,
      t.name,
      t.tag_type,
      t.color,
      t.created_by,
      t.created_at,
      u.username as created_by_username,
      COUNT(qt.question_id) as usage_count
    FROM tags t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN question_tags qt ON t.id = qt.tag_id
    WHERE t.id = $1
    GROUP BY t.id, t.name, t.tag_type, t.color, t.created_by, t.created_at, u.username
    `,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Tag');
  }

  res.json(result.rows[0]);
}

/**
 * Create a new tag
 * POST /api/tags
 * Body: { name, tag_type, color }
 */
export async function createTag(req, res) {
  const { name, tag_type, color } = req.body;
  const userId = req.user?.id || null;

  // Validate required fields
  if (!name || !name.trim()) {
    throw new BadRequestError('Tag name is required');
  }

  if (!tag_type || !['category', 'difficulty', 'custom'].includes(tag_type)) {
    throw new BadRequestError('Tag type must be category, difficulty, or custom');
  }

  // Validate color format if provided
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new BadRequestError('Color must be a valid hex color (e.g., #FF5733)');
  }

  // Check for duplicate
  const existing = await query(
    'SELECT id FROM tags WHERE LOWER(name) = LOWER($1) AND tag_type = $2',
    [name.trim(), tag_type]
  );

  if (existing.rows.length > 0) {
    throw new ConflictError(`A ${tag_type} tag with this name already exists`);
  }

  // Insert the tag
  const result = await query(
    `
    INSERT INTO tags (name, tag_type, color, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, tag_type, color, created_by, created_at
    `,
    [name.trim(), tag_type, color || null, userId]
  );

  res.status(201).json(result.rows[0]);
}

/**
 * Update an existing tag
 * PUT /api/tags/:id
 * Body: { name, color }
 */
export async function updateTag(req, res) {
  const { id } = req.params;
  const { name, color } = req.body;

  // Check if tag exists
  const existing = await query('SELECT * FROM tags WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Tag');
  }

  const tag = existing.rows[0];

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    if (!name.trim()) {
      throw new BadRequestError('Tag name cannot be empty');
    }

    // Check for duplicate name
    const duplicate = await query(
      'SELECT id FROM tags WHERE LOWER(name) = LOWER($1) AND tag_type = $2 AND id != $3',
      [name.trim(), tag.tag_type, id]
    );

    if (duplicate.rows.length > 0) {
      throw new ConflictError(`A ${tag.tag_type} tag with this name already exists`);
    }

    updates.push(`name = $${paramIndex++}`);
    values.push(name.trim());
  }

  if (color !== undefined) {
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new BadRequestError('Color must be a valid hex color (e.g., #FF5733)');
    }
    updates.push(`color = $${paramIndex++}`);
    values.push(color || null);
  }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  values.push(id);
  const result = await query(
    `
    UPDATE tags
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, tag_type, color, created_by, created_at
    `,
    values
  );

  res.json(result.rows[0]);
}

/**
 * Delete a tag
 * DELETE /api/tags/:id
 */
export async function deleteTag(req, res) {
  const { id } = req.params;

  // Check if tag exists
  const existing = await query('SELECT * FROM tags WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    throw new NotFoundError('Tag');
  }

  // Get usage count for response
  const usageResult = await query(
    'SELECT COUNT(*) as count FROM question_tags WHERE tag_id = $1',
    [id]
  );
  const usageCount = parseInt(usageResult.rows[0].count, 10);

  // Delete the tag (cascade will remove question_tags entries)
  await query('DELETE FROM tags WHERE id = $1', [id]);

  res.json({
    success: true,
    message: `Tag deleted successfully`,
    removedFromQuestions: usageCount,
  });
}

export default {
  listTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
};
