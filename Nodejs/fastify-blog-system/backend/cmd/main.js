import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { initializeDatabase } from '../config/database.js';
import { jwtConfig } from '../utils/jwt.js';
import { registerRoutes } from '../routes/routes.js';
import { requestLogger, errorHandler } from '../middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create Fastify instance
const fastify = Fastify({
  logger: false, // Using custom logger
});

// Register plugins
async function setupPlugins() {
  // CORS - Allow frontend to access backend
  await fastify.register(cors, {
    origin: [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Backend
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // JWT
  await fastify.register(jwt, jwtConfig);

  console.log('✓ Plugins registered successfully');
}

// Setup middleware
function setupMiddleware() {
  fastify.addHook('onRequest', requestLogger);
  fastify.setErrorHandler(errorHandler);
  console.log('✓ Middleware configured successfully');
}

// Start server
async function start() {
  try {
    console.log('\n🚀 Starting Fastify Blog API Server...\n');

    // Initialize database
    initializeDatabase();

    // Setup plugins
    await setupPlugins();

    // Setup middleware
    setupMiddleware();

    // Register routes
    await registerRoutes(fastify);

    // Start listening
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: PORT, host: HOST });

    console.log(`\n✅ Server is running!`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${HOST}:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health\n`);

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down server...');
  await fastify.close();
  console.log('✓ Server closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down server...');
  await fastify.close();
  console.log('✓ Server closed');
  process.exit(0);
});

// Start the server
start();
