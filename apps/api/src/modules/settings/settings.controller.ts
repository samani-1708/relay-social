import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getSettings(@Request() req) {
    return this.settings.getSettings(req.user.id);
  }

  @Patch()
  updateSettings(@Request() req, @Body() body: any) {
    return this.settings.updateSettings(req.user.id, body);
  }
}
