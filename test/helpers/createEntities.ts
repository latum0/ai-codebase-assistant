import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const createEntity = async (
  token: string,
  app: INestApplication,
  path: string,
  createdIds: string[],
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(app.getHttpServer())
    .post(`/${path}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'E2E project',
      description: 'Created by the e2e suite',
      sourceType: 'upload',
      ...overrides,
    })
    .expect(201);

  createdIds.push(response.body._id);
  return response.body;
};
