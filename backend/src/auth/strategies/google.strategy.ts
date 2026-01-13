import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
    console.log('DEBUG: GoogleStrategy Initialized');
    console.log('DEBUG: ClientID:', configService.get<string>('GOOGLE_CLIENT_ID') ? 'Exists' : 'Missing');
    console.log('DEBUG: CallbackURL:', configService.get<string>('GOOGLE_CALLBACK_URL'));
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      name: displayName,
      picture: photos?.[0]?.value,
    };

    done(null, user);
  }
}
