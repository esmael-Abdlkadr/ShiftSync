import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { QueryAuditDto } from './dto/query-audit.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: QueryAuditDto) {
    return this.audit.findAll(query);
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  async exportCsv(@Query() query: QueryAuditDto, @Res() res: Response) {
    const rows = await this.audit.exportAll(query);

    const headers = [
      'ID',
      'Date',
      'Actor',
      'Actor Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'Location',
    ];

    const escape = (v: string | number | boolean | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.createdAt.toISOString(),
          `${r.user.firstName} ${r.user.lastName}`,
          r.user.email,
          r.action,
          r.entityType,
          r.entityId,
          r.location?.name ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="audit-log.csv"',
    );
    res.send(lines.join('\n'));
  }

  @Get('shift/:shiftId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findByShift(@Param('shiftId') shiftId: string) {
    return this.audit.findByShift(shiftId);
  }
}
