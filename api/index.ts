import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.setGlobalPrefix('api/v1');
    app.use(helmet());
    const corsOrigin =
      process.env.CORS_ORIGIN ||
      'http://localhost:5173,https://influence-academy-frontend.vercel.app';
    app.enableCors({
      origin: corsOrigin.includes(',')
        ? corsOrigin.split(',').map((o) => o.trim())
        : corsOrigin,
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Influence Academy API')
      .setDescription(
        'Backend API for the Influence Academy influencer marketing platform',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory, {
      customCssUrl:
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css',
      customJs: [
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js',
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-standalone-preset.js',
      ],
    });

    await app.init();
  }
  return app;
}

export default async function handler(req, res) {
  const app = await bootstrap();
  const instance = app.getHttpAdapter().getInstance();
  instance(req, res);
}
