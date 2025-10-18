const fastify = require('fastify')({
    logger: {
        level: 'info',
        serializers: {
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    hostname: request.hostname
                };
            }
        }
    }
});

// 3. Cookie 支持
fastify.register(require('@fastify/cookie'), {
    secret: 'my-secret-key', // 用于签名
    parseOptions: {}
});
fastify.get('/set-cookie', async (request, reply) => {
    reply
        .setCookie('sessionId', 'abc123', {
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 3600
        })
        .send({ message: 'Cookie set' });
});

fastify.get('/get-cookie', async (request, reply) => {
    const sessionId = request.cookies.sessionId;
    return { sessionId };
});

// 4. Session 管理
fastify.register(require('@fastify/session'), {
    secret: 'a-very-long-secret-string-change-this',
    cookie: {
        secure: false, // 生产环境设为 true (需要 HTTPS)
        maxAge: 1800000 // 30 分钟
    }
});
fastify.get('/login', async (request, reply) => {
    request.session.user = { id: 1, username: 'john' };
    return { message: 'Logged in' };
});

fastify.get('/profile', async (request, reply) => {
    const user = request.session.user;
    if (!user) {
        return reply.code(401).send({ error: 'Not logged in' });
    }
    return user;
});

fastify.get('/logout', async (request, reply) => {
    request.session.destroy();
    return { message: 'Logged out' };
});

fastify.listen({ port: 3000 });