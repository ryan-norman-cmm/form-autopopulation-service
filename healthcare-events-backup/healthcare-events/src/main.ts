import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import {
  HealthcareEventsConfig,
  HealthcareEventsAllConfigSchema,
} from './app/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service from the application
  const configService = app.get(ConfigService<HealthcareEventsAllConfigSchema>);
  const healthcareConfig = new HealthcareEventsConfig(configService);

  const port = healthcareConfig.port;
  await app.listen(port);

  console.log(`🏥 Healthcare Events Service is running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Healthcare Events Service:', error);
  process.exit(1);
});
