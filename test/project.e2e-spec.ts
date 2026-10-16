import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { login } from './helpers/login.js';

describe('Project E2E', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;
  const createdIds: string[] = [];

  const createProject = async (
    token: string,
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

    createdIds.push(response.body._id);
    return response.body;
  };

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
      const project = await createProject(ownerToken);

      expect(project._id).toBeDefined();
      expect(project.ownerId).toBeDefined();
      expect(project.name).toBe('E2E project');
      expect(project.sourceType).toBe('upload');
      expect(project.repositoryUrl).toBeUndefined();
      expect(project.createdAt).toBeDefined();
    });

    it('Should create a github project with a repository url', async () => {
      const project = await createProject(ownerToken, {
        sourceType: 'github',
        repositoryUrl: 'https://github.com/user/repo',
      });

      expect(project.sourceType).toBe('github');
      expect(project.repositoryUrl).toBe('https://github.com/user/repo');
    });

    it('Should ignore the repository url of an upload project', async () => {
      const project = await createProject(ownerToken, {
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
});
