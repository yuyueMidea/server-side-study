import { authenticate } from '../middleware/auth.js';
import { register, login, getProfile } from '../controllers/auth.js';
import { getPosts, getPost, createPost, updatePost, deletePost } from '../controllers/post.js';
import { getCommentsByPost, createComment, deleteComment } from '../controllers/comment.js';

export async function registerRoutes(fastify) {
  // API prefix
  const API_PREFIX = '/api/v1';

  // ==================
  // Health Check
  // ==================
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // ==================
  // Auth Routes
  // ==================
  fastify.post(`${API_PREFIX}/auth/register`, register);
  fastify.post(`${API_PREFIX}/auth/login`, login);
  fastify.get(`${API_PREFIX}/profile`, {
    preHandler: [authenticate],
  }, getProfile);

  // ==================
  // Post Routes
  // ==================
  // Public routes
  fastify.get(`${API_PREFIX}/posts`, getPosts);
  fastify.get(`${API_PREFIX}/posts/:id`, getPost);

  // Protected routes
  fastify.post(`${API_PREFIX}/posts`, {
    preHandler: [authenticate],
  }, createPost);

  fastify.put(`${API_PREFIX}/posts/:id`, {
    preHandler: [authenticate],
  }, updatePost);

  fastify.delete(`${API_PREFIX}/posts/:id`, {
    preHandler: [authenticate],
  }, deletePost);

  // ==================
  // Comment Routes
  // ==================
  // Public routes
  fastify.get(`${API_PREFIX}/comments/post/:post_id`, getCommentsByPost);

  // Protected routes
  fastify.post(`${API_PREFIX}/posts/:post_id/comments`, {
    preHandler: [authenticate],
  }, createComment);

  fastify.delete(`${API_PREFIX}/comments/:id`, {
    preHandler: [authenticate],
  }, deleteComment);

  console.log('✓ Routes registered successfully');
}
