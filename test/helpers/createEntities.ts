import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const createProject = async (
  token: string,
  app: INestApplication,
  createdIds: string[] | null,
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(app.getHttpServer())
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'E2E project',
      description: 'Created by the e2e suite',
      sourceType: 'upload',
      ...overrides,
    })
    .expect(201);

  (createdIds as string[]).push(response.body._id);
  return response.body;
};
