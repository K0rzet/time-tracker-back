import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { projects: true } } }
    })
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        userId
      }
    })
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId }
    })
    if (!category) throw new NotFoundException()
    
    return this.prisma.category.delete({
      where: { id }
    })
  }
}
