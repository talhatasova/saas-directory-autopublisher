import { EventEmitter } from 'node:events';
import { FastifyReply } from 'fastify';
import type { WebSocket } from 'ws';
import { RealtimeEventPayload, SubmissionStatus } from '@saas-autopublisher/shared';

export interface SseClient {
  id: string;
  projectId?: string;
  reply: FastifyReply;
}

export interface WsClient {
  id: string;
  projectId?: string;
  socket: WebSocket;
}

export class RealtimeService extends EventEmitter {
  private sseClients: Map<string, SseClient> = new Map();
  private wsClients: Map<string, WsClient> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  // --- SSE Management ---

  public addSseClient(id: string, reply: FastifyReply, projectId?: string): void {
    this.sseClients.set(id, { id, projectId, reply });

    reply.raw.on('close', () => {
      this.sseClients.delete(id);
    });

    // Send initial connected event
    this.sendSseEvent(reply, {
      type: 'STATUS_SYNC',
      payload: {
        message: 'Real-time SSE stream connected',
        clientId: id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  public removeSseClient(id: string): void {
    this.sseClients.delete(id);
  }

  private sendSseEvent(reply: FastifyReply, data: Record<string, unknown>): void {
    try {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Connection may already be closed
    }
  }

  // --- WebSocket Management ---

  public addWsClient(id: string, socket: WebSocket, projectId?: string): void {
    this.wsClients.set(id, { id, projectId, socket });

    socket.on('close', () => {
      this.wsClients.delete(id);
    });

    socket.on('error', () => {
      this.wsClients.delete(id);
    });

    try {
      socket.send(
        JSON.stringify({
          type: 'STATUS_SYNC',
          payload: {
            message: 'Real-time WebSocket stream connected',
            clientId: id,
            timestamp: new Date().toISOString(),
          },
        })
      );
    } catch {
      // Ignore initial send failure
    }
  }

  public removeWsClient(id: string): void {
    this.wsClients.delete(id);
  }

  // --- Broadcasting ---

  public broadcast(event: RealtimeEventPayload, targetProjectId?: string): void {
    const rawData = JSON.stringify(event);

    // 1. Broadcast to SSE clients
    for (const [_, client] of this.sseClients) {
      if (!targetProjectId || !client.projectId || client.projectId === targetProjectId) {
        this.sendSseEvent(client.reply, event);
      }
    }

    // 2. Broadcast to WebSocket clients
    for (const [_, client] of this.wsClients) {
      if (!targetProjectId || !client.projectId || client.projectId === targetProjectId) {
        try {
          if (client.socket.readyState === 1) { // OPEN
            client.socket.send(rawData);
          }
        } catch {
          // Socket might be closing
        }
      }
    }

    // 3. Emit local Node.js event
    this.emit('realtime:event', event);
  }

  public emitStatusChange(
    submissionId: string,
    projectId: string,
    directoryId: string,
    status: SubmissionStatus,
    extra?: Record<string, unknown>
  ): void {
    this.broadcast(
      {
        type: 'STATUS_CHANGE',
        payload: {
          submissionId,
          projectId,
          directoryId,
          status,
          timestamp: new Date().toISOString(),
          ...extra,
        },
      },
      projectId
    );
  }

  public emitLog(
    submissionId: string,
    projectId: string,
    directoryId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.broadcast(
      {
        type: 'SUBMISSION_LOG',
        payload: {
          submissionId,
          projectId,
          directoryId,
          log: {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
          },
        },
      },
      projectId
    );
  }

  public emitIntervention(
    submissionId: string,
    projectId: string,
    directoryId: string,
    actionPayload: Record<string, unknown>
  ): void {
    this.broadcast(
      {
        type: 'INTERVENTION_REQUIRED',
        payload: {
          submissionId,
          projectId,
          directoryId,
          actionRequired: actionPayload,
          timestamp: new Date().toISOString(),
        },
      },
      projectId
    );
  }

  public get sseClientCount(): number {
    return this.sseClients.size;
  }

  public get wsClientCount(): number {
    return this.wsClients.size;
  }
}

export const realtimeService = new RealtimeService();
