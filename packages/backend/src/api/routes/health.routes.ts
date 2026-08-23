import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  const handler = async () => {
    return {
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  };

  fastify.get('/health', handler);
  fastify.get('/api/v1/health', handler);
}
