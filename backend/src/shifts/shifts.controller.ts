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
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryShiftsDto) {
    return this.shiftsService.findAll(user, query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.shiftsService.remove(user, id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  publish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.shiftsService.publish(user, id);
  }

  @Post(':id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  unpublish(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.shiftsService.unpublish(user, id);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignStaff(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignStaffDto,
  ) {
    return this.shiftsService.assignStaff(user, id, dto);
  }

  @Delete(':id/assign/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id') shiftId: string,
    @Param('userId') userId: string,
  ) {
    return this.shiftsService.removeAssignment(user, shiftId, userId);
  }

  @Get(':id/eligible-staff')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getEligibleStaff(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.shiftsService.getEligibleStaff(user, id);
  }

  @Get('weekly-hours/:locationId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getWeeklyHours(
    @Param('locationId') locationId: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.shiftsService.getWeeklyHours(locationId, weekStart);
  }
}
