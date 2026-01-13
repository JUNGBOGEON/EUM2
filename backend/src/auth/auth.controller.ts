import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getAuthUser, getGoogleUser } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Res() res: Response) {
    // Guard가 Google OAuth 페이지로 리다이렉트
    console.log('DEBUG: googleAuth endpoint reached (Guard failed to redirect?)');

    // If we are here, the Guard failed to redirect.
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const callbackUrl = this.configService.get('GOOGLE_CALLBACK_URL');

    res.status(200).send(`
      <h1>Login Error</h1>
      <p>Google Auth Redirect Failed.</p>
      <p>Debug Info:</p>
      <ul>
        <li>Client ID Present: ${clientId ? 'Yes' : 'No'}</li>
        <li>Callback URL: ${callbackUrl}</li>
      </ul>
      <p>Check server logs.</p>
    `);
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { accessToken } = await this.authService.googleLogin(
      getGoogleUser(req),
    );

    // HttpOnly 쿠키에 JWT 설정
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    // 프론트엔드로 리다이렉트
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/workspaces`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return getAuthUser(req);
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logged out successfully' });
  }
}
