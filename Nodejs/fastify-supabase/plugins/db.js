// plugins/db.js
const fp = require('fastify-plugin');
const { Pool } = require('pg');

module.exports = fp(async function dbPlugin(fastify) {
    const raw = process.env.SUPABASE_DB_URL;
    if (!raw) {
        throw new Error('Missing SUPABASE_DB_URL in .env');
    }

    // 用 URL 标准库自己解析（能提前发现异常 & 避免 pg-connection-string 的坑）
    let u;
    try {
        u = new URL(raw);
    } catch (e) {
        throw new Error('SUPABASE_DB_URL is not a valid URL: ' + e.message);
    }

    const host = u.hostname;
    const port = Number(u.port || 5432);
    const database = u.pathname.replace(/^\//, '');
    // 注意 decode（防止你已 URL 编码过的密码继续保持编码态）
    const user = decodeURIComponent(u.username || '');
    const password = decodeURIComponent(u.password || '');

    // 记录关键但不敏感的信息
    fastify.log.info({ host, port, database, sslmode: u.searchParams.get('sslmode') || 'require' }, 'Connecting to Supabase Postgres');

    const pool = new Pool({
        host,
        port,
        database,
        user,
        password,
        max: Number(process.env.PGPOOL_MAX || 10),
        idleTimeoutMillis: 30_000,
        // Supabase 通常需要 SSL；rejectUnauthorized:false 可避免本地无 CA 报错
        ssl: { rejectUnauthorized: false },
    });

    fastify.decorate('db', {
        query: (text, params) => pool.query(text, params),
        pool,
    });

    fastify.addHook('onClose', async () => pool.end());

    // —— 轻量迁移 ——（单独包 try/catch，出现 SQL 问题时能明确打印出来）
    try {
        await pool.query(`
      create extension if not exists "pgcrypto";

      create table if not exists users (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        age integer check (age >= 0),
        email text not null unique,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create or replace function set_updated_at() returns trigger as $$
      begin
        new.updated_at = now();
        return new;
      end;
      $$ language plpgsql;

      do $$
      begin
        if not exists (select 1 from pg_trigger where tgname = 'users_set_updated_at') then
          create trigger users_set_updated_at
          before update on users
          for each row execute procedure set_updated_at();
        end if;
      end $$;
    `);
    } catch (e) {
        fastify.log.error({ err: e }, 'Migration failed');
        throw e;
    }
}, { name: 'db', fastify: '5.x' });
