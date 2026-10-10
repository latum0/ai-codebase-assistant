import { ConflictException, Injectable } from '@nestjs/common';
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

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
