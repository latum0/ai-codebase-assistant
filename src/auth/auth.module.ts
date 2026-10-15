import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller.js';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './entities/refresh-token.entity.js';
import { User, UserSchema } from './entities/user.entity.js';
import { RefreshTokenRepository } from './repositories/refresh-token.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { AuthService } from './services/auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ global: true }),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, RefreshTokenRepository, JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
