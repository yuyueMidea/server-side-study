import { db } from '../config/database.js';

export const PostModel = {
  /**
   * Create a new post
   */
  create(title, content, userId) {
    const stmt = db.prepare(`
      INSERT INTO posts (title, content, user_id)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(title, content, userId);
    return this.findById(result.lastInsertRowid);
  },

  /**
   * Find post by ID with author info
   */
  findById(id) {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        u.username as author_username,
        u.email as author_email,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `);
    
    const row = stmt.get(id);
    return row ? this.formatPost(row) : null;
  },

  /**
   * Get all posts with pagination
   */
  findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL
    `);
    const { total } = countStmt.get();

    // Get posts
    const stmt = db.prepare(`
      SELECT 
        p.*,
        u.username as author_username,
        u.email as author_email,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset);
    const posts = rows.map(row => this.formatPost(row));

    return { posts, total };
  },

  /**
   * Get posts by user ID
   */
  findByUserId(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM posts WHERE user_id = ? AND deleted_at IS NULL
    `);
    const { total } = countStmt.get(userId);

    const stmt = db.prepare(`
      SELECT 
        p.*,
        u.username as author_username,
        u.email as author_email,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset);
    const posts = rows.map(row => this.formatPost(row));

    return { posts, total };
  },

  /**
   * Update a post
   */
  update(id, title, content) {
    const stmt = db.prepare(`
      UPDATE posts
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);
    
    stmt.run(title, content, id);
    return this.findById(id);
  },

  /**
   * Soft delete a post
   */
  delete(id) {
    const stmt = db.prepare(`
      UPDATE posts
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);
    
    return stmt.run(id).changes > 0;
  },

  /**
   * Check if user is the author
   */
  isAuthor(postId, userId) {
    const stmt = db.prepare(`
      SELECT 1 FROM posts WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `);
    return !!stmt.get(postId, userId);
  },

  /**
   * Format post row with author object
   */
  formatPost(row) {
    if (!row) return null;
    
    const { author_username, author_email, ...post } = row;
    
    return {
      ...post,
      author: author_username ? {
        id: post.user_id,
        username: author_username,
        email: author_email,
      } : null,
    };
  },
};
