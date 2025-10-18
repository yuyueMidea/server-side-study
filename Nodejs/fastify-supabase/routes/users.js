// routes/users.js
module.exports = async function usersRoutes(fastify) {
    const { db } = fastify;

    // 校验 schema（原生 JSON Schema）
    const userCore = {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1 },
            age: { type: 'integer', minimum: 0, nullable: true },
            email: { type: 'string', format: 'email' },
        },
        additionalProperties: false,
    };

    // Create
    fastify.post('/users', {
        schema: {
            body: { ...userCore, required: ['name', 'email'] },
            response: { 201: { type: 'object' } },
        },
    }, async (req, reply) => {
        const { name, age = null, email } = req.body;
        try {
            const { rows } = await db.query(
                `insert into users (name, age, email)
           values ($1, $2, $3)
           returning *`,
                [name, age, email],
            );
            reply.code(201).send(rows[0]);
        } catch (err) {
            // email 唯一约束等
            req.log.error(err);
            reply.code(400).send({ error: 'create_failed', detail: err.message });
        }
    });

    // List（可分页 + 搜索）
    fastify.get('/users', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                    q: { type: 'string', nullable: true }, // 按 name/email 模糊搜
                },
            },
        },
    }, async (req) => {
        const { limit = 50, offset = 0, q } = req.query;
        let sql = `select * from users`;
        const params = [];
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            params.push(`%${q.trim()}%`);
            sql += ` where name ilike $${params.length - 1} or email ilike $${params.length}`;
        }
        params.push(limit, offset);
        sql += ` order by created_at desc limit $${params.length - 1} offset $${params.length}`;

        const { rows } = await db.query(sql, params);
        return rows;
    });

    // Get by id
    fastify.get('/users/:id', {
        schema: {
            params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const { rows } = await db.query(`select * from users where id = $1`, [id]);
        if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
        return rows[0];
    });

    // Replace（PUT：全量）
    fastify.put('/users/:id', {
        schema: {
            params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
            body: { ...userCore, required: ['name', 'email'] },
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const { name, age = null, email } = req.body;
        try {
            const { rows } = await db.query(
                `update users
           set name = $1, age = $2, email = $3
           where id = $4
           returning *`,
                [name, age, email, id],
            );
            if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
            return rows[0];
        } catch (err) {
            req.log.error(err);
            reply.code(400).send({ error: 'update_failed', detail: err.message });
        }
    });

    // Partial update（PATCH：部分字段）
    fastify.patch('/users/:id', {
        schema: {
            params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
            body: {
                type: 'object',
                properties: userCore.properties,
                additionalProperties: false,
                minProperties: 1,
            },
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const entries = Object.entries(req.body);
        if (entries.length === 0) return reply.code(400).send({ error: 'empty_patch' });

        // 动态构造 SET 子句（参数化防注入）
        const sets = [];
        const params = [];
        entries.forEach(([key, value], i) => {
            sets.push(`${key} = $${i + 1}`);
            params.push(value);
        });
        params.push(id);
        const sql = `update users set ${sets.join(', ')} where id = $${params.length} returning *`;

        try {
            const { rows } = await db.query(sql, params);
            if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
            return rows[0];
        } catch (err) {
            req.log.error(err);
            reply.code(400).send({ error: 'patch_failed', detail: err.message });
        }
    });

    // Delete
    fastify.delete('/users/:id', {
        schema: {
            params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
        },
    }, async (req, reply) => {
        const { id } = req.params;
        const { rowCount } = await db.query(`delete from users where id = $1`, [id]);
        if (!rowCount) return reply.code(404).send({ error: 'not_found' });
        reply.code(204).send();
    });
};
