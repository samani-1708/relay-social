import { Controller, Post, Get, Body, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

const COOKIE_NAME = 'relayman_token';

/** Seconds until the JWT session cookie expires — match the JWT expiry (default 7 days). */
const COOKIE_MAX_AGE_SECS = 7 * 24 * 60 * 60;

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',    // 'lax' allows top-level navigation redirects (Google OAuth)
    maxAge: COOKIE_MAX_AGE_SECS * 1000, // ms
    path: '/',
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    setAuthCookie(res, result.access_token);
    return result;
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    setAuthCookie(res, result.access_token);
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  /** Initiates Google OAuth — browser navigates here */
  @Get('google')
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  /** Google OAuth callback — issues JWT and redirects browser to FE */
  @Get('google/callback')
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Request() req, @Res() res: Response) {
    const { access_token } = this.authService.signToken(req.user.id, req.user.email);
    setAuthCookie(res, access_token);
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    return res.redirect(`${appUrl}/auth/callback?token=${access_token}`);
  }
}
