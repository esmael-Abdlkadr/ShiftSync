import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private simulateEmail(
    email: string,
    firstName: string,
    title: string,
    message: string,
  ): void {
    // Email simulation — logs as if sent via email provider
    this.logger.log(
      `[EMAIL SIMULATION] To: ${email} (${firstName}) | Subject: ${title} | Body: ${message}`,
    );
  }

  async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: object,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        notificationPreference: true,
      },
    });

    if (user?.notificationPreference === 'NONE') {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, data: data ?? undefined },
    });

    this.events.emitToUser(userId, 'notification:new', {
      id: notification.id,
      type,
      title,
      message,
      data,
      createdAt: notification.createdAt,
    });

    if (user?.notificationPreference === 'IN_APP_AND_EMAIL') {
      this.simulateEmail(user.email, user.firstName, title, message);
    }

    return notification;
  }

  async notifyMany(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    data?: object,
  ) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        notificationPreference: true,
      },
    });

    // Only deliver to users who haven't opted out
    const activeUsers = users.filter(
      (u) => u.notificationPreference !== 'NONE',
    );
    const activeIds = activeUsers.map((u) => u.id);

    if (activeIds.length === 0) return { count: 0 };

    const result = await this.prisma.notification.createMany({
      data: activeIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        data: data ?? undefined,
      })),
    });

    for (const userId of activeIds) {
      this.events.emitToUser(userId, 'notification:new', {
        type,
        title,
        message,
        data,
      });
    }

    for (const user of activeUsers) {
      if (user.notificationPreference === 'IN_APP_AND_EMAIL') {
        this.simulateEmail(user.email, user.firstName, title, message);
      }
    }

    return result;
  }
}
