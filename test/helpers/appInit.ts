import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { login } from './login.js';
import cookieParser from 'cookie-parser';

export const appInit = async (): Promise<{
  app: INestApplication;
  accessToken: string;
}> => {
  let app: INestApplication;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use((req: any, _res: any, next: any) => {
    if (req.url === '/auth/refresh') {
      console.log('Incoming Cookie header:', req.headers.cookie);
      console.log('Parsed cookies:', req.cookies);
    }

    next();
  });

  await app.init();

  const { accessToken } = await login(app);

  return { app, accessToken };
};
