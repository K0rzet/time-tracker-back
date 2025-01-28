import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete, 
  UseGuards, 
  Query
} from '@nestjs/common';
import { TimersService } from './timers.service';
import { CreateTimerDto, UpdateTimerDto } from './dto/timer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

import { JwtPayload } from 'jsonwebtoken';

@Controller('timers')
@UseGuards(JwtAuthGuard)
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Post()
  create(@User('id') userId: string, @Body() dto: CreateTimerDto) {
    return this.timersService.create(userId, dto);
  }

  @Get()
  findAll(@User('id') userId: string) {
    return this.timersService.findAll(userId);
  }


  @Get('statistics/:period')
  getStatistics(
    @User('id') userId: string,
    @Param('period') period: 'week' | 'month' | 'year' | 'all',
    @Query('paidFilter') paidFilter: 'all' | 'paid' | 'unpaid' = 'all',
  ) {
    return this.timersService.getStatistics(userId, period, paidFilter);
  }

  @Get(':id')
  findOne(@User('id') userId: string, @Param('id') timerId: string) {
    return this.timersService.findOne(userId, timerId);
  }

  @Post(':id/pause')
  pause(@User('id') userId: string, @Param('id') timerId: string) {
    return this.timersService.pause(userId, timerId);
  }

  @Post(':id/resume')
  resume(@User('id') userId: string, @Param('id') timerId: string) {
    return this.timersService.resume(userId, timerId);
  }

  @Post(':id/stop')
  stop(@User('id') userId: string, @Param('id') timerId: string) {
    return this.timersService.stop(userId, timerId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTimerDto: UpdateTimerDto,
    @User('id') userId: string,
  ) {
    return this.timersService.update(userId, id, updateTimerDto)
  }

  @Delete(':id')
  remove(@User('id') userId: string, @Param('id') timerId: string) {
    return this.timersService.delete(userId, timerId);
  }

  @Post('project/:projectId/mark-all-paid')
  async markAllTimersAsPaid(
    @User('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.timersService.markAllTimersAsPaid(userId, projectId);
  }
}
