import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderingController],
  providers: [OrderingService],
})
export class OrderingModule {}
