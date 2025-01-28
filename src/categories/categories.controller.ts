import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { User } from 'src/auth/decorators/user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@User('id') userId: string) {
    return this.categoriesService.findAll(userId);
  }

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @User('id') userId: string) {
    return this.categoriesService.create(createCategoryDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User('id') userId: string) {
    return this.categoriesService.remove(id, userId);
  }
}
