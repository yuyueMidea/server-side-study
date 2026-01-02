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
