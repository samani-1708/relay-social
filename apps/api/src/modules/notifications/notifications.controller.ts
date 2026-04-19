import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  getAll(@Request() req) {
    return this.notifications.getNotifications(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Request() req, @Param('id') id: string) {
    return this.notifications.markRead(req.user.id, id);
  }

  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.notifications.markAllRead(req.user.id);
  }
}
