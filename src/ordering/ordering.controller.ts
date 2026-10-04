import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { OrderingService } from './ordering.service';
import { ReorderDto } from './reorder.dto';

@Controller('ordering')
@UseGuards(JwtAuthGuard)
export class OrderingController {
  constructor(private readonly ordering: OrderingService) {}

  @Put('projects')
  projects(@User('id') userId: string, @Body() dto: ReorderDto) {
    return this.ordering.reorder(userId, 'project', dto.ids);
  }

  @Put('categories')
  categories(@User('id') userId: string, @Body() dto: ReorderDto) {
    return this.ordering.reorder(userId, 'category', dto.ids);
  }

  @Put('timers/:projectId')
  timers(
    @User('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.ordering.reorder(userId, 'timer', dto.ids, projectId);
  }
}
