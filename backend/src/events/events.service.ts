import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitToLocation(locationId: string, event: string, data: unknown): void {
    this.server?.to(`location:${locationId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.server?.emit(event, data);
  }
}
