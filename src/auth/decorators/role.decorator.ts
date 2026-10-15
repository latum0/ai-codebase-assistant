import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity.js';

export const USER_ROLE_KEY = 'user_role';
export const roleKey = (...roles: UserRole[]) =>
  SetMetadata(USER_ROLE_KEY, roles);
