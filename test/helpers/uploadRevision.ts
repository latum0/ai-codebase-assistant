import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import AdmZip from 'adm-zip';

export const uploadRevision = async (
  token: string,
  app: INestApplication,
  projectId: string,
  createdRevisionIds: string[],
) => {
  const zip = new AdmZip();

  zip.addFile('README.md', Buffer.from('# E2E test project'));

  zip.addFile('src/index.ts', Buffer.from('console.log("Hello E2E");'));

  const response = await request(app.getHttpServer())
    .post(`/codebase/projects/${projectId}/revisions`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', zip.toBuffer(), {
      filename: 'test-project.zip',
      contentType: 'application/zip',
    })
    .expect(201);

  const revisionId = response.body._id.toString();

  createdRevisionIds.push(revisionId);

  return response.body;
};
