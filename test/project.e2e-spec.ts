import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { login } from './helpers/login.js';
import { createProject } from './helpers/createEntities.js';

describe('Project E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    ownerToken = (await login(app)).accessToken;

    // second user, used to verify ownership isolation
    const other = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `project-e2e-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        displayName: 'Project E2E Other User',
      })
      .expect(201);
    otherToken = other.body.accessToken;
  });

  afterAll(async () => {
    // best-effort cleanup of everything the suite created
    await Promise.all(
      createdIds.map((id) =>
        request(app.getHttpServer())
          .delete(`/projects/${id}`)
          .set('Authorization', `Bearer ${ownerToken}`),
      ),
    );
    await app?.close();
  });

  describe('POST /projects', () => {
    it('Should create an upload project', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      expect(project._id).toBeDefined();
      expect(project.ownerId).toBeDefined();
      expect(project.name).toBe('E2E project');
      expect(project.sourceType).toBe('upload');
      expect(project.repositoryUrl).toBeUndefined();
      expect(project.createdAt).toBeDefined();
    });

    it('Should create a github project with a repository url', async () => {
      const project = await createProject(ownerToken, app, createdIds, {
        sourceType: 'github',
        repositoryUrl: 'https://github.com/user/repo',
      });

      expect(project.sourceType).toBe('github');
      expect(project.repositoryUrl).toBe('https://github.com/user/repo');
    });

    it('Should ignore the repository url of an upload project', async () => {
      const project = await createProject(ownerToken, app, createdIds, {
        sourceType: 'upload',
        repositoryUrl: 'https://github.com/user/repo',
      });

      expect(project.repositoryUrl).toBeUndefined();
    });

    it('Should reject a github project without a repository url', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'No url', sourceType: 'github' })
        .expect(400);
    });

    it('Should reject invalid data', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '', sourceType: 'invalid' })
        .expect(400);
    });

    it('Should reject fields that are not part of the DTO', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Sneaky',
          sourceType: 'upload',
          ownerId: '665f1c2e8a1b2c3d4e5f6a00',
        })
        .expect(400);
    });

    it('Should reject an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Anon', sourceType: 'upload' })
        .expect(401);
    });
  });

  describe('GET /projects', () => {
    it('Should list only the projects of the current user', async () => {
      const mine = await createProject(ownerToken, app, createdIds, {
        name: 'Owner list',
      });

      const ownerList = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(ownerList.body.map((p: { _id: string }) => p._id)).toContain(
        mine._id,
      );

      const otherList = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(otherList.body.map((p: { _id: string }) => p._id)).not.toContain(
        mine._id,
      );
    });

    it('Should reject an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('GET /projects/:id', () => {
    it('Should return a project of the current user', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      const response = await request(app.getHttpServer())
        .get(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body._id).toBe(project._id);
    });

    it('Should reject an invalid id', async () => {
      await request(app.getHttpServer())
        .get('/projects/not-an-object-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('Should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get('/projects/665f1c2e8a1b2c3d4e5f6a7b')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('Should return 404 for a project owned by someone else', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .get(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('Should update the provided fields only', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      const response = await request(app.getHttpServer())
        .patch(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Renamed project' })
        .expect(200);

      expect(response.body.name).toBe('Renamed project');
      expect(response.body.description).toBe(project.description);
    });

    it('Should clear the repository url when switching to upload', async () => {
      const project = await createProject(ownerToken, app, createdIds, {
        sourceType: 'github',
        repositoryUrl: 'https://github.com/user/repo',
      });

      const response = await request(app.getHttpServer())
        .patch(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sourceType: 'upload' })
        .expect(200);

      expect(response.body.sourceType).toBe('upload');
      expect(response.body.repositoryUrl).toBeUndefined();
    });

    it('Should reject switching to github without a repository url', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .patch(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sourceType: 'github' })
        .expect(400);
    });

    it('Should reject an attempt to change the owner', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .patch(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ownerId: '665f1c2e8a1b2c3d4e5f6a00' })
        .expect(400);
    });

    it('Should return 404 for a project owned by someone else', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .patch(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hijacked' })
        .expect(404);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('Should delete a project', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .delete(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('Should return 404 for a project owned by someone else', async () => {
      const project = await createProject(ownerToken, app, createdIds);

      await request(app.getHttpServer())
        .delete(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      // still there for its owner
      await request(app.getHttpServer())
        .get(`/projects/${project._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('Should reject an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .delete('/projects/665f1c2e8a1b2c3d4e5f6a7b')
        .expect(401);
    });
  });
});
