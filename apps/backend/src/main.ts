import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ZodValidationPipe());

  const isProd = process.env['NODE_ENV'] === 'production';
  const frontendUrl = process.env['FRONTEND_URL'];
  app.enableCors({
    origin: isProd
      ? (frontendUrl ?? 'http://localhost:3000')
      : (frontendUrl ?? /^http:\/\/localhost:\d+$/),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PLANIT API')
    .setDescription("API de la plateforme de gestion des emplois du temps de l'ISM Dakar")
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`[PLANIT] Backend running on http://localhost:${port}`);
  console.log(`[PLANIT] Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();
