import { Module } from '@nestjs/common';
import { DropsController } from './drops.controller';
import { DropsService } from './drops.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConstraintsModule } from '../constraints/constraints.module';

@Module({
  imports: [NotificationsModule, ConstraintsModule],
  controllers: [DropsController],
  providers: [DropsService],
  exports: [DropsService],
})
export class DropsModule {}
