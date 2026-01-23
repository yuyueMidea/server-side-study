import { db } from '../config/database.js';

export const CommentModel = {
  /**
   * Create a new comment
   */
  create(content, userId, postId) {
    const stmt = db.prepare(`
      INSERT INTO comments (content, user_id, post_id)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(content, userId, postId);
    return this.findById(result.lastInsertRowid);
  },

  /**
   * Find comment by ID
   */
  findById(id) {
    const stmt = db.prepare(`
      SELECT 
        c.*,
        u.username as author_username,
        u.email as author_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `);
    
    const row = stmt.get(id);
    return row ? this.formatComment(row) : null;
  },

  /**
   * Get comments by post ID
   */
  findByPostId(postId) {
    const stmt = db.prepare(`
      SELECT 
        c.*,
        u.username as author_username,
        u.email as author_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `);
    
    const rows = stmt.all(postId);
    return rows.map(row => this.formatComment(row));
  },

  /**
   * Get comment count for a post
   */
  countByPostId(postId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM comments
      WHERE post_id = ? AND deleted_at IS NULL
    `);
    const result = stmt.get(postId);
    return result?.count || 0;
  },

  /**
   * Delete a comment (soft delete)
   */
  delete(id) {
    const stmt = db.prepare(`
      UPDATE comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);
    
    return stmt.run(id).changes > 0;
  },

  /**
   * Check if user is the author of the comment
   */
  isAuthor(commentId, userId) {
    const stmt = db.prepare(`
      SELECT 1 FROM comments WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    return !!stmt.get(commentId, userId);
  },

  /**
   * Check if post exists
   */
  postExists(postId) {
    const stmt = db.prepare(`
      SELECT 1 FROM posts WHERE id = ? AND deleted_at IS NULL
    `);
    return !!stmt.get(postId);
  },

  /**
   * Format comment row with author object
   */
  formatComment(row) {
    if (!row) return null;
    
    const { author_username, author_email, ...comment } = row;
    
    return {
      ...comment,
      author: author_username ? {
        id: comment.user_id,
        username: author_username,
        email: author_email,
      } : null,
    };
  },
};
