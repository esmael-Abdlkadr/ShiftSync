import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { UserRole } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AssignSkillDto } from './dto/assign-skill.dto';
import { CertifyLocationDto } from './dto/certify-location.dto';
import {
  SetAvailabilityDto,
  CreateExceptionDto,
} from './dto/set-availability.dto';
import { ImportUsersDto } from './dto/import-users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryUsersDto) {
    return this.usersService.findAll(user.sub, user.role, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user.sub, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, user.sub, user.role, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  softDelete(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.usersService.softDelete(id, actor.sub);
  }

  @Get(':id/skills')
  getUserSkills(@Param('id') id: string) {
    return this.usersService.getUserSkills(id);
  }

  @Post(':id/skills')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignSkill(@Param('id') id: string, @Body() dto: AssignSkillDto) {
    return this.usersService.assignSkill(id, dto.skillId);
  }

  @Delete(':id/skills/:skillId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeSkill(@Param('id') id: string, @Param('skillId') skillId: string) {
    return this.usersService.removeSkill(id, skillId);
  }

  @Get(':id/certifications')
  getUserCertifications(
    @Param('id') id: string,
    @Query('includeDecertified') includeDecertified?: string,
  ) {
    return this.usersService.getUserCertifications(
      id,
      includeDecertified === 'true',
    );
  }

  @Post(':id/certifications')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  certifyLocation(@Param('id') id: string, @Body() dto: CertifyLocationDto) {
    return this.usersService.certifyLocation(id, dto.locationId);
  }

  @Delete(':id/certifications/:locationId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  decertifyLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    return this.usersService.decertifyLocation(id, locationId);
  }

  @Post(':id/certifications/:locationId/recertify')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  recertifyLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    return this.usersService.recertifyLocation(id, locationId);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string) {
    return this.usersService.getAvailability(id);
  }

  @Put(':id/availability')
  setAvailability(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.usersService.setAvailability(id, user.sub, user.role, dto);
  }

  @Get(':id/availability/exceptions')
  getAvailabilityExceptions(@Param('id') id: string) {
    return this.usersService.getAvailabilityExceptions(id);
  }

  @Post(':id/availability/exceptions')
  addAvailabilityException(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExceptionDto,
  ) {
    return this.usersService.addAvailabilityException(
      id,
      user.sub,
      user.role,
      dto,
    );
  }

  @Delete(':id/availability/exceptions/:exceptionId')
  removeAvailabilityException(
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.removeAvailabilityException(
      id,
      exceptionId,
      user.sub,
      user.role,
    );
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  importUsers(@Body() dto: ImportUsersDto) {
    return this.usersService.importUsers(dto.rows);
  }
}
