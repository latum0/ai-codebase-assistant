import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Types } from 'mongoose';

import { appInit } from './helpers/appInit.js';
import { createEntity } from './helpers/createEntities.js';
import { uploadRevision } from './helpers/uploadRevision.js';

describe('Codebase E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  let projectId: string;
  let revisionId: string;

  const createdProjectIds: string[] = [];
  const createdRevisionIds: string[] = [];

  let storageDir: string;
  const previousStorageDir = process.env.CODEBASE_STORAGE_DIR;

  const baseUrl = () => `/codebase/projects/${projectId}/revisions`;

  const authRequest = () => ({
    get: (path: string) =>
      request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${accessToken}`),

    post: (path: string) =>
      request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${accessToken}`),

    delete: (path: string) =>
      request(app.getHttpServer())
        .delete(path)
        .set('Authorization', `Bearer ${accessToken}`),
  });

  beforeAll(async () => {
    // Isolate files created by StorageService during this test run.
    storageDir = await mkdtemp(join(tmpdir(), 'codebase-e2e-storage-'));

    process.env.CODEBASE_STORAGE_DIR = storageDir;

    const session = await appInit();

    app = session.app;
    accessToken = session.accessToken;

    // Create the project first.
    const project = await createEntity(
      accessToken,
      app,
      'projects',
      createdProjectIds,
    );

    projectId = project._id.toString();

    // Upload an initial revision for GET/DELETE tests.
    const revision = await uploadRevision(
      accessToken,
      app,
      projectId,
      createdRevisionIds,
    );

    revisionId = revision._id.toString();
  });

  afterAll(async () => {
    try {
      if (!app) return;

      // Delete revisions before deleting their project.
      for (const id of createdRevisionIds) {
        await authRequest().delete(`${baseUrl()}/${id}`).expect(204);
      }

      for (const id of createdProjectIds) {
        await authRequest().delete(`/projects/${id}`).expect(204);
      }
    } finally {
      await app?.close();

      // Remove files even though removeRevision currently
      // does not delete its storage directory.
      if (storageDir) {
        await rm(storageDir, {
          recursive: true,
          force: true,
        });
      }

      if (previousStorageDir === undefined) {
        delete process.env.CODEBASE_STORAGE_DIR;
      } else {
        process.env.CODEBASE_STORAGE_DIR = previousStorageDir;
      }
    }
  });

  describe('POST /revisions', () => {
    it('should upload a ZIP and create a revision', async () => {
      const revision = await uploadRevision(
        accessToken,
        app,
        projectId,
        createdRevisionIds,
      );

      expect(revision).toMatchObject({
        status: 'UPLOADED',
        fileCount: 2,
        originalFileName: 'test-project.zip',
      });

      expect(revision._id).toBeDefined();
    });

    it('should reject an upload without a file', async () => {
      await authRequest().post(baseUrl()).expect(400);
    });

    it('should reject a file with an invalid extension', async () => {
      await authRequest()
        .post(baseUrl())
        .attach('file', Buffer.from('not a zip'), {
          filename: 'project.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should reject an invalid ZIP archive', async () => {
      await authRequest()
        .post(baseUrl())
        .attach('file', Buffer.from('invalid zip data'), {
          filename: 'invalid.zip',
          contentType: 'application/zip',
        })
        .expect(400);
    });
  });

  describe('GET /revisions', () => {
    it('should return project revisions', async () => {
      const response = await authRequest().get(baseUrl()).expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(
        response.body.some((revision: any) => revision._id === revisionId),
      ).toBe(true);
    });

    it('should reject an invalid project ID', async () => {
      await authRequest()
        .get('/codebase/projects/invalid-id/revisions')
        .expect(400);
    });

    it('should return 404 when the project does not exist', async () => {
      const unknownProjectId = new Types.ObjectId().toString();

      await authRequest()
        .get(`/codebase/projects/${unknownProjectId}/revisions`)
        .expect(404);
    });
  });

  describe('GET /revisions/:revisionId', () => {
    it('should return revision details', async () => {
      const response = await authRequest()
        .get(`${baseUrl()}/${revisionId}`)
        .expect(200);

      expect(response.body._id).toBe(revisionId);
      expect(response.body.status).toBe('UPLOADED');
    });

    it('should reject an invalid revision ID', async () => {
      await authRequest().get(`${baseUrl()}/invalid-id`).expect(400);
    });

    it('should return 404 when the revision does not exist', async () => {
      const unknownRevisionId = new Types.ObjectId().toString();

      await authRequest().get(`${baseUrl()}/${unknownRevisionId}`).expect(404);
    });
  });

  describe('GET /revisions/:revisionId/files', () => {
    it('should return files belonging to a revision', async () => {
      const response = await authRequest()
        .get(`${baseUrl()}/${revisionId}/files`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      const paths = response.body.map((file: any) => file.path);

      expect(paths).toContain('README.md');
      expect(paths).toContain('src/index.ts');
    });

    it('should return 404 when the revision does not exist', async () => {
      const unknownRevisionId = new Types.ObjectId().toString();

      await authRequest()
        .get(`${baseUrl()}/${unknownRevisionId}/files`)
        .expect(404);
    });
  });

  describe('GET revision file metadata', () => {
    it('should return metadata for a file', async () => {
      const filesResponse = await authRequest()
        .get(`${baseUrl()}/${revisionId}/files`)
        .expect(200);

      const file = filesResponse.body.find(
        (item: any) => item.path === 'src/index.ts',
      );

      expect(file).toBeDefined();

      const response = await authRequest()
        .get(`${baseUrl()}/${revisionId}/files/${file._id}`)
        .expect(200);

      expect(response.body._id).toBe(file._id);
      expect(response.body.path).toBe('src/index.ts');
    });

    it('should reject an invalid file ID', async () => {
      await authRequest()
        .get(`${baseUrl()}/${revisionId}/files/invalid-id`)
        .expect(400);
    });

    it('should return 404 when the file does not exist', async () => {
      const unknownFileId = new Types.ObjectId().toString();

      await authRequest()
        .get(`${baseUrl()}/${revisionId}/files/${unknownFileId}`)
        .expect(404);
    });
  });

  describe('DELETE /revisions/:revisionId', () => {
    it('should delete a revision and its file records', async () => {
      // Create a separate revision so the other tests
      // can continue using the initial revision.
      const revision = await uploadRevision(
        accessToken,
        app,
        projectId,
        createdRevisionIds,
      );

      const id = revision._id.toString();

      await authRequest().delete(`${baseUrl()}/${id}`).expect(204);

      // It has already been deleted, so don't delete it again
      // during afterAll cleanup.
      const index = createdRevisionIds.indexOf(id);

      if (index !== -1) {
        createdRevisionIds.splice(index, 1);
      }

      // The revision should no longer exist.
      await authRequest().get(`${baseUrl()}/${id}`).expect(404);
    });

    it('should reject an invalid revision ID', async () => {
      await authRequest().delete(`${baseUrl()}/invalid-id`).expect(400);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without an access token', async () => {
      await request(app.getHttpServer()).get(baseUrl()).expect(401);
    });

    it('should reject requests with an invalid access token', async () => {
      await request(app.getHttpServer())
        .get(baseUrl())
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
