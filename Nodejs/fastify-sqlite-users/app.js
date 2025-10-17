import Fastify from 'fastify';
import sensible from 'fastify-sensible';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const DB_FILE = path.resolve('data.db');
const app = Fastify({ logger: true });
await app.register(sensible);

import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS（如果用）
await app.register(cors, { origin: true });

// 静态托管（同源，无跨域）
await app.register(fastifyStatic, {
  root: path.join(__dirname),
  prefix: '/',
  index: ['index.html']
});


// ---- 加载 sql.js & 打开/创建数据库 ----
const SQL = await initSqlJs({
    // 可省略 locateFile；默认从 node_modules/sql.js/dist/ 加载 wasm
    // locateFile: file => path.join('node_modules/sql.js/dist', file),
});
let db;

if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buf);
    app.log.info('Loaded existing data.db');
} else {
    db = new SQL.Database();
    app.log.info('Created new in-memory DB');
}

// ---- 初始化表结构 ----
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  age INTEGER CHECK(age IS NULL OR (age >= 0 AND age <= 150)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
`);

// ---- 持久化函数：每次写入后保存到 data.db ----
function persist() {
    const data = db.export(); // Uint8Array
    fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// ---- 工具函数 ----
function all(sql, params = {}) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}
function get(sql, params = {}) {
    const rows = all(sql, params);
    return rows[0] || null;
}
function run(sql, params = {}) {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
}

// ---- Schema ----
const userBodySchema = {
    type: 'object',
    required: ['name', 'email'],
    additionalProperties: false,
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        age: { oneOf: [{ type: 'integer', minimum: 0, maximum: 150 }, { type: 'null' }] }
    }
};
const userPatchSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        age: { oneOf: [{ type: 'integer', minimum: 0, maximum: 150 }, { type: 'null' }] }
    },
    minProperties: 1
};

// ---- 路由（与原版保持一致） ----
app.get('/health', async () => ({ ok: true }));

app.post('/users', { schema: { body: userBodySchema } }, async (req, reply) => {
    const { name, email, age = null } = req.body;
    try {
        run(
            `INSERT INTO users (name, email, age) VALUES ($name, $email, $age)`,
            { $name: name.trim(), $email: String(email).toLowerCase(), $age: age ?? null }
        );
        // 取最后一条
        const row = get(`SELECT * FROM users ORDER BY id DESC LIMIT 1`);
        persist();
        reply.header('Location', `/users/${row.id}`).code(201).send(row);
    } catch (err) {
        const msg = String(err?.message || '');
        if (msg.includes('UNIQUE') && msg.includes('users.email')) {
            return reply.badRequest('Email already exists');
        }
        req.log.error(err);
        return reply.internalServerError('DB error');
    }
});

app.get('/users', {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                q: { type: 'string', default: '' },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                offset: { type: 'integer', minimum: 0, default: 0 },
                includeDeleted: { type: 'boolean', default: false }
            }
        }
    }
}, async (req) => {
    const { q = '', limit = 20, offset = 0, includeDeleted = false } = req.query;
    const where = [];
    if (!includeDeleted) where.push(`deleted_at IS NULL`);
    if (q) where.push(`(name LIKE $pat OR email LIKE $pat)`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pat = q ? `%${q}%` : undefined;

    const items = all(
        `SELECT * FROM users ${whereSql} ORDER BY id DESC LIMIT $limit OFFSET $offset`,
        { $pat: pat, $limit: limit, $offset: offset }
    );
    const totalRow = get(
        `SELECT COUNT(*) AS total FROM users ${whereSql}`,
        { $pat: pat }
    );
    return { total: totalRow.total, limit, offset, items };
});

app.get('/users/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
        querystring: { type: 'object', properties: { includeDeleted: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params;
    const { includeDeleted = false } = req.query;
    const row = get(
        `SELECT * FROM users WHERE id=$id ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
        { $id: id }
    );
    if (!row) return reply.notFound('User not found');
    return row;
});

app.put('/users/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
        body: userBodySchema
    }
}, async (req, reply) => {
    const { id } = req.params;
    const { name, email, age = null } = req.body;

    const exists = get(`SELECT id FROM users WHERE id=$id AND deleted_at IS NULL`, { $id: id });
    if (!exists) return reply.notFound('User not found or deleted');

    try {
        run(
            `UPDATE users
       SET name=$name, email=$email, age=$age, updated_at=datetime('now')
       WHERE id=$id AND deleted_at IS NULL`,
            { $id: id, $name: name.trim(), $email: String(email).toLowerCase(), $age: age ?? null }
        );
        persist();
        return get(`SELECT * FROM users WHERE id=$id`, { $id: id });
    } catch (err) {
        const msg = String(err?.message || '');
        if (msg.includes('UNIQUE') && msg.includes('users.email')) {
            return reply.badRequest('Email already exists');
        }
        req.log.error(err);
        return reply.internalServerError('DB error');
    }
});

app.patch('/users/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
        body: userPatchSchema
    }
}, async (req, reply) => {
    const { id } = req.params;
    const current = get(`SELECT * FROM users WHERE id=$id AND deleted_at IS NULL`, { $id: id });
    if (!current) return reply.notFound('User not found or deleted');

    const next = {
        name: req.body.name !== undefined ? String(req.body.name).trim() : current.name,
        email: req.body.email !== undefined ? String(req.body.email).toLowerCase() : current.email,
        age: req.body.age !== undefined ? (req.body.age ?? null) : current.age
    };

    try {
        run(
            `UPDATE users
       SET name=$name, email=$email, age=$age, updated_at=datetime('now')
       WHERE id=$id AND deleted_at IS NULL`,
            { $id: id, $name: next.name, $email: next.email, $age: next.age }
        );
        persist();
        return get(`SELECT * FROM users WHERE id=$id`, { $id: id });
    } catch (err) {
        const msg = String(err?.message || '');
        if (msg.includes('UNIQUE') && msg.includes('users.email')) {
            return reply.badRequest('Email already exists');
        }
        req.log.error(err);
        return reply.internalServerError('DB error');
    }
});

app.delete('/users/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
        querystring: { type: 'object', properties: { hard: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params;
    const { hard = false } = req.query;

    if (hard) {
        run(`DELETE FROM users WHERE id=$id`, { $id: id });
        persist();
        return reply.code(204).send();
    } else {
        const exists = get(`SELECT id FROM users WHERE id=$id AND deleted_at IS NULL`, { $id: id });
        if (!exists) return reply.notFound('User not found or already deleted');
        run(`UPDATE users SET deleted_at=datetime('now') WHERE id=$id AND deleted_at IS NULL`, { $id: id });
        persist();
        return reply.code(204).send();
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen({ port: PORT, host: HOST })
    .catch(err => {
        app.log.error(err);
        process.exit(1);
    });
