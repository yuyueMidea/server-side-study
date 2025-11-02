// server.cjs  或 server.js（保持 CommonJS）
const Fastify = require('fastify');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

// ① 模块级“全局” db
let db;

// ② User 模型（闭包里用 db）
const User = {
  async findAll() {
    return db.all('SELECT * FROM users ORDER BY id DESC');
  },
  async findById(id) {
    return db.get('SELECT * FROM users WHERE id = ?', id);
  },
  async create({ name, email, age }) {
    const ret = await db.run(
      'INSERT INTO users(name, email, age) VALUES (?,?,?)',
      name, email, age
    );
    return { id: ret.lastID };
  },
  async update(id, patch) {
    const fields = [];
    const args = [];
    if (typeof patch.name === 'string') { fields.push('name = ?'); args.push(patch.name); }
    if (typeof patch.email === 'string') { fields.push('email = ?'); args.push(patch.email); }
    if (Number.isInteger(patch.age)) { fields.push('age = ?'); args.push(patch.age); }
    if (!fields.length) return { changed: 0 };
    fields.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const ret = await db.run(sql, args);
    return { changed: ret.changes };
  },
  async remove(id) {
    const ret = await db.run('DELETE FROM users WHERE id = ?', id);
    return { changed: ret.changes };
  },
};

// ③ 封装 DB 初始化（只在启动时运行一次）
async function initDB() {
  db = await open({ filename: './users.db', driver: sqlite3.Database });
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

// ④ 路由注册单独写个函数（方便阅读）
function registerRoutes(app) {
  //注册cors插件
  app.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  })
  //静态文件服务
  app.register(require('@fastify/static'), {
    root: require('path').join(__dirname, 'public'),
    prefix: '/'
  })
  app.get('/health', async () => {
    const list = await User.findAll();
    return { success: true, data: 'health' };
  });
  app.get('/users', async () => {
    const list = await User.findAll();
    return { success: true, count: list.length, data: list };
  });

  app.get('/users/:id', async (req, reply) => {
    const row = await User.findById(Number(req.params.id));
    if (!row) return reply.code(404).send({ error: 'Not found' });
    return { success: true, data: row };
  });

  app.post('/users', async (req) => {
    const { name, email, age } = req.body;
    const { id } = await User.create({ name, email, age });
    return { success: true, id };
  });

  app.put('/users/:id', async (req, reply) => {
    const { changed } = await User.update(Number(req.params.id), req.body);
    if (!changed) return reply.code(404).send({ error: 'Not found or no change' });
    return { success: true };
  });

  app.delete('/users/:id', async (req, reply) => {
    const { changed } = await User.remove(Number(req.params.id));
    if (!changed) return reply.code(404).send({ error: 'Not found' });
    return { success: true };
  });
}

// ⑤ 主启动函数：把所有 await 放到这里
async function main() {
  await initDB();

  const app = Fastify({ logger: true });
  registerRoutes(app);

  const close = async () => { try { await db?.close(); } finally { process.exit(0); } };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  await app.listen({ port: 3000, host: '0.0.0.0' });
  app.log.info('http://localhost:3000');
}

// ⑥ 启动
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
