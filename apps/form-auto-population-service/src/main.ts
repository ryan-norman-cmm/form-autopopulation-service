/**
 * Form Auto-Population Service
 * A NestJS microservice for automated form population using patient data
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // Create the main application
  const app = await NestFactory.create(AppModule);

  // Add Kafka microservice if configured
  if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID || 'form-population-service',
          brokers: process.env.KAFKA_BOOTSTRAP_SERVERS.split(','),
          connectionTimeout: 30000,
          requestTimeout: 30000,
        },
        consumer: {
          groupId: process.env.KAFKA_CLIENT_ID || 'form-population-service',
          allowAutoTopicCreation: true,
        },
        subscribe: {
          fromBeginning: false,
        },
      },
    });
  }

  // Enable CORS for HTTP endpoints
  app.enableCors();

  // Set global prefix for HTTP endpoints, excluding health
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health'],
  });

  const port = process.env.PORT || 3000;

  // Start both HTTP and Kafka services (if configured)
  if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
    await app.startAllMicroservices();
    Logger.log('📨 Kafka microservice started');
  }

  await app.listen(port);

  Logger.log(`🚀 Form Auto-Population Service started on port ${port}`);
  Logger.log(`🌐 HTTP endpoints: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`🏥 Health check: http://localhost:${port}/health`);

  if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
    Logger.log(`📨 Kafka Brokers: ${process.env.KAFKA_BOOTSTRAP_SERVERS}`);
    Logger.log('📨 Listening for form population and validation events');
  } else {
    Logger.log('📨 Kafka not configured - running HTTP-only mode');
  }
}

bootstrap();
