import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
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

  // Add Kafka microservice configuration
  if (healthcareConfig.isKafkaConfigured) {
    const kafkaConfig = healthcareConfig.getKafkaConfig();
    
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: kafkaConfig.consumerGroup,
          brokers: kafkaConfig.brokers,
          connectionTimeout: kafkaConfig.connectionTimeout,
          requestTimeout: kafkaConfig.requestTimeout,
        },
        consumer: {
          groupId: `${kafkaConfig.consumerGroup}-consumer`,
          allowAutoTopicCreation: true,
        },
        subscribe: {
          fromBeginning: false,
        },
      },
    });

    // Start all microservices
    await app.startAllMicroservices();
    console.log('📨 Kafka microservice started');
    console.log(`📨 Kafka Brokers: ${kafkaConfig.brokers.join(', ')}`);
    console.log(`📨 Consumer Group: ${kafkaConfig.consumerGroup}-consumer`);
  } else {
    console.log('📨 Kafka not configured - running HTTP-only mode');
  }

  const port = healthcareConfig.port;
  await app.listen(port);

  console.log(`🏥 Healthcare Events Service is running on port ${port}`);

bootstrap().catch((error) => {
  console.error('Failed to start Healthcare Events Service:', error);
  process.exit(1);
});
