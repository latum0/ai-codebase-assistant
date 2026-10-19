import { INestApplication, ValidationPipe } from '@nestjs/common';
import { appInit } from './helpers/appInit.js';
import request from 'supertest';
import { createEntity } from './helpers/createEntities.js';

describe('Codebase E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdProjectIds: string[] = [];
  let createdRevisionIds: string[] = [];
  let projectId: string;
  let revisionId: string;

  beforeAll(async () => {
    const session = await appInit();
    app = session.app;
    accessToken = session.accessToken;
    const project = await createEntity(
      accessToken,
      app,
      'projects',
      createdProjectIds,
    );

    const revision = await createEntity(
      accessToken,
      app,
      `projects/${projectId}/revisions`,
      createdRevisionIds,
    );
    revisionId = revision._id.toString();
    projectId = project._id.toString();
  });

  afterAll(async () => {
    createdProjectIds.map(async (id) => {
      await request(app.getHttpServer()).delete(
        `/projects/${projectId}/revisions/${revisionId}`,
      );
    });
    await app.close();
  });
});
