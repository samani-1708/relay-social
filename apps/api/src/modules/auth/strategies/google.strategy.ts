import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') || 'placeholder',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') || 'placeholder',
      callbackURL: config.get('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const avatar = profile.photos?.[0]?.value;
    const googleId = profile.id;
    const user = await this.authService.findOrCreateGoogleUser({ email, name, avatar, googleId });
    done(null, user);
  }
}
