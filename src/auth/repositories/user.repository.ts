import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../../utils/entity.repository';
import { User, UserDocument } from '../entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserRepository extends EntityRepository<User> {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
    super(userModel);
  }
}
