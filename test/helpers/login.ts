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

  const rawCookies = result.headers['set-cookie'];

  const cookies = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : [];

  const refreshCookie = cookies
    .find((cookie) => cookie.startsWith('refreshToken='))
    ?.split(';', 1)[0];

  if (!refreshCookie) {
    throw new Error('Refresh token cookie was not set during login');
  }

  return {
    accessToken: result.body.accessToken,
    refreshCookie,
  };
};
