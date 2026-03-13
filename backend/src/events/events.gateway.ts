import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { UserRole } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: (
      origin: string,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      cb(null, true);
    },
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  afterInit(server: Server): void {
    this.eventsService.setServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth as { token?: string }).token ??
      (client.handshake.headers.authorization ?? '').replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET')!;
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });

      (client.data as { userId: string }).userId = payload.sub;
      (client.data as { role: string }).role = payload.role;

      await client.join(`user:${payload.sub}`);

      if (payload.role === UserRole.ADMIN) {
        const locations = await this.prisma.location.findMany({
          select: { id: true },
        });
        for (const loc of locations) {
          await client.join(`location:${loc.id}`);
        }
      } else if (payload.role === UserRole.MANAGER) {
        const managed = await this.prisma.locationManager.findMany({
          where: { userId: payload.sub },
          select: { locationId: true },
        });
        for (const { locationId } of managed) {
          await client.join(`location:${locationId}`);
        }
      } else {
        const certs = await this.prisma.userLocationCertification.findMany({
          where: { userId: payload.sub, decertifiedAt: null },
          select: { locationId: true },
        });
        for (const { locationId } of certs) {
          await client.join(`location:${locationId}`);
        }
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    // rooms are automatically cleaned up by socket.io on disconnect
    void client;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async broadcastOnDuty(): Promise<void> {
    const now = new Date();
    const onDuty = await this.prisma.shiftAssignment.findMany({
      where: {
        shift: { startTime: { lte: now }, endTime: { gte: now } },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        shift: {
          include: {
            location: { select: { id: true, name: true, timezone: true } },
            requiredSkill: { select: { id: true, name: true } },
          },
        },
      },
    });

    const grouped: Record<string, unknown[]> = {};
    for (const a of onDuty) {
      const locId = a.shift.locationId;
      if (!grouped[locId]) grouped[locId] = [];
      grouped[locId].push({
        userId: a.user.id,
        name: `${a.user.firstName} ${a.user.lastName}`,
        location: a.shift.location,
        skill: a.shift.requiredSkill,
        shiftStart: a.shift.startTime,
        shiftEnd: a.shift.endTime,
      });
    }

    this.eventsService.emitToAll('duty:update', grouped);
  }
}
