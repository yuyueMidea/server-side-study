import { error } from '../utils/response.js';

/**
 * Authentication middleware - requires valid JWT
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      success: false,
      message: '请先登录',
      error: 'Unauthorized',
    });
  }
}

/**
 * Optional authentication - attaches user if token exists
 */
export async function optionalAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    // Token is invalid or missing, but we don't block the request
    request.user = null;
  }
}

/**
 * Check if user is the owner of a resource
 */
export function authorizeOwner(getResourceOwnerId) {
  return async (request, reply) => {
    const userId = request.user?.id;
    const resourceOwnerId = await getResourceOwnerId(request);

    if (!userId || userId !== resourceOwnerId) {
      reply.status(403).send({
        success: false,
        message: '没有权限执行此操作',
        error: 'Forbidden',
      });
    }
  };
}
