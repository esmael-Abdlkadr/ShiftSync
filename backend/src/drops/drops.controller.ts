import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DropsService } from './drops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateDropRequestDto } from './dto/create-drop-request.dto';
import { ReviewDropDto } from './dto/review-drop.dto';
import { QueryDropsDto } from './dto/query-drops.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('drops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DropsController {
  constructor(private readonly dropsService: DropsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryDropsDto) {
    return this.dropsService.findAll(user, query);
  }

  @Get('open')
  @Roles(UserRole.STAFF)
  findOpen(@CurrentUser() user: JwtPayload) {
    return this.dropsService.findOpenDrops(user);
  }

  @Post()
  @Roles(UserRole.STAFF)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDropRequestDto) {
    return this.dropsService.createDropRequest(user, dto);
  }

  @Patch(':id/claim')
  @Roles(UserRole.STAFF)
  claim(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dropsService.claimDrop(user, id);
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewDropDto,
  ) {
    return this.dropsService.managerReviewDrop(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dropsService.cancelDrop(user, id);
  }
}
