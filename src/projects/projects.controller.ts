import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@User('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(userId, dto);
  }

  @Get()
  findAll(
    @User('id') userId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.projectsService.findAll(userId, categoryId);
  }

  @Get(':id')
  findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.projectsService.findOne(userId, id);
  }

  @Get(':id/timers')
  getProjectTimers(@User('id') userId: string, @Param('id') projectId: string) {
    return this.projectsService.getProjectWithTimers(userId, projectId);
  }

  @Put(':id')
  update(
    @User('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(userId, projectId, dto);
  }

  @Delete(':id')
  remove(@User('id') userId: string, @Param('id') projectId: string) {
    return this.projectsService.delete(userId, projectId);
  }
}
