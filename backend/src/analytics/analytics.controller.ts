import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('hours')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getHours(@CurrentUser() user: JwtPayload, @Query() query: QueryAnalyticsDto) {
    return this.analyticsService.getHoursDistribution(user, query);
  }

  @Get('premium-fairness')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getPremiumFairness(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getPremiumFairness(user, query);
  }

  @Get('overtime-cost')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getOvertimeCost(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAnalyticsDto,
  ) {
    return this.analyticsService.getOvertimeCost(user, query);
  }
}
