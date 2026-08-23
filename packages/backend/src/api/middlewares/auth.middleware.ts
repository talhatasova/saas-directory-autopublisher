import { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default mock user ID for unauthenticated dev/testing calls
    request.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'founder@example.com',
      role: 'authenticated',
    };
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  // Basic payload inspection for JWT structure if present
  try {
    const parts = token.split('.');
    if (parts.length === 3 && parts[1]) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      request.user = {
        id: payload.sub || '00000000-0000-0000-0000-000000000001',
        email: payload.email,
        role: payload.role || 'authenticated',
      };
      return;
    }
  } catch {
    // Ignore JWT decode error and fallback
  }

  request.user = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'founder@example.com',
    role: 'authenticated',
  };
}
