import { PostModel } from '../models/post.js';
import { success, successWithPagination, paginate } from '../utils/response.js';

/**
 * Get all posts with pagination
 * GET /api/v1/posts
 */
export async function getPosts(request, reply) {
  const { page = 1, limit = 10 } = request.query;
  
  const { posts, total } = PostModel.findAll(
    parseInt(page, 10),
    parseInt(limit, 10)
  );
  
  const pagination = paginate(page, limit, total);

  return reply.send(successWithPagination(posts, pagination));
}

/**
 * Get single post by ID
 * GET /api/v1/posts/:id
 */
export async function getPost(request, reply) {
  const { id } = request.params;
  
  const post = PostModel.findById(parseInt(id, 10));
  
  if (!post) {
    return reply.status(404).send({
      success: false,
      message: '文章不存在',
    });
  }

  return reply.send(success(post));
}

/**
 * Create a new post
 * POST /api/v1/posts
 */
export async function createPost(request, reply) {
  const { title, content } = request.body;
  const userId = request.user.id;

  // Validation
  if (!title || title.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      message: '请输入文章标题',
    });
  }

  if (!content || content.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      message: '请输入文章内容',
    });
  }

  if (title.length > 200) {
    return reply.status(400).send({
      success: false,
      message: '标题长度不能超过200个字符',
    });
  }

  const post = PostModel.create(title.trim(), content.trim(), userId);

  return reply.status(201).send(success(post, '文章发布成功'));
}

/**
 * Update a post
 * PUT /api/v1/posts/:id
 */
export async function updatePost(request, reply) {
  const { id } = request.params;
  const { title, content } = request.body;
  const userId = request.user.id;

  const postId = parseInt(id, 10);

  // Check if post exists
  const existingPost = PostModel.findById(postId);
  if (!existingPost) {
    return reply.status(404).send({
      success: false,
      message: '文章不存在',
    });
  }

  // Check if user is the author
  if (!PostModel.isAuthor(postId, userId)) {
    return reply.status(403).send({
      success: false,
      message: '只能编辑自己的文章',
    });
  }

  // Validation
  if (!title || title.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      message: '请输入文章标题',
    });
  }

  if (!content || content.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      message: '请输入文章内容',
    });
  }

  if (title.length > 200) {
    return reply.status(400).send({
      success: false,
      message: '标题长度不能超过200个字符',
    });
  }

  const post = PostModel.update(postId, title.trim(), content.trim());

  return reply.send(success(post, '文章更新成功'));
}

/**
 * Delete a post
 * DELETE /api/v1/posts/:id
 */
export async function deletePost(request, reply) {
  const { id } = request.params;
  const userId = request.user.id;

  const postId = parseInt(id, 10);

  // Check if post exists
  const existingPost = PostModel.findById(postId);
  if (!existingPost) {
    return reply.status(404).send({
      success: false,
      message: '文章不存在',
    });
  }

  // Check if user is the author
  if (!PostModel.isAuthor(postId, userId)) {
    return reply.status(403).send({
      success: false,
      message: '只能删除自己的文章',
    });
  }

  PostModel.delete(postId);

  return reply.send(success(null, '文章删除成功'));
}
