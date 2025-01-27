import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimerDto, UpdateTimerDto } from './dto/timer.dto';
import { Timer } from '@prisma/client';

@Injectable()
export class TimersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTimerDto): Promise<Timer> {
    // Проверяем существование проекта
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.timer.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        startTime: new Date(),
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Timer[]> {
    return this.prisma.timer.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, timerId: string): Promise<Timer> {
    const timer = await this.prisma.timer.findFirst({
      where: { id: timerId, userId },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!timer) {
      throw new NotFoundException('Таймер не найден');
    }

    return timer;
  }

  async pause(userId: string, timerId: string): Promise<Timer> {
    const timer = await this.findOne(userId, timerId);

    if (timer.isPaused) {
      throw new Error('Таймер уже на паузе');
    }

    const pausedAt = new Date();
    return this.prisma.timer.update({
      where: { id: timerId },
      data: {
        isPaused: true,
        pausedAt,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async resume(userId: string, timerId: string): Promise<Timer> {
    const timer = await this.findOne(userId, timerId);

    if (!timer.isPaused) {
      throw new Error('Таймер не на паузе');
    }

    const pauseDuration = timer.pausedAt ? 
      Math.floor((new Date().getTime() - timer.pausedAt.getTime()) / 1000) : 0;

    return this.prisma.timer.update({
      where: { id: timerId },
      data: {
        isPaused: false,
        pausedAt: null,
        totalPause: timer.totalPause + pauseDuration,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async stop(userId: string, timerId: string): Promise<Timer> {
    const timer = await this.findOne(userId, timerId);
    
    if (timer.endTime) {
      throw new Error('Таймер уже остановлен');
    }

    let totalPause = timer.totalPause;
    if (timer.isPaused && timer.pausedAt) {
      totalPause += Math.floor((new Date().getTime() - timer.pausedAt.getTime()) / 1000);
    }

    return this.prisma.timer.update({
      where: { id: timerId },
      data: {
        endTime: new Date(),
        isPaused: false,
        pausedAt: null,
        totalPause,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async update(userId: string, timerId: string, dto: UpdateTimerDto): Promise<Timer> {
    await this.findOne(userId, timerId);

    return this.prisma.timer.update({
      where: { id: timerId },
      data: dto,
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async getStatistics(
    userId: string, 
    period: 'week' | 'month' | 'year' | 'all',
    paidFilter: 'all' | 'paid' | 'unpaid' = 'all'
  ) {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(0)
        break
    }

    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        timers: {
          some: {
            startTime: {
              gte: startDate,
            },
          },
        },
      },
      include: {
        timers: {
          where: {
            startTime: {
              gte: startDate,
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
    })

    let totalTime = 0
    let totalPaidTime = 0
    let totalUnpaidTime = 0

    const projectStats = projects.map(project => {
      let timers = project.timers.map(timer => {
        const time = this.calculateElapsedTime(timer)
        
        // Подсчитываем общее время
        totalTime += time
        if (timer.isPaid) {
          totalPaidTime += time
        } else {
          totalUnpaidTime += time
        }

        return {
          id: timer.id,
          name: timer.name,
          time,
          isPaid: timer.isPaid,
          startTime: timer.startTime,
          endTime: timer.endTime,
        }
      })

      // Фильтруем таймеры в зависимости от выбранного фильтра
      if (paidFilter !== 'all') {
        timers = timers.filter(timer => 
          paidFilter === 'paid' ? timer.isPaid : !timer.isPaid
        )
      }

      const projectTotalTime = timers.reduce((sum, timer) => sum + timer.time, 0)
      const isProjectPaid = project.timers.every(timer => timer.isPaid) // Общий статус проекта не зависит от фильтра

      return {
        id: project.id,
        name: project.name,
        totalTime: projectTotalTime,
        isPaid: isProjectPaid,
        timers,
      }
    })

    // Фильтруем проекты, у которых остались таймеры после фильтрации
    const filteredProjects = projectStats.filter(project => project.timers.length > 0)

    return {
      totalTime,
      totalPaidTime,
      totalUnpaidTime,
      projectStats: filteredProjects,
    }
  }

  private calculateElapsedTime(timer: any): number {
    const now = new Date()
    const start = new Date(timer.startTime)
    const end = timer.endTime ? new Date(timer.endTime) : now
    
    let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    // Вычитаем время на паузе
    totalSeconds -= timer.totalPause || 0
    
    // Если таймер сейчас на паузе, вычитаем текущий период паузы
    if (timer.isPaused && timer.pausedAt) {
      const pauseStart = new Date(timer.pausedAt)
      const currentPause = Math.floor((now.getTime() - pauseStart.getTime()) / 1000)
      totalSeconds -= currentPause
    }
    
    return Math.max(0, totalSeconds)
  }

  async delete(userId: string, timerId: string) {
    const timer = await this.prisma.timer.findFirst({
      where: {
        id: timerId,
        userId,
      },
    });

    if (!timer) {
      throw new NotFoundException('Timer not found');
    }

    return this.prisma.timer.delete({
      where: {
        id: timerId,
      },
    });
  }

  async markAllTimersAsPaid(userId: string, projectId: string) {
    // Проверяем существование проекта и права доступа
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    // Обновляем все таймеры проекта
    await this.prisma.timer.updateMany({
      where: {
        projectId,
        userId,
      },
      data: {
        isPaid: true,
      },
    });

    return { success: true };
  }
}
