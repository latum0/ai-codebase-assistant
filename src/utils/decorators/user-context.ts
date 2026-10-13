import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Types } from 'mongoose';

export const UserContext = createParamDecorator(
  (data: unknown, context: ExecutionContext): Types.ObjectId => {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.id;
    return new Types.ObjectId(userId);
  },
);
