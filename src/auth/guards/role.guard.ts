import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ROLE_KEY } from '../decorators/role.decorator.js';
import { UserRole } from '../entities/user.entity.js';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride(USER_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles) {
      return true;
    }
    if (!user) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }
    return requiredRoles.includes(user.role);
  }
}
