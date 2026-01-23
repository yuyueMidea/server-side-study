import { CommentModel } from '../models/comment.js';
import { success } from '../utils/response.js';

/**
 * Get comments by post ID
 * GET /api/v1/comments/post/:post_id
 */
export async function getCommentsByPost(request, reply) {
  const { post_id } = request.params;
  const postId = parseInt(post_id, 10);

  // Check if post exists
  if (!CommentModel.postExists(postId)) {
    return reply.status(404).send({
      success: false,
      message: '文章不存在',
    });
  }

  const comments = CommentModel.findByPostId(postId);

  return reply.send(success(comments));
}

/**
 * Create a new comment
 * POST /api/v1/posts/:post_id/comments
 */
export async function createComment(request, reply) {
  const { post_id } = request.params;
  const { content } = request.body;
  const userId = request.user.id;

  const postId = parseInt(post_id, 10);

  // Check if post exists
  if (!CommentModel.postExists(postId)) {
    return reply.status(404).send({
      success: false,
      message: '文章不存在',
    });
  }

  // Validation
  if (!content || content.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      message: '请输入评论内容',
    });
  }

  if (content.length > 1000) {
    return reply.status(400).send({
      success: false,
      message: '评论内容不能超过1000个字符',
    });
  }

  const comment = CommentModel.create(content.trim(), userId, postId);

  return reply.status(201).send(success(comment, '评论发布成功'));
}

/**
 * Delete a comment
 * DELETE /api/v1/comments/:id
 */
export async function deleteComment(request, reply) {
  const { id } = request.params;
  const userId = request.user.id;

  const commentId = parseInt(id, 10);

  // Check if comment exists
  const existingComment = CommentModel.findById(commentId);
  if (!existingComment) {
    return reply.status(404).send({
      success: false,
      message: '评论不存在',
    });
  }

  // Check if user is the author
  if (!CommentModel.isAuthor(commentId, userId)) {
    return reply.status(403).send({
      success: false,
      message: '只能删除自己的评论',
    });
  }

  CommentModel.delete(commentId);

  return reply.send(success(null, '评论删除成功'));
}
