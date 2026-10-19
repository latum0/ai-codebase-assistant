import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { login } from './login.js';

export const appInit = async (): Promise<{
  app: INestApplication;
  accessToken: string;
}> => {
  let app: INestApplication;
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
  const { accessToken } = await login(app);

  return { app, accessToken };
};
