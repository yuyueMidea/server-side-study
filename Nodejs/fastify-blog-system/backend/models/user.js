import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const UserModel = {
  /**
   * Create a new user
   */
  create(username, email, password) {
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(username, email, hashedPassword);
    return this.findById(result.lastInsertRowid);
  },

  /**
   * Find user by ID
   */
  findById(id) {
    const stmt = db.prepare(`
      SELECT id, username, email, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `);
    return stmt.get(id);
  },

  /**
   * Find user by username
   */
  findByUsername(username) {
    const stmt = db.prepare(`
      SELECT *
      FROM users
      WHERE username = ? AND deleted_at IS NULL
    `);
    return stmt.get(username);
  },

  /**
   * Find user by email
   */
  findByEmail(email) {
    const stmt = db.prepare(`
      SELECT *
      FROM users
      WHERE email = ? AND deleted_at IS NULL
    `);
    return stmt.get(email);
  },

  /**
   * Verify password
   */
  verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  /**
   * Check if username exists
   */
  usernameExists(username) {
    const stmt = db.prepare(`
      SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL
    `);
    return !!stmt.get(username);
  },

  /**
   * Check if email exists
   */
  emailExists(email) {
    const stmt = db.prepare(`
      SELECT 1 FROM users WHERE email = ? AND deleted_at IS NULL
    `);
    return !!stmt.get(email);
  },

  /**
   * Get public user data (without sensitive fields)
   */
  toPublic(user) {
    if (!user) return null;
    const { password, deleted_at, ...publicData } = user;
    return publicData;
  },
};
