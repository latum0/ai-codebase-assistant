import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { login } from './helpers/login';
import request from 'supertest';

describe('Auth E2E', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    token = await login(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('Should return profile of the user', async () => {
    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('Should return not authenticated', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });
});
