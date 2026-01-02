## Fastify Schema 定义详解与性能对比

无Schema版本
```
const fastify = require('fastify')();

fastify.get('/user/:id', async (request, reply) => {
  const { id } = request.params;
  const { page, limit } = request.query;
  
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    page,
    limit
  };
});
```

有Schema版本
```
const fastify = require('fastify')();

fastify.get('/user/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[0-9]+$' }
      },
      required: ['id']
    },
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          age: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    id: request.params.id,
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    page: request.query.page,
    limit: request.query.limit
  };
});
```

序列化性能提升2倍以上，原因：
- Fastify 使用 fast-json-stringify 库，基于 Schema 预编译序列化函数
- 避免运行时的类型检查和属性遍历
- 直接生成优化的字符串拼接代码

Fastify Schema 详细介绍

Schema 在 Fastify 中有三个主要作用：
- 输入验证（Validation）：验证请求参数、查询字符串、请求体
- 输出序列化（Serialization）：快速序列化响应数据
- 文档生成（Documentation）：自动生成 API 文档（配合 Swagger）


总结

Schema 定义的核心优势：
- 性能提升 2-15倍：特别是在序列化大型对象时
- 数据安全：自动验证和过滤输入
- 类型安全：在运行时保证数据类型正确
- 文档化：Schema 本身就是 API 文档
- 开发体验：IDE 可以基于 Schema 提供自动补全

建议：
- 生产环境的所有 API 都应该使用 Schema
- 优先定义 response Schema（性能提升最明显）
- 合理使用 $ref 避免重复定义
- 对于性能敏感的端点，Schema 是必须的
