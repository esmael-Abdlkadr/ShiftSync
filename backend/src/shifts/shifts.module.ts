import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ConstraintsModule } from '../constraints/constraints.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConstraintsModule, NotificationsModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
