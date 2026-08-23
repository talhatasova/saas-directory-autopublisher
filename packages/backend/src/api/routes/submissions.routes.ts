import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import {
  GetSubmissionsQuery,
  LaunchSubmissionsRequest,
  ResolveActionRequest,
} from '@saas-autopublisher/shared';
import { submissionService } from '../../services/submission.service.js';
import { realtimeService } from '../../services/realtime.service.js';

export async function submissionsRoutes(fastify: FastifyInstance) {
  // Batch launch submissions
  fastify.post('/api/v1/submissions/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as LaunchSubmissionsRequest;
    const userId = request.user?.id;

    if (!body || !body.projectId || !Array.isArray(body.directoryIds)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'projectId and directoryIds array are required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await submissionService.launchBatch(body.projectId, body.directoryIds, userId);
    return reply.status(200).send(result);
  });

  // List Submissions with filters
  fastify.get('/api/v1/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as GetSubmissionsQuery;
    const result = await submissionService.getSubmissions(query);

    return reply.status(200).send(result);
  });

  // Get Single Submission
  fastify.get(
    '/api/v1/submissions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const submission = await submissionService.getSubmissionById(id);

      if (!submission) {
        return reply.status(404).send({
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: `Submission with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return reply.status(200).send({
        submission,
      });
    }
  );

  // Retry Failed Submission
  fastify.post(
    '/api/v1/submissions/:id/retry',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const submission = await submissionService.retrySubmission(id);

      if (!submission) {
        return reply.status(404).send({
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: `Submission with ID "${id}" was not found`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return reply.status(200).send({
        success: true,
        submission,
      });
    }
  );

  // Resolve Action Required (Intervention)
  const resolveHandler = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const body = request.body as ResolveActionRequest;
    const result = await submissionService.resolveAction(id, body);

    return reply.status(200).send(result);
  };

  fastify.post('/api/v1/submissions/:id/resolve', resolveHandler);
  fastify.post('/api/v1/submissions/:id/intervention', resolveHandler);

  // Real-time SSE Stream for Submissions
  const sseHandler = async (
    request: FastifyRequest<{ Params?: { projectId?: string }; Querystring?: { projectId?: string } }>,
    reply: FastifyReply
  ) => {
    const projectId = request.params?.projectId || request.query?.projectId;
    const clientId = randomUUID();

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    realtimeService.addSseClient(clientId, reply, projectId);
  };

  fastify.get('/api/v1/submissions/stream', sseHandler);
  fastify.get('/api/v1/events/:projectId', sseHandler);

  // Real-time WebSocket Route
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const query = req.query as { projectId?: string };
    const clientId = randomUUID();
    realtimeService.addWsClient(clientId, socket, query?.projectId);
  });

  fastify.get('/api/v1/submissions/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const query = req.query as { projectId?: string };
    const clientId = randomUUID();
    realtimeService.addWsClient(clientId, socket, query?.projectId);
  });
}
