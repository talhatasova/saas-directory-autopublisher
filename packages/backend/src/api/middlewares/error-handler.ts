import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiErrorResponse, ERROR_CODES } from '@saas-autopublisher/shared';

export function errorHandler(error: FastifyError | ZodError | Error, _request: FastifyRequest, reply: FastifyReply) {
  const timestamp = new Date().toISOString();

  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed for request parameters',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        })),
        timestamp,
      },
    };
    return reply.status(400).send(errorResponse);
  }

  // Handle Fastify schema validation errors
  if ('validation' in error && error.validation) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: error.message || 'Request validation failed',
        timestamp,
      },
    };
    return reply.status(400).send(errorResponse);
  }

  // Handle Scraper Timeout
  if (error.message.includes('Scraper timeout') || error.message.includes('timed out')) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: ERROR_CODES.SCRAPER_TIMEOUT,
        message: error.message,
        timestamp,
      },
    };
    return reply.status(504).send(errorResponse);
  }

  // Handle Not Found errors
  if (error.message.includes('not found') || error.message.includes('Not found')) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: error.message,
        timestamp,
      },
    };
    return reply.status(404).send(errorResponse);
  }

  // Generic Error
  const statusCode = (error as any).statusCode || 500;
  const errorResponse: ApiErrorResponse = {
    error: {
      code: statusCode === 400 ? ERROR_CODES.VALIDATION_FAILED : ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'Internal server error occurred',
      timestamp,
    },
  };

  return reply.status(statusCode).send(errorResponse);
}
