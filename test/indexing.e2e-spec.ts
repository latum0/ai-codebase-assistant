import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';

import {
  ProjectRevision,
  ProjectRevisionStatus,
} from '../src/codebase/entities/projectRevision.entity.js';
import { IndexingService } from '../src/indexing/services/indexing.service.js';
import { appInit } from './helpers/appInit.js';
import { createEntity } from './helpers/createEntities.js';

describe('Indexing E2E', () => {
  let app: INestApplication;
  let ownerToken: string;

  let projectId: string;
  let revisionId: string;
  let runId: string;

  let revisionModel: Model<ProjectRevision>;
  let processIndexingRunSpy: jest.SpyInstance;

  const createdIds: string[] = [];

  const getBaseUrl = (targetRevisionId = revisionId) =>
    `/codebase/projects/${projectId}/revisions/${targetRevisionId}/indexing-runs`;

  beforeAll(async () => {
    const session = await appInit();

    app = session.app;
    ownerToken = session.accessToken;

    // Keep the run QUEUED while testing the POST endpoint. Processing itself
    // is covered separately; otherwise a quick background run makes the
    // active-run conflict assertion timing-dependent.
    processIndexingRunSpy = jest
      .spyOn(app.get(IndexingService), 'processIndexingRun')
      .mockResolvedValue(undefined);

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

      expect(processIndexingRunSpy).toHaveBeenCalledTimes(1);
      const [startedRunId, startedProjectId, startedRevisionId, storagePrefix] =
        processIndexingRunSpy.mock.calls[0];
      expect(String(startedRunId)).toBe(runId);
      expect(String(startedProjectId)).toBe(projectId);
      expect(String(startedRevisionId)).toBe(revisionId);
      expect(storagePrefix).toBe('test/source/');
    });

    it('should prevent another active indexing run', async () => {
      await request(app.getHttpServer())
        .post(getBaseUrl())
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);
    });

    it('should allow indexing a successfully uploaded revision', async () => {
      const uploadedRevision = await revisionModel.create({
        project: new Types.ObjectId(projectId),
        versionNumber: 2,
        originalFileName: 'uploaded-project.zip',
        archiveStorageKey: 'test/uploaded-project.zip',
        sourceStoragePrefix: 'test/uploaded-source/',
        archiveHash: 'uploaded-archive-hash',
        status: ProjectRevisionStatus.UPLOADED,
        fileCount: 1,
        totalSizeBytes: 100,
      });

      const response = await request(app.getHttpServer())
        .post(getBaseUrl(uploadedRevision._id.toString()))
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        revisionId: uploadedRevision._id.toString(),
        status: 'QUEUED',
      });
    });

    it('should reject a revision while its upload is still processing', async () => {
      const processingRevision = await revisionModel.create({
        project: new Types.ObjectId(projectId),
        versionNumber: 3,
        originalFileName: 'processing-project.zip',
        archiveStorageKey: 'test/processing-project.zip',
        sourceStoragePrefix: 'test/processing-source/',
        archiveHash: 'processing-archive-hash',
        status: ProjectRevisionStatus.PROCESSING,
        fileCount: 1,
        totalSizeBytes: 100,
      });

      await request(app.getHttpServer())
        .post(getBaseUrl(processingRevision._id.toString()))
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);
    });

    it('should reject a revision without an extracted source directory', async () => {
      const revisionWithoutSource = await revisionModel.create({
        project: new Types.ObjectId(projectId),
        versionNumber: 4,
        originalFileName: 'missing-source-project.zip',
        archiveStorageKey: 'test/missing-source-project.zip',
        archiveHash: 'missing-source-archive-hash',
        status: ProjectRevisionStatus.READY,
        fileCount: 1,
        totalSizeBytes: 100,
      });

      await request(app.getHttpServer())
        .post(getBaseUrl(revisionWithoutSource._id.toString()))
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
