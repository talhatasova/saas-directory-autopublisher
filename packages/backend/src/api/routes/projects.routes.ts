import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateProjectRequest, UpdateProjectRequest } from '@saas-autopublisher/shared';
import { projectService } from '../../services/project.service.js';
import { submissionService } from '../../services/submission.service.js';

export async function projectsRoutes(fastify: FastifyInstance) {
  // Create Project
  fastify.post('/api/v1/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id || '00000000-0000-0000-0000-000000000001';
    const body = request.body as CreateProjectRequest;
    const project = await projectService.createProject(userId, body);

    return reply.status(201).send({
      project,
    });
  });

  // List Projects
  fastify.get('/api/v1/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { userId?: string };
    const userId = query.userId || request.user?.id;
    const projects = await projectService.getProjects(userId);

    return reply.status(200).send({
      projects,
      total: projects.length,
    });
  });

  // Get Project By ID (with submissions)
  fastify.get(
    '/api/v1/projects/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const project = await projectService.getProject(id);

      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: `Project with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const submissions = await submissionService.getSubmissionsByProject(id);

      return reply.status(200).send({
        project,
        submissions,
      });
    }
  );

  // Update Project
  const updateHandler = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const body = request.body as UpdateProjectRequest;
    const project = await projectService.updateProject(id, body);

    if (!project) {
      return reply.status(404).send({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with ID "${id}" was not found`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return reply.status(200).send({
      project,
    });
  };

  fastify.put('/api/v1/projects/:id', updateHandler);
  fastify.patch('/api/v1/projects/:id', updateHandler);

  // Delete Project
  fastify.delete(
    '/api/v1/projects/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const deleted = await projectService.deleteProject(id);

      if (!deleted) {
        return reply.status(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: `Project with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return reply.status(200).send({
        success: true,
        message: `Project ${id} deleted successfully`,
      });
    }
  );

  // Get Submissions for Project
  fastify.get(
    '/api/v1/projects/:id/submissions',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const project = await projectService.getProject(id);

      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: `Project with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const submissions = await submissionService.getSubmissionsByProject(id);

      return reply.status(200).send({
        submissions,
        total: submissions.length,
      });
    }
  );

  // Launch Submissions for Project
  fastify.post(
    '/api/v1/projects/:id/launch',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const body = (request.body as { directoryIds?: string[] }) || {};
      const directoryIds = body.directoryIds || [];
      const userId = request.user?.id;

      const result = await submissionService.launchBatch(id, directoryIds, userId);

      return reply.status(200).send(result);
    }
  );
}
