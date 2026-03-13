import { Module } from '@nestjs/common';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConstraintsModule } from '../constraints/constraints.module';

@Module({
  imports: [NotificationsModule, ConstraintsModule],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}
