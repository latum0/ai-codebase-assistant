import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository';
import { User, UserDocument } from '../entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository extends EntityRepository<RefreshTokenDocument> {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {
    super(refreshTokenModel);
  }
}
