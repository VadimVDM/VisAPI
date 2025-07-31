import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '@visapi/core-supabase';

import { EmailOtpType } from '@supabase/supabase-js';

@Controller('v1/auth')
export class AuthConfirmController {
  private readonly logger = new Logger(AuthConfirmController.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Handle email confirmation/magic link verification
   * This endpoint receives the token hash from email links and exchanges it for a session
   */
  @Get('confirm')
  async confirmEmail(
    @Query('token_hash') tokenHash: string,
    @Query('type') type: EmailOtpType,
    @Query('redirect_to') redirectTo: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing auth confirmation: type=${type}, has_token=${!!tokenHash}`,
      );

      // Validate required parameters
      if (!tokenHash || !type) {
        throw new HttpException(
          'Missing required parameters: token_hash and type',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Default redirect URL
      const defaultRedirectUrl = 'https://app.visanet.app';
      const finalRedirectUrl = redirectTo || defaultRedirectUrl;

      // Exchange token for session using Supabase Auth API
      const { data, error } =
        await this.supabaseService.serviceClient.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

      if (error) {
        this.logger.error(`Token verification failed: ${error.message}`);

        // Redirect to error page with error message
        const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
        errorUrl.searchParams.append('error', error.message);
        res.redirect(errorUrl.toString());
        return;
      }

      if (!data.user || !data.session) {
        this.logger.error(
          'Token verification succeeded but no user/session returned',
        );

        // Redirect to error page
        const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
        errorUrl.searchParams.append('error', 'Invalid session data');
        res.redirect(errorUrl.toString());
        return;
      }

      this.logger.log(
        `Token verified successfully for user: ${data.user.email}`,
      );

      // Create callback URL with session tokens
      const callbackUrl = new URL(`${finalRedirectUrl}/auth/callback`);
      callbackUrl.searchParams.append(
        'access_token',
        data.session.access_token,
      );
      callbackUrl.searchParams.append(
        'refresh_token',
        data.session.refresh_token,
      );

      // Add type for the frontend to know what action was performed
      callbackUrl.searchParams.append('type', type);

      // Special handling for password reset
      if (type === 'recovery') {
        // Redirect to password reset page instead
        const resetUrl = new URL(`${finalRedirectUrl}/auth/reset-password`);
        resetUrl.searchParams.append('access_token', data.session.access_token);
        resetUrl.searchParams.append(
          'refresh_token',
          data.session.refresh_token,
        );
        res.redirect(resetUrl.toString());
        return;
      }

      // Redirect to callback URL
      res.redirect(callbackUrl.toString());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Auth confirmation failed: ${message}`, stack);

      if (error instanceof HttpException) {
        throw error;
      }

      // Generic error redirect
      const defaultRedirectUrl = 'https://app.visanet.app';
      const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
      errorUrl.searchParams.append('error', 'Authentication failed');
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * Health check for auth confirmation service
   */
  @Get('confirm/health')
  healthCheck(): Record<string, string> {
    return {
      status: 'healthy',
      service: 'auth-confirm',
      timestamp: new Date().toISOString(),
    };
  }
}
