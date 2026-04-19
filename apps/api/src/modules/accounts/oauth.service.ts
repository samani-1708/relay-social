import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from './accounts.service';
import { OAuthStateService } from '../../common/services/oauth-state.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { Platform } from '@prisma/client';
import axios from 'axios';
import { OAuth2, generateCodeVerifier, generateCodeChallenge, Client as XClient } from '@xdevplatform/xdk';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly accounts: AccountsService,
    private readonly oauthState: OAuthStateService,
    private readonly encryption: EncryptionService,
  ) {}

  private get apiUrl() { return this.config.get('API_URL', 'http://localhost:4000'); }
  private get appUrl() { return this.config.get('APP_URL', 'http://localhost:3000'); }

  private successRedirect(platform: string) {
    return `${this.appUrl}/dashboard/accounts?connected=${platform.toLowerCase()}`;
  }
  private errorRedirect(platform: string, message: string) {
    return `${this.appUrl}/dashboard/accounts?error=${encodeURIComponent(message)}&platform=${platform.toLowerCase()}`;
  }

  // ─── BlueSky (App Password — no OAuth) ───────────────────────────────────────
  async connectBluesky(userId: string, handle: string, appPassword: string) {
    const res = await axios.post('https://bsky.social/xrpc/com.atproto.server.createSession', {
      identifier: handle,
      password: appPassword,
    });
    const { accessJwt, refreshJwt, did, handle: resolvedHandle } = res.data;
    return this.accounts.upsertAccount({
      userId,
      platform: Platform.BLUESKY,
      accessToken: accessJwt,
      refreshToken: refreshJwt,
      tokenExpiresAt: this.parseJwtExpiry(accessJwt),
      platformUserId: did,
      platformUsername: resolvedHandle,
      metadata: { encryptedAppPassword: this.encryption.encrypt(appPassword) },
    });
  }

  /** Decode a JWT payload and return the exp field as a Date. No signature verification needed — we trust our own tokens. */
  private parseJwtExpiry(jwt: string): Date | undefined {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      return payload.exp ? new Date(payload.exp * 1000) : undefined;
    } catch {
      return undefined;
    }
  }

  // ─── Mastodon ─────────────────────────────────────────────────────────────────
  async getMastodonAuthUrl(userId: string, instanceUrl: string) {
    const cleanInstance = instanceUrl.replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://');
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/mastodon/callback`;

    // Register app on this Mastodon instance
    let appData: { client_id: string; client_secret: string };
    try {
      const appRes = await axios.post(`${cleanInstance}/api/v1/apps`, {
        client_name: this.config.get('APP_NAME', 'relayman'),
        redirect_uris: redirectUri,
        scopes: 'read write',
        website: this.appUrl,
      });
      appData = { client_id: appRes.data.client_id, client_secret: appRes.data.client_secret };
    } catch (err) {
      throw new BadRequestException(`Could not register app on ${cleanInstance}: ${err.message}`);
    }

    // Store client_secret securely in state (NOT in URL)
    const stateToken = await this.oauthState.save(Platform.MASTODON, userId, {
      instanceUrl: cleanInstance,
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
    });

    const authUrl = `${cleanInstance}/oauth/authorize?` +
      `client_id=${appData.client_id}` +
      `&scope=read+write` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${stateToken}`;

    return { authUrl };
  }

  async handleMastodonCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('mastodon', 'OAuth state expired or invalid');

    const { userId, payload } = state;
    const { instanceUrl, clientId, clientSecret } = payload;
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/mastodon/callback`;

    try {
      const tokenRes = await axios.post(`${instanceUrl}/oauth/token`, {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
        scope: 'read write',
      });
      const { access_token } = tokenRes.data;

      const profileRes = await axios.get(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const profile = profileRes.data;

      await this.accounts.upsertAccount({
        userId,
        platform: Platform.MASTODON,
        accessToken: access_token,
        platformUserId: profile.id,
        platformUsername: `@${profile.username}@${new URL(instanceUrl).hostname}`,
        platformAvatar: profile.avatar,
        instanceUrl,
        // Store client credentials for future app-level operations
        metadata: { clientId },
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect('mastodon');
    } catch (err) {
      this.logger.error(`Mastodon callback error: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect('mastodon', 'Failed to connect Mastodon account');
    }
  }

  // ─── Twitter/X (OAuth 2.0 + PKCE via @xdevplatform/xdk) ─────────────────────
  private getTwitterOAuth(redirectUri: string) {
    return new OAuth2({
      clientId: this.config.get('TWITTER_CLIENT_ID'),
      clientSecret: this.config.get('TWITTER_CLIENT_SECRET'),
      redirectUri,
      // tweet.write requires Twitter Basic tier ($100/mo) — request only what's needed for account connection
      scope: ['tweet.read', 'users.read', 'offline.access'],
    });
  }

  async getTwitterAuthUrl(userId: string) {
    const clientId = this.config.get('TWITTER_CLIENT_ID');
    if (!clientId) throw new BadRequestException('Twitter API not configured — set TWITTER_CLIENT_ID');

    const redirectUri = this.config.get('TWITTER_CALLBACK_URL', `${this.apiUrl}/api/accounts/oauth/twitter/callback`);
    const oauth2 = this.getTwitterOAuth(redirectUri);

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    oauth2.setPkceParameters(codeVerifier, codeChallenge);

    const stateToken = await this.oauthState.save(Platform.TWITTER, userId, { codeVerifier });
    const authUrl = await oauth2.getAuthorizationUrl(stateToken);

    return { authUrl };
  }

  async handleTwitterCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('twitter', 'OAuth state expired or invalid');

    const { userId, payload } = state;
    const { codeVerifier } = payload;
    const redirectUri = this.config.get('TWITTER_CALLBACK_URL', `${this.apiUrl}/api/accounts/oauth/twitter/callback`);

    try {
      const oauth2 = this.getTwitterOAuth(redirectUri);
      const tokens = await oauth2.exchangeCode(code, codeVerifier);

      const client = new XClient({ accessToken: tokens.access_token });
      const { data: me } = await client.users.getMe();

      await this.accounts.upsertAccount({
        userId,
        platform: Platform.TWITTER,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
        platformUserId: me.id,
        platformUsername: `@${me.username}`,
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect('twitter');
    } catch (err) {
      this.logger.error(`Twitter callback error: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect('twitter', 'Failed to connect Twitter account');
    }
  }

  // ─── LinkedIn ────────────────────────────────────────────────────────────────
  async getLinkedInAuthUrl(userId: string) {
    const clientId = this.config.get('LINKEDIN_CLIENT_ID');
    if (!clientId) throw new BadRequestException('LinkedIn API not configured — set LINKEDIN_CLIENT_ID');

    const stateToken = await this.oauthState.save(Platform.LINKEDIN, userId, {});
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/linkedin/callback`;
    const scope = 'openid profile email w_member_social';

    return {
      authUrl: `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${stateToken}` +
        `&scope=${encodeURIComponent(scope)}`,
    };
  }

  async handleLinkedInCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('linkedin', 'OAuth state expired or invalid');

    const { userId } = state;
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/linkedin/callback`;

    try {
      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: this.config.get('LINKEDIN_CLIENT_ID'),
          client_secret: this.config.get('LINKEDIN_CLIENT_SECRET'),
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      );
      const { access_token, expires_in, refresh_token } = tokenRes.data;

      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { sub, name, picture } = profileRes.data;

      await this.accounts.upsertAccount({
        userId,
        platform: Platform.LINKEDIN,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        platformUserId: sub,
        platformUsername: name,
        platformAvatar: picture,
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect('linkedin');
    } catch (err: any) {
      const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
      this.logger.error(`LinkedIn callback error: ${detail} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect('linkedin', 'Failed to connect LinkedIn account');
    }
  }

  // ─── Meta (Facebook / Instagram / Threads) ───────────────────────────────────
  async getMetaAuthUrl(userId: string, targetPlatform: 'facebook' | 'instagram' | 'threads') {
    const appId = this.config.get('META_APP_ID');
    if (!appId) throw new BadRequestException('Meta API not configured — set META_APP_ID');

    const stateToken = await this.oauthState.save(targetPlatform as string, userId, { targetPlatform });
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/meta/callback`;

    const scopeMap: Record<string, string> = {
      facebook: 'pages_manage_posts,pages_read_engagement,pages_show_list',
      instagram: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      threads: 'threads_basic,threads_content_publish',
    };

    return {
      authUrl: `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopeMap[targetPlatform])}` +
        `&state=${stateToken}` +
        `&response_type=code`,
    };
  }

  async handleMetaCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('meta', 'OAuth state expired or invalid');

    const { userId, payload } = state;
    const { targetPlatform } = payload;
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/meta/callback`;

    try {
      // Exchange code for short-lived token
      const shortRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: this.config.get('META_APP_ID'),
          client_secret: this.config.get('META_APP_SECRET'),
          redirect_uri: redirectUri,
          code,
        },
      });

      // Exchange for long-lived token (60 days)
      const longRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.config.get('META_APP_ID'),
          client_secret: this.config.get('META_APP_SECRET'),
          fb_exchange_token: shortRes.data.access_token,
        },
      });
      const { access_token, expires_in } = longRes.data;

      const profileRes = await axios.get('https://graph.facebook.com/v19.0/me', {
        params: { access_token, fields: 'id,name,picture' },
      });
      const { id, name, picture } = profileRes.data;

      const platformMap: Record<string, Platform> = {
        facebook: Platform.FACEBOOK,
        instagram: Platform.INSTAGRAM,
        threads: Platform.THREADS,
      };

      await this.accounts.upsertAccount({
        userId,
        platform: platformMap[targetPlatform],
        accessToken: access_token,
        tokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        platformUserId: id,
        platformUsername: name,
        platformAvatar: picture?.data?.url,
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect(targetPlatform);
    } catch (err) {
      this.logger.error(`Meta callback error: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect(targetPlatform, `Failed to connect ${targetPlatform} account`);
    }
  }

  // ─── YouTube (Google OAuth 2.0) ──────────────────────────────────────────────
  async getYoutubeAuthUrl(userId: string) {
    const clientId = this.config.get('YOUTUBE_CLIENT_ID');
    if (!clientId) throw new BadRequestException('YouTube API not configured — set YOUTUBE_CLIENT_ID');

    const stateToken = await this.oauthState.save(Platform.YOUTUBE, userId, {});
    const redirectUri = this.config.get('YOUTUBE_CALLBACK_URL', `${this.apiUrl}/api/accounts/oauth/youtube/callback`);
    const scope = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${stateToken}` +
        `&access_type=offline` +
        `&prompt=consent`,
    };
  }

  async handleYoutubeCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('youtube', 'OAuth state expired or invalid');

    const { userId } = state;
    const redirectUri = this.config.get('YOUTUBE_CALLBACK_URL', `${this.apiUrl}/api/accounts/oauth/youtube/callback`);

    try {
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: this.config.get('YOUTUBE_CLIENT_ID'),
          client_secret: this.config.get('YOUTUBE_CLIENT_SECRET'),
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const { access_token, refresh_token, expires_in } = tokenRes.data;

      const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { sub, name, picture } = profileRes.data;

      await this.accounts.upsertAccount({
        userId,
        platform: Platform.YOUTUBE,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        platformUserId: sub,
        platformUsername: name,
        platformAvatar: picture,
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect('youtube');
    } catch (err) {
      this.logger.error(`YouTube callback error: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect('youtube', 'Failed to connect YouTube account');
    }
  }

  // ─── TikTok (OAuth 2.0) ───────────────────────────────────────────────────────
  async getTikTokAuthUrl(userId: string) {
    const clientKey = this.config.get('TIKTOK_CLIENT_KEY');
    if (!clientKey) throw new BadRequestException('TikTok API not configured — set TIKTOK_CLIENT_KEY');

    const stateToken = await this.oauthState.save(Platform.TIKTOK, userId, {});
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/tiktok/callback`;
    const scope = 'user.info.basic,video.upload,video.list';

    return {
      authUrl: `https://www.tiktok.com/v2/auth/authorize/?` +
        `client_key=${clientKey}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${stateToken}`,
    };
  }

  async handleTikTokCallback(code: string, stateToken: string): Promise<string> {
    const state = await this.oauthState.get(stateToken);
    if (!state) return this.errorRedirect('tiktok', 'OAuth state expired or invalid');

    const { userId } = state;
    const redirectUri = `${this.apiUrl}/api/accounts/oauth/tiktok/callback`;

    try {
      const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
        client_key: this.config.get('TIKTOK_CLIENT_KEY'),
        client_secret: this.config.get('TIKTOK_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

      const { access_token, refresh_token, expires_in, open_id } = tokenRes.data;

      const profileRes = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const { display_name, avatar_url } = profileRes.data.data?.user ?? {};

      await this.accounts.upsertAccount({
        userId,
        platform: Platform.TIKTOK,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        platformUserId: open_id,
        platformUsername: display_name ?? open_id,
        platformAvatar: avatar_url,
      });

      await this.oauthState.delete(stateToken);
      return this.successRedirect('tiktok');
    } catch (err) {
      this.logger.error(`TikTok callback error: ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message} | code: ${err?.code} | status: ${err?.response?.status}`);
      return this.errorRedirect('tiktok', 'Failed to connect TikTok account');
    }
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────────
  async refreshTwitterToken(account: any): Promise<boolean> {
    if (!account.refreshToken) return false;
    try {
      const res = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: account.refreshToken }),
        { auth: { username: this.config.get('TWITTER_CLIENT_ID'), password: this.config.get('TWITTER_CLIENT_SECRET') } },
      );
      const { access_token, refresh_token, expires_in } = res.data;
      await this.accounts.updateTokens(account.id, access_token, refresh_token, new Date(Date.now() + expires_in * 1000));
      return true;
    } catch {
      return false;
    }
  }

  async refreshLinkedInToken(account: any): Promise<boolean> {
    if (!account.refreshToken) return false;
    try {
      const res = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          client_id: this.config.get('LINKEDIN_CLIENT_ID'),
          client_secret: this.config.get('LINKEDIN_CLIENT_SECRET'),
        }),
      );
      await this.accounts.updateTokens(account.id, res.data.access_token, res.data.refresh_token, new Date(Date.now() + res.data.expires_in * 1000));
      return true;
    } catch {
      return false;
    }
  }

  async refreshBlueskyToken(account: any): Promise<boolean> {
    // Try refreshSession first (fast path — no credentials needed)
    if (account.refreshToken) {
      try {
        const res = await axios.post('https://bsky.social/xrpc/com.atproto.server.refreshSession', null, {
          headers: { Authorization: `Bearer ${account.refreshToken}` },
        });
        const tokenExpiresAt = this.parseJwtExpiry(res.data.accessJwt);
        await this.accounts.updateTokens(account.id, res.data.accessJwt, res.data.refreshJwt, tokenExpiresAt);
        return true;
      } catch {
        // Refresh token expired — fall through to app password re-auth below
      }
    }

    // Fall back: re-authenticate with stored app password
    const encryptedAppPassword = (account.metadata as any)?.encryptedAppPassword;
    if (!encryptedAppPassword) return false;

    try {
      const appPassword = this.encryption.decrypt(encryptedAppPassword);
      const res = await axios.post('https://bsky.social/xrpc/com.atproto.server.createSession', {
        identifier: account.platformUserId, // DID
        password: appPassword,
      });
      const tokenExpiresAt = this.parseJwtExpiry(res.data.accessJwt);
      await this.accounts.updateTokens(account.id, res.data.accessJwt, res.data.refreshJwt, tokenExpiresAt);
      this.logger.log(`Bluesky session auto-renewed for ${account.platformUsername} via app password`);
      return true;
    } catch {
      return false;
    }
  }

  async refreshYoutubeToken(account: any): Promise<boolean> {
    if (!account.refreshToken) return false;
    try {
      const res = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        client_id: this.config.get('YOUTUBE_CLIENT_ID'),
        client_secret: this.config.get('YOUTUBE_CLIENT_SECRET'),
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }));
      await this.accounts.updateTokens(account.id, res.data.access_token, account.refreshToken, new Date(Date.now() + res.data.expires_in * 1000));
      return true;
    } catch {
      return false;
    }
  }

  async refreshTikTokToken(account: any): Promise<boolean> {
    if (!account.refreshToken) return false;
    try {
      const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
        client_key: this.config.get('TIKTOK_CLIENT_KEY'),
        client_secret: this.config.get('TIKTOK_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      await this.accounts.updateTokens(account.id, res.data.access_token, res.data.refresh_token, new Date(Date.now() + res.data.expires_in * 1000));
      return true;
    } catch {
      return false;
    }
  }

  async refreshMetaToken(account: any): Promise<boolean> {
    try {
      const res = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.config.get('META_APP_ID'),
          client_secret: this.config.get('META_APP_SECRET'),
          fb_exchange_token: account.accessToken,
        },
      });
      await this.accounts.updateTokens(account.id, res.data.access_token, undefined, new Date(Date.now() + res.data.expires_in * 1000));
      return true;
    } catch {
      return false;
    }
  }
}
