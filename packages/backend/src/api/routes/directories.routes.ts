import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { GetDirectoriesQuery } from '@saas-autopublisher/shared';
import { directoryRegistry } from '../../registry/directory-registry.service.js';

export async function directoriesRoutes(fastify: FastifyInstance) {
  // List all directories with optional filters
  fastify.get('/api/v1/directories', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as GetDirectoriesQuery;
    const directories = directoryRegistry.getDirectories(query);

    return reply.status(200).send({
      directories,
      total: directories.length,
    });
  });

  // Get distinct categories
  fastify.get('/api/v1/directories/categories', async (_request: FastifyRequest, reply: FastifyReply) => {
    const categories = directoryRegistry.getCategories();
    return reply.status(200).send({
      categories,
    });
  });

  // Get single directory by ID
  fastify.get(
    '/api/v1/directories/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const directory = directoryRegistry.getDirectoryById(id);

      if (!directory) {
        return reply.status(404).send({
          error: {
            code: 'DIRECTORY_NOT_FOUND',
            message: `Directory with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return reply.status(200).send({
        directory,
      });
    }
  );
}
