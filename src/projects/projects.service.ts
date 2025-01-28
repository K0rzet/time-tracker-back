import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        timers: {
          select: {
            startTime: true,
            endTime: true,
            isPaused: true,
            totalPause: true,
            pausedAt: true,
            name: true,
            isPaid: true,
          },
        },
      },
    });

    return projects.map(project => {
      const totalTime = project.timers.reduce((acc, timer) => {
        if (!timer.endTime && !timer.isPaused) return acc;
        
        const startTime = new Date(timer.startTime).getTime();
        const endTime = timer.endTime 
          ? new Date(timer.endTime).getTime()
          : (timer.isPaused ? new Date(timer.pausedAt).getTime() : Date.now());
        
        return acc + Math.floor((endTime - startTime) / 1000) - (timer.totalPause || 0);
      }, 0);

      const hasTimers = project.timers.length > 0
      const isPaid = hasTimers && project.timers.every(timer => timer.isPaid)

      return {
        ...project,
        totalTime,
        isPaid,
      };
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async getProjectWithTimers(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        timers: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async delete(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }
}
