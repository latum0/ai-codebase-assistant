import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateAuthDto } from '../dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument, UserRole } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../dto/user-response.dto';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { Types } from 'mongoose';
import { LoginDto } from '../dto/login.dto';

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
    const token = await this.jwtService.verify(oldRefreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    const existingToken = await this.refreshTokenRepository.find({
      token: oldRefreshToken,
    });

    if (!existingToken) {
      throw new UnauthorizedException('Token invalid or expired.');
    }

    await this.refreshTokenRepository.deleteMany({ token });

    const { accessToken, refreshToken } = await this.generateTokens(
      token.sub,
      token.email,
      token.role,
    );

    return { accessToken, refreshToken };
  }
}
