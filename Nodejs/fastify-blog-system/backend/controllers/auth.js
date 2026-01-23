import { UserModel } from '../models/user.js';
import { success } from '../utils/response.js';

/**
 * User registration
 * POST /api/v1/auth/register
 */
export async function register(request, reply) {
  const { username, email, password } = request.body;

  // Validation
  if (!username || username.length < 3 || username.length > 20) {
    return reply.status(400).send({
      success: false,
      message: '用户名长度需要在3-20个字符之间',
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply.status(400).send({
      success: false,
      message: '请输入有效的邮箱地址',
    });
  }

  if (!password || password.length < 6) {
    return reply.status(400).send({
      success: false,
      message: '密码长度至少需要6个字符',
    });
  }

  // Check if username exists
  if (UserModel.usernameExists(username)) {
    return reply.status(409).send({
      success: false,
      message: '用户名已被使用',
    });
  }

  // Check if email exists
  if (UserModel.emailExists(email)) {
    return reply.status(409).send({
      success: false,
      message: '邮箱已被注册',
    });
  }

  // Create user
  const user = UserModel.create(username, email, password);
  
  // Generate token
  const token = request.server.jwt.sign({
    id: user.id,
    username: user.username,
  });

  return reply.status(201).send(success({
    user: UserModel.toPublic(user),
    token,
  }, '注册成功'));
}

/**
 * User login
 * POST /api/v1/auth/login
 */
export async function login(request, reply) {
  const { username, password } = request.body;

  // Validation
  if (!username || !password) {
    return reply.status(400).send({
      success: false,
      message: '请输入用户名和密码',
    });
  }

  // Find user
  const user = UserModel.findByUsername(username);
  if (!user) {
    return reply.status(401).send({
      success: false,
      message: '用户名或密码错误',
    });
  }

  // Verify password
  if (!UserModel.verifyPassword(password, user.password)) {
    return reply.status(401).send({
      success: false,
      message: '用户名或密码错误',
    });
  }

  // Generate token
  const token = request.server.jwt.sign({
    id: user.id,
    username: user.username,
  });

  return reply.send(success({
    user: UserModel.toPublic(user),
    token,
  }, '登录成功'));
}

/**
 * Get current user profile
 * GET /api/v1/profile
 */
export async function getProfile(request, reply) {
  const userId = request.user.id;
  
  const user = UserModel.findById(userId);
  if (!user) {
    return reply.status(404).send({
      success: false,
      message: '用户不存在',
    });
  }

  return reply.send(success(UserModel.toPublic(user)));
}
