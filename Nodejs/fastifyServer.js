const fastify = require('fastify')({
    logger: true // 使用简单的日志输出
});

// 内存数据库 - 模拟用户表
let users = [
    { id: 1, name: '张三', age: 25, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, name: '李四', age: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
let nextId = 3;

// ==================== 路由定义 ====================

// 健康检查
fastify.get('/', async (request, reply) => {
    return {
        service: '用户管理服务',
        version: '1.0.0',
        status: '运行中',
        totalUsers: users.length
    };
});
// 2. 获取所有用户 - GET /users
fastify.get("/users", async(request, reply) =>{
    const { page = 1, pageSize = 10, name } = request.query;
    console.log("request: ", page, pageSize, name )
    return {
        status: '获取用户列表成功',
        data: users
    }
})

// 启动服务器
const start = async () => {
    try {
        await fastify.listen({
            port: 3000,
            host: '0.0.0.0'
        })
        console.log('🚀 用户管理服务已启动!');
        console.log('📍 服务地址: http://localhost:3000');
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

// 启动应用
start();