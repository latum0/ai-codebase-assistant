import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
  OmitType,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import { Types } from 'mongoose';

import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
import { UserContext } from '../../utils/decorators/user-context';
import { JwtGuard } from '../guards/jwt.guard';

class AuthResponseDto extends OmitType(UserResponseDto, [
  'refreshToken',
] as const) {}

class RefreshResponseDto {
  @ApiProperty({
    description: 'New short-lived access token',
  })
  accessToken!: string;
}

class LogoutResponseDto {
  @ApiProperty({
    example: 'Logged out successfully.',
  })
  message!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  private clearRefreshCookie(response: Response): void {
    const { maxAge, ...options } = this.getRefreshCookieOptions();

    response.clearCookie('refreshToken', options);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully. Refresh token is set in an HttpOnly cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<UserResponseDto, 'refreshToken'>> {
    const { refreshToken, ...body } =
      await this.authService.register(createUserDto);

    response.cookie(
      'refreshToken',
      refreshToken,
      this.getRefreshCookieOptions(),
    );

    return body;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Refresh token is set in an HttpOnly cookie.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<UserResponseDto, 'refreshToken'>> {
    const { refreshToken, ...body } = await this.authService.login(loginDto);

    response.cookie(
      'refreshToken',
      refreshToken,
      this.getRefreshCookieOptions(),
    );

    return body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh the access token using the refresh cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed and refresh cookie rotated.',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, expired, or revoked refresh token',
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const oldRefreshToken = request.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const tokens = await this.authService.refreshToken(oldRefreshToken);

    response.cookie(
      'refreshToken',
      tokens.refreshToken,
      this.getRefreshCookieOptions(),
    );

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out the current session' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token revoked and cookie cleared.',
    type: LogoutResponseDto,
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = request.cookies?.refreshToken;

    await this.authService.logout(refreshToken);

    this.clearRefreshCookie(response);

    return {
      message: 'Logged out successfully.',
    };
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid access token',
  })
  async getProfile(@UserContext() userId: Types.ObjectId) {
    return this.authService.getProfile(userId);
  }
}
