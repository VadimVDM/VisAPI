import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';
import { ApiKeyRecord } from '@visapi/shared-types';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy as unknown as new (
    ...args: unknown[]
  ) => HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'X-API-Key', prefix: '' },
      async (
        apiKey: string,
        done: (err: Error | null, user?: ApiKeyRecord | false) => void,
      ) => {
        return this.validate(apiKey, done);
      },
    );
  }

  async validate(
    apiKey: string,
    done: (err: Error | null, user?: ApiKeyRecord | false) => void,
  ) {
    try {
      const user = await this.authService.validateApiKey(apiKey);
      if (!user) {
        return done(new UnauthorizedException('Invalid API key'), false);
      }
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  }
}
