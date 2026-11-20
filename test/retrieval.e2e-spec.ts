import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';

import { Project } from '../src/projects/entities/project.entity.js';
import {
  ProjectRevision,
  ProjectRevisionStatus,
} from '../src/codebase/entities/projectRevision.entity.js';
import { IndexedChunk } from '../src/indexing/entities/indexed-chunk.entity.js';
import { EmbeddingService } from '../src/indexing/services/embedding.service.js';
import { appInit } from './helpers/appInit.js';
import { createEntity } from './helpers/createEntities.js';

describe('Retrieval E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let projectId: string;
  let revisionId: string;
  let otherRevisionId: string;
  let emptyRevisionId: string;

  let projectModel: Model<Project>;
  let revisionModel: Model<ProjectRevision>;
  let indexedChunkModel: Model<IndexedChunk>;
  let embedSpy: jest.SpiedFunction<EmbeddingService['embed']>;

  const getSearchUrl = (targetRevisionId = revisionId) =>
    `/codebase/projects/${projectId}/revisions/${targetRevisionId}/retrieval/search`;

  beforeAll(async () => {
    const session = await appInit();
    app = session.app;
    ownerToken = session.accessToken;

    projectModel = app.get<Model<Project>>(getModelToken(Project.name));
    revisionModel = app.get<Model<ProjectRevision>>(
      getModelToken(ProjectRevision.name),
    );
    indexedChunkModel = app.get<Model<IndexedChunk>>(
      getModelToken(IndexedChunk.name),
    );

    const project = await createEntity(ownerToken, app, 'projects', [], {
      name: 'Retrieval E2E Project',
    });
    projectId = String(project._id);

    const revisions = await Promise.all(
      [1, 2, 3].map((versionNumber) =>
        revisionModel.create({
          project: new Types.ObjectId(projectId),
          versionNumber,
          originalFileName: `revision-${versionNumber}.zip`,
          archiveStorageKey: `retrieval-test/${versionNumber}.zip`,
          sourceStoragePrefix: `retrieval-test/${versionNumber}/files`,
          archiveHash: `retrieval-test-hash-${versionNumber}`,
          status: ProjectRevisionStatus.READY,
          fileCount: 1,
          totalSizeBytes: 100,
        }),
      ),
    );

    revisionId = revisions[0]._id.toString();
    otherRevisionId = revisions[1]._id.toString();
    emptyRevisionId = revisions[2]._id.toString();

    embedSpy = jest
      .spyOn(app.get(EmbeddingService), 'embed')
      .mockResolvedValue([1, 0]);

    await indexedChunkModel.create([
      {
        projectId: new Types.ObjectId(projectId),
        revisionId: revisions[0]._id,
        indexingRunId: new Types.ObjectId(),
        filePath: 'src/auth.ts',
        chunkIndex: 0,
        content:
          'Authentication verifies the user password and creates a token.',
        embedding: [1, 0],
      },
      {
        projectId: new Types.ObjectId(projectId),
        revisionId: revisions[0]._id,
        indexingRunId: new Types.ObjectId(),
        filePath: 'src/user.ts',
        chunkIndex: 1,
        content: 'The user service loads profile information.',
        embedding: [0.8, 0.6],
      },
      {
        projectId: new Types.ObjectId(projectId),
        revisionId: revisions[0]._id,
        indexingRunId: new Types.ObjectId(),
        filePath: 'src/unrelated.ts',
        chunkIndex: 0,
        content: 'This code performs an unrelated operation.',
        embedding: [0, 1],
      },
      {
        projectId: new Types.ObjectId(projectId),
        revisionId: revisions[1]._id,
        indexingRunId: new Types.ObjectId(),
        filePath: 'src/other-revision.ts',
        chunkIndex: 0,
        content: 'This chunk belongs to a different revision.',
        embedding: [1, 0],
      },
    ]);
  });

  afterAll(async () => {
    if (projectId) {
      const id = new Types.ObjectId(projectId);
      await indexedChunkModel.deleteMany({ projectId: id });
      await revisionModel.deleteMany({ project: id });
      await projectModel.deleteOne({ _id: id });
    }
    await app.close();
  });

  it('returns the closest chunks from only the requested revision', async () => {
    const response = await request(app.getHttpServer())
      .post(getSearchUrl())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: 'Where is authentication handled?', limit: 2 })
      .expect(200);

    expect(response.body).toMatchObject({
      projectId,
      revisionId,
      query: 'Where is authentication handled?',
      resultCount: 2,
    });
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results[0]).toMatchObject({
      filePath: 'src/auth.ts',
      content: 'Authentication verifies the user password and creates a token.',
      score: 1,
    });
    expect(response.body.results[1].filePath).toBe('src/user.ts');
    expect(
      response.body.results.some(
        (result: { filePath: string }) =>
          result.filePath === 'src/other-revision.ts',
      ),
    ).toBe(false);
    expect(embedSpy).toHaveBeenCalledWith(
      'Where is authentication handled?',
      'CODE_RETRIEVAL_QUERY',
    );
  });

  it('rejects a request without authentication', async () => {
    await request(app.getHttpServer())
      .post(getSearchUrl())
      .send({ query: 'Where is authentication handled?' })
      .expect(401);
  });

  it('validates the question and result limit', async () => {
    await request(app.getHttpServer())
      .post(getSearchUrl())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: '   ' })
      .expect(400);

    await request(app.getHttpServer())
      .post(getSearchUrl())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: 'Find authentication', limit: 21 })
      .expect(400);
  });

  it('returns a clear conflict when the revision has no indexed chunks', async () => {
    await request(app.getHttpServer())
      .post(getSearchUrl(emptyRevisionId))
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: 'Where is authentication handled?' })
      .expect(409);
  });

  it('does not allow a revision to be searched under the wrong project', async () => {
    const anotherProject = await createEntity(ownerToken, app, 'projects', [], {
      name: 'Different Retrieval Project',
    });

    await request(app.getHttpServer())
      .post(
        `/codebase/projects/${anotherProject._id}/revisions/${revisionId}/retrieval/search`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ query: 'Where is authentication handled?' })
      .expect(404);

    await projectModel.deleteOne({ _id: anotherProject._id });
  });
});
