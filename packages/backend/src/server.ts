import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config/env.js';
import { optionalAuthMiddleware } from './api/middlewares/auth.middleware.js';
import { errorHandler } from './api/middlewares/error-handler.js';
import { healthRoutes } from './api/routes/health.routes.js';
import { extractRoutes } from './api/routes/extract.routes.js';
import { directoriesRoutes } from './api/routes/directories.routes.js';
import { projectsRoutes } from './api/routes/projects.routes.js';
import { submissionsRoutes } from './api/routes/submissions.routes.js';

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Project-Id'],
  });

  // Register WebSocket
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Middlewares & Hooks
  fastify.addHook('onRequest', optionalAuthMiddleware);
  fastify.setErrorHandler(errorHandler);

  // Register API Routes
  await fastify.register(healthRoutes);
  await fastify.register(extractRoutes);
  await fastify.register(directoriesRoutes);
  await fastify.register(projectsRoutes);
  await fastify.register(submissionsRoutes);

  return fastify;
}

export async function startServer(): Promise<FastifyInstance> {
  const server = await buildServer();
  try {
    await server.listen({
      port: config.port,
      host: config.host,
    });
    console.log(`[Backend API] Server listening at http://${config.host}:${config.port}`);
    return server;
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
