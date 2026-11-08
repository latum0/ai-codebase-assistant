import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { login } from './login.js';
import cookieParser from 'cookie-parser';

export const appInit = async (): Promise<{
  app: INestApplication;
  accessToken: string;
  refreshCookie: string;
}> => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const { accessToken, refreshCookie } = await login(app);

  return { app, accessToken, refreshCookie };
};
