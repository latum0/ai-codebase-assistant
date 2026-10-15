import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface LoginResult {
  accessToken: string;
  refreshCookie: string;
}

export const login = async (app: INestApplication): Promise<LoginResult> => {
  const result = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: 'mohamed@gmail.com',
      password: 'SecurePass123!',
    })
    .expect(200);

  const cookies = result.headers['set-cookie'];

  const refreshCookie = (
    Array.isArray(cookies) ? cookies : cookies ? [cookies] : []
  ).find((cookie) => cookie.startsWith('refreshToken='));

  if (!result.body.accessToken || !refreshCookie) {
    throw new Error('Login did not return an access token and refresh cookie.');
  }

  return {
    accessToken: result.body.accessToken,
    refreshCookie: refreshCookie.split(';', 1)[0],
  };
};
