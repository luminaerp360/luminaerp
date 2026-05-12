// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: true, // This allows all origins
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//     }),
//   );

//   await app.listen(3000);
// }
// bootstrap();

/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // Configure CORS
  const corsOptions: CorsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'organizationId'],
    exposedHeaders: ['Authorization'],
    credentials: true,
  };

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(corsOptions);
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable global validation with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // This enables automatic type transformation
      transformOptions: {
        enableImplicitConversion: true, // This allows string to number conversion
      },
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
