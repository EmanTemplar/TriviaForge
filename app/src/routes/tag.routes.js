/**
 * TriviaForge - Tag Routes
 *
 * All tag-related endpoints:
 * - List tags (with optional type filter)
 * - Get single tag
 * - Create tag
 * - Update tag
 * - Delete tag
 */

import { Router } from 'express';
import * as tagController from '../controllers/tag.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * List all tags
 * GET /api/tags
 *
 * Query params:
 *   - type: Filter by tag type (category, difficulty, custom)
 *           Can be comma-separated for multiple types
 *
 * Returns: { tags: [...], count: N }
 */
router.get('/', requireAdmin, asyncHandler(tagController.listTags));

/**
 * Get single tag by ID
 * GET /api/tags/:id
 *
 * Returns: Tag object with usage count
 */
router.get('/:id', requireAdmin, asyncHandler(tagController.getTag));

/**
 * Create a new tag
 * POST /api/tags
 *
 * Body: { name, tag_type, color? }
 *   - name: Tag name (required)
 *   - tag_type: 'category', 'difficulty', or 'custom' (required)
 *   - color: Hex color string, e.g., '#FF5733' (optional)
 *
 * Returns: Created tag object
 */
router.post('/', requireAdmin, asyncHandler(tagController.createTag));

/**
 * Update an existing tag
 * PUT /api/tags/:id
 *
 * Body: { name?, color? }
 *   - name: New tag name (optional)
 *   - color: New hex color (optional)
 *
 * Note: tag_type cannot be changed after creation
 *
 * Returns: Updated tag object
 */
router.put('/:id', requireAdmin, asyncHandler(tagController.updateTag));

/**
 * Delete a tag
 * DELETE /api/tags/:id
 *
 * Note: This will remove the tag from all questions
 *
 * Returns: { success: true, removedFromQuestions: N }
 */
router.delete('/:id', requireAdmin, asyncHandler(tagController.deleteTag));

export default router;
