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

Schema 的优势
- 1、极致的性能优化: 响应序列化加速（2-3倍）
- 2、自动化验证：省去手动验证代码
- 3、类型安全（TypeScript 集成）
- 4、自动生成 API 文档

Schema 的作用
- 1、请求验证（Request Validation）：验证请求的各个部分
- 2、自定义验证规则
- 3、响应序列化（Response Serialization）

