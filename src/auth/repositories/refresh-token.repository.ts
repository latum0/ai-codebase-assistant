import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityRepository } from '../../utils/entity.repository.js';
import {
  RefreshTokenDocument,
  RefreshToken,
} from '../entities/refresh-token.entity.js';

@Injectable()
export class RefreshTokenRepository extends EntityRepository<RefreshTokenDocument> {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {
    super(refreshTokenModel);
  }
}
