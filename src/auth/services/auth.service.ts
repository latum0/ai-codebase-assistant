import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import { UserRole, User } from '../entities/user.entity.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}
  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const passwordHash = await bcrypt.hash(createUserDto.password, 10);
      const user = await this.userRepository.create({
        passwordHash,
        ...createUserDto,
      });
      const email = user.email;
      const role = user.role;
      const displayName = user.displayName;
      const photo = user.photo ?? null;

      const { accessToken, refreshToken } = await this.generateTokens(
        user._id.toString(),
        email,
        role,
      );

      const payload: UserResponseDto = {
        email,
        displayName,
        photo,
        accessToken,
        refreshToken,
      };

      return payload;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('You already have an account.');
      }
      throw err;
    }
  }

  async login(loginDto: LoginDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne(
      { email: loginDto.email },
      { select: '+passwordHash' },
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.refreshTokenRepository.findOneAndDelete({ user: user._id });

    const email = user.email;
    const role = user.role;
    const displayName = user.displayName;
    const photo = user.photo ?? null;

    const { accessToken, refreshToken } = await this.generateTokens(
      user._id.toString(),
      email,
      role,
    );

    const payload: UserResponseDto = {
      email,
      displayName,
      photo,
      accessToken,
      refreshToken,
    };

    return payload;
  }

  private async generateTokens(
    id: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: id,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.refreshTokenRepository.create({
      user: new Types.ObjectId(id),
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    return { accessToken, refreshToken };
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: {
      sub: string;
      email: string;
      role: UserRole;
    };

    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      console.error('Refresh JWT verification failed:', error);
      throw new UnauthorizedException('Token invalid or expired.');
    }

    const storedToken = await this.refreshTokenRepository.findOneAndDelete({
      token: oldRefreshToken,
    });

    if (!storedToken) {
      console.error('Refresh token not found in database');
      throw new UnauthorizedException('Token invalid or expired.');
    }

    return this.generateTokens(payload.sub, payload.email, payload.role);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.refreshTokenRepository.deleteMany({
      token: refreshToken,
    });
  }

  async getProfile(id: Types.ObjectId): Promise<User> {
    const profile = await this.userRepository.findOne({ _id: id });
    if (!profile) {
      throw new BadRequestException('Profile not found.');
    }
    return profile;
  }
}
