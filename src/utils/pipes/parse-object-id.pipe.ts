import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<
  string,
  Types.ObjectId
> {
  transform(value: string): Types.ObjectId {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('Invalid id.');
    }
    return new Types.ObjectId(value);
  }
}
