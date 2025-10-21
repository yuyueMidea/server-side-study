Fastify 的 Schema 系统基于 JSON Schema 标准，是 Fastify 区别于其他 Node.js 框架的核心特性之一。
```
const fastify = require('fastify')();

// 基本 Schema 示例
fastify.post('/user', {
  schema: {
    // 请求体验证
    body: {
      type: 'object',
      required: ['username', 'email'],
      properties: {
        username: { type: 'string', minLength: 3 },
        email: { type: 'string', format: 'email' }
      }
    },
    // 响应序列化
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  // 请求已经通过验证
  return { id: 1, username: request.body.username };
});
```
