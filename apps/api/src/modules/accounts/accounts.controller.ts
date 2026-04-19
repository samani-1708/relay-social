import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { OAuthService } from './oauth.service';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly oauth: OAuthService,
  ) {}

  @Get()
  getAccounts(@Request() req) {
    return this.accounts.getAccounts(req.user.id);
  }

  @Post('origin/:accountId')
  setOrigin(@Request() req, @Param('accountId') accountId: string) {
    return this.accounts.setOrigin(req.user.id, accountId);
  }

  @Post('targets')
  setTargets(@Request() req, @Body() body: { accountIds: string[] }) {
    return this.accounts.setTargets(req.user.id, body.accountIds);
  }

  @Delete(':accountId')
  disconnect(@Request() req, @Param('accountId') accountId: string) {
    return this.accounts.disconnect(req.user.id, accountId);
  }

  // ─── BlueSky (App Password — no OAuth redirect needed) ───────────────────────
  @Post('connect/bluesky')
  connectBluesky(@Request() req, @Body() body: { handle: string; appPassword: string }) {
    return this.oauth.connectBluesky(req.user.id, body.handle, body.appPassword);
  }

  // ─── OAuth start routes — return authUrl as JSON so frontend can navigate ────
  // (Frontend sends the JWT via axios, gets authUrl back, then does window.location.href)
  @Get('oauth/mastodon/start')
  startMastodon(@Request() req, @Query('instance') instance: string) {
    return this.oauth.getMastodonAuthUrl(req.user.id, instance);
  }

  @Get('oauth/twitter/start')
  startTwitter(@Request() req) {
    return this.oauth.getTwitterAuthUrl(req.user.id);
  }

  @Get('oauth/linkedin/start')
  startLinkedIn(@Request() req) {
    return this.oauth.getLinkedInAuthUrl(req.user.id);
  }

  @Get('oauth/meta/start')
  startMeta(
    @Request() req,
    @Query('platform') platform: 'facebook' | 'instagram' | 'threads',
  ) {
    return this.oauth.getMetaAuthUrl(req.user.id, platform);
  }

  @Get('oauth/youtube/start')
  startYouTube(@Request() req) {
    return this.oauth.getYoutubeAuthUrl(req.user.id);
  }

  @Get('oauth/tiktok/start')
  startTikTok(@Request() req) {
    return this.oauth.getTikTokAuthUrl(req.user.id);
  }
}
