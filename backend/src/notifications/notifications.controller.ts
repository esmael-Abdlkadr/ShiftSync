import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number(limit ?? '50');
    const parsedOffset = Number(offset ?? '0');
    const take = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;
    const skip =
      Number.isFinite(parsedOffset) && parsedOffset > 0
        ? Math.floor(parsedOffset)
        : 0;

    return this.prisma.notification.findMany({
      where: {
        userId: user.sub,
        ...(unread === 'true' ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId: user.sub },
      data: { isRead: true },
    });
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    return this.prisma.notification.updateMany({
      where: { userId: user.sub, isRead: false },
      data: { isRead: true },
    });
  }
}
