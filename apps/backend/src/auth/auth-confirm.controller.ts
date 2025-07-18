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
    @Query('type') type: string,
    @Query('redirect_to') redirectTo: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Processing auth confirmation: type=${type}, has_token=${!!tokenHash}`);

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
      const { data, error } = await this.supabaseService.serviceClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any, // Type can be: email, recovery, invite, etc.
      });

      if (error) {
        this.logger.error(`Token verification failed: ${error.message}`);
        
        // Redirect to error page with error message
        const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
        errorUrl.searchParams.append('error', error.message);
        return res.redirect(errorUrl.toString());
      }

      if (!data.user || !data.session) {
        this.logger.error('Token verification succeeded but no user/session returned');
        
        // Redirect to error page
        const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
        errorUrl.searchParams.append('error', 'Invalid session data');
        return res.redirect(errorUrl.toString());
      }

      this.logger.log(`Token verified successfully for user: ${data.user.email}`);

      // Create callback URL with session tokens
      const callbackUrl = new URL(`${finalRedirectUrl}/auth/callback`);
      callbackUrl.searchParams.append('access_token', data.session.access_token);
      callbackUrl.searchParams.append('refresh_token', data.session.refresh_token);
      
      // Add type for the frontend to know what action was performed
      callbackUrl.searchParams.append('type', type);

      // Special handling for password reset
      if (type === 'recovery') {
        // Redirect to password reset page instead
        const resetUrl = new URL(`${finalRedirectUrl}/auth/reset-password`);
        resetUrl.searchParams.append('access_token', data.session.access_token);
        resetUrl.searchParams.append('refresh_token', data.session.refresh_token);
        return res.redirect(resetUrl.toString());
      }

      // Redirect to callback URL
      return res.redirect(callbackUrl.toString());

    } catch (error) {
      this.logger.error(`Auth confirmation failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      // Generic error redirect
      const defaultRedirectUrl = 'https://app.visanet.app';
      const errorUrl = new URL(`${defaultRedirectUrl}/auth/error`);
      errorUrl.searchParams.append('error', 'Authentication failed');
      return res.redirect(errorUrl.toString());
    }
  }

  /**
   * Health check for auth confirmation service
   */
  @Get('confirm/health')
  async healthCheck() {
    return {
      status: 'healthy',
      service: 'auth-confirm',
      timestamp: new Date().toISOString(),
    };
  }
}