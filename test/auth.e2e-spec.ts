import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { login } from './helpers/login.js';

describe('Auth E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const session = await login(app);
    accessToken = session.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /auth/register', () => {
    const user = {
      email: `auth-e2e-${Date.now()}@example.com`,
      password: 'SecurePass123!',
      displayName: 'E2E Test User',
    };

    it('Should register a user and set a refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      expect(response.body.email).toBe(user.email);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeUndefined();

      const rawCookies = response.headers['set-cookie'];

      const cookies = rawCookies
        ? Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies]
        : [];

      const cookie = cookies?.find((item) => item.startsWith('refreshToken='));

      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
    });

    it('Should reject duplicate email registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });

    it('Should reject invalid registration data', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('Should return the profile of the authenticated user', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('Should reject an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });
  });

  describe('POST /auth/login', () => {
    it('Should log in and set an HttpOnly refresh cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'mohamed@gmail.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeUndefined();

      const rawCookies = response.headers['set-cookie'];

      const cookies = rawCookies
        ? Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies]
        : [];

      const cookie = cookies?.find((item) => item.startsWith('refreshToken='));

      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
    });

    it('Should reject an incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'mohamed@gmail.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('Should reject an unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unknown-auth-e2e@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);
    });
  });
});
