import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SkillsModule } from './skills/skills.module';
import { LocationsModule } from './locations/locations.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ConstraintsModule } from './constraints/constraints.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SwapsModule } from './swaps/swaps.module';
import { DropsModule } from './drops/drops.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EventsModule,
    AuthModule,
    UsersModule,
    SkillsModule,
    LocationsModule,
    ShiftsModule,
    ConstraintsModule,
    NotificationsModule,
    SwapsModule,
    DropsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
