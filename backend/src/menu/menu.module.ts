import {Module} from '@nestjs/common';
import {MenuController} from './menu.controller.js';

@Module({
  controllers: [MenuController],
})
export class MenuModule {}
