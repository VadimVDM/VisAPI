import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';

export class SignUpDto {
  email: string;
  password: string;
}

export class SignInDto {
  email: string;
  password: string;
}

export class MagicLinkDto {
  email: string;
}

export class ResetPasswordDto {
  email: string;
}

export class UpdatePasswordDto {
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto) {
    const { email, password } = signUpDto;
    
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const result = await this.authService.signUpWithEmail(email, password);
    
    return {
      message: 'Registration successful. Please check your email for confirmation.',
      user: result.user,
    };
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto) {
    const { email, password } = signInDto;
    
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const result = await this.authService.signInWithEmail(email, password);
    
    return {
      message: 'Login successful',
      user: result.user,
      session: result.session,
    };
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async sendMagicLink(@Body() magicLinkDto: MagicLinkDto) {
    const { email } = magicLinkDto;
    
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    await this.authService.signInWithMagicLink(email);
    
    return {
      message: 'Magic link sent to your email address',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { email } = resetPasswordDto;
    
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    await this.authService.resetPassword(email);
    
    return {
      message: 'Password reset email sent',
    };
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const { newPassword } = updatePasswordDto;
    
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    await this.authService.updatePassword(newPassword);
    
    return {
      message: 'Password updated successfully',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    const userRecord = req.userRecord;
    const userWithRoles = await this.authService.getUserWithRoles(userRecord.id);
    
    return {
      user: req.user,
      profile: userWithRoles,
    };
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async signOut() {
    await this.authService.signOut();
    
    return {
      message: 'Signed out successfully',
    };
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new BadRequestException('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { user, error } = await this.authService.verifyJWT(token);
    
    if (error || !user) {
      throw new BadRequestException('Invalid token');
    }

    return {
      valid: true,
      user,
    };
  }
}