import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';

import { ProjectRevision } from '../src/codebase/entities/projectRevision.entity.js';
import { appInit } from './helpers/appInit.js';
import { createEntity } from './helpers/createEntities.js';

describe('Indexing E2E', () => {
  let app: INestApplication;
  let ownerToken: string;

  let projectId: string;
  let revisionId: string;
  let runId: string;

  let revisionModel: Model<ProjectRevision>;

  const createdIds: string[] = [];

  const getBaseUrl = () =>
    `/codebase/projects/${projectId}/revisions/${revisionId}/indexing-runs`;

  beforeAll(async () => {
    const session = await appInit();

    app = session.app;
    ownerToken = session.accessToken;

    const project = await createEntity(
      ownerToken,
      app,
      'projects',
      createdIds,
      { name: 'Indexing E2E Project' },
    );

    projectId = String(project._id);

    // Retrieve the ProjectRevision model.
    revisionModel = app.get<Model<ProjectRevision>>(
      getModelToken(ProjectRevision.name),
    );

    // Create a READY revision for the project.
    const revision = await revisionModel.create({
      project: new Types.ObjectId(projectId),
      versionNumber: 1,
      originalFileName: 'sample-project.zip',
      archiveStorageKey: 'test/sample-project.zip',
      sourceStoragePrefix: 'test/source/',
      archiveHash: 'test-archive-hash',
      status: 'READY' as ProjectRevision['status'],
      fileCount: 1,
      totalSizeBytes: 100,
    });

    revisionId = revision._id.toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /indexing-runs', () => {
    it('should create an indexing run', async () => {
      const response = await request(app.getHttpServer())
        .post(getBaseUrl())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        revisionId,
        status: 'QUEUED',
        filesTotal: 0,
        filesProcessed: 0,
        filesFailed: 0,
        chunksCreated: 0,
      });

      expect(response.body._id).toBeDefined();

      runId = response.body._id;
    });

    it('should prevent another active indexing run', async () => {
      await request(app.getHttpServer())
        .post(getBaseUrl())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);
    });
  });

  describe('GET /indexing-runs', () => {
    it('should retrieve all indexing runs for a revision', async () => {
      const response = await request(app.getHttpServer())
        .get(getBaseUrl())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: runId,
            revisionId,
            status: 'QUEUED',
          }),
        ]),
      );
    });
  });

  describe('GET /indexing-runs/:runId', () => {
    it('should retrieve a specific indexing run', async () => {
      const response = await request(app.getHttpServer())
        .get(`${getBaseUrl()}/${runId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        _id: runId,
        revisionId,
        status: 'QUEUED',
      });
    });

    it('should return 404 when the indexing run does not exist', async () => {
      const nonExistingRunId = new Types.ObjectId().toString();

      await request(app.getHttpServer())
        .get(`${getBaseUrl()}/${nonExistingRunId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('should return 400 when the run ID is invalid', async () => {
      await request(app.getHttpServer())
        .get(`${getBaseUrl()}/invalid-id`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });
  });
});
