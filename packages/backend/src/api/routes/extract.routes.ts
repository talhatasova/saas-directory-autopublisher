import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ExtractMetadataRequestSchema } from '@saas-autopublisher/shared';
import { scraperService } from '../../scraper/scraper.service.js';

export async function extractRoutes(fastify: FastifyInstance) {
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as Record<string, any> | undefined;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request body is required and must contain a valid URL',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Support direct HTML payload if provided (for testing or fast offline extract)
    if (body.html && typeof body.html === 'string') {
      const baseUrl = typeof body.url === 'string' && body.url ? body.url : 'https://example.com';
      const metadata = scraperService.extractFromHtml(body.html, baseUrl);
      return reply.status(200).send({
        success: true,
        data: metadata,
      });
    }

    // Standard URL extraction
    const validated = ExtractMetadataRequestSchema.parse(body);
    const metadata = await scraperService.extract(validated.url);

    return reply.status(200).send({
      success: true,
      data: metadata,
    });
  };

  fastify.post('/api/v1/extract', handler);
  fastify.post('/api/v1/scrape', handler);
}
