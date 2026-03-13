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
import { SwapsService } from './swaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { RespondSwapDto } from './dto/respond-swap.dto';
import { ReviewSwapDto } from './dto/review-swap.dto';
import { QuerySwapsDto } from './dto/query-swaps.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('swaps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QuerySwapsDto) {
    return this.swapsService.findAll(user, query);
  }

  @Post()
  @Roles(UserRole.STAFF)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSwapRequestDto) {
    return this.swapsService.createSwapRequest(user, dto);
  }

  @Patch(':id/respond')
  @Roles(UserRole.STAFF)
  respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondSwapDto,
  ) {
    return this.swapsService.respondToSwap(user, id, dto);
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewSwapDto,
  ) {
    return this.swapsService.managerReviewSwap(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.MANAGER)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.swapsService.cancelSwap(user, id);
  }
}
