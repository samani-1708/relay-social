import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { OAuthService } from './oauth.service';

/**
 * Handles OAuth callbacks from social platforms.
 * These routes must NOT have JWT guards — they receive redirects from external services.
 * The userId is retrieved securely from the OAuthStateService using the opaque state token.
 */
@ApiExcludeController()
@Controller('accounts/oauth')
export class OAuthCallbackController {
  constructor(private readonly oauth: OAuthService) {}

  @Get('twitter/callback')
  async twitterCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleTwitterCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('mastodon/callback')
  async mastodonCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleMastodonCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('linkedin/callback')
  async linkedinCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleLinkedInCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('meta/callback')
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleMetaCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('youtube/callback')
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleYoutubeCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('tiktok/callback')
  async tiktokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.oauth.handleTikTokCallback(code, state);
    return res.redirect(redirectUrl);
  }
}
