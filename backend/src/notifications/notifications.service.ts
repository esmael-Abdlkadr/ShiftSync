import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: object,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, data: data ?? undefined },
    });
  }

  async notifyMany(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    data?: object,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        data: data ?? undefined,
      })),
    });
  }
}
