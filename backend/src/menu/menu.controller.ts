import {Controller, Get} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';

@Controller('menu-items')
export class MenuController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.menuItem.findMany({orderBy: {category: 'asc'}});
  }
}
