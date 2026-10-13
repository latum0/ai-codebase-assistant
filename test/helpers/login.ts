import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';

export const login = async (app: INestApplication): Promise<string> => {
  const result = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'mohamed@gmail.com',
    password: 'SecurePass123!',
  });

  if (!result) {
    throw new UnauthorizedException('There is no token');
  }

  return result.body.accessToken;
};
