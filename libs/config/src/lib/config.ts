import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  Config,
  AppConfig,
  KafkaConfig,
  FhirServerConfig,
} from './config.schema';

export function configFactory(): Config {
  const rawConfig = {
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      corsOrigin:
        process.env.CORS_ORIGIN ||
        'http://localhost:3000,http://localhost:4200',
    },
    kafka: {
      bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS,
      clientId: process.env.KAFKA_CLIENT_ID,
      connectionTimeout: process.env.KAFKA_CONNECTION_TIMEOUT
        ? parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10)
        : 30000,
      requestTimeout: process.env.KAFKA_REQUEST_TIMEOUT
        ? parseInt(process.env.KAFKA_REQUEST_TIMEOUT, 10)
        : 30000,
      formPopulationCompletedTopic: process.env.FORM_POPULATION_COMPLETED_TOPIC,
    },
    fhirServer: {
      url: process.env.AIDBOX_URL,
      clientId: process.env.FORM_AUTOPOPULATION_CLIENT_ID,
      clientSecret: process.env.FORM_AUTOPOPULATION_CLIENT_SECRET,
    },
  };

  const config = plainToInstance(Config, rawConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formatErrors = (errors: any[], prefix = ''): string[] => {
      const messages: string[] = [];

      for (const error of errors) {
        const propertyPath = prefix
          ? `${prefix}.${error.property}`
          : error.property;

        // Handle direct constraints
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          messages.push(`${propertyPath}: ${constraintMessages.join(', ')}`);
        }

        // Handle nested validation errors
        if (error.children && error.children.length > 0) {
          messages.push(...formatErrors(error.children, propertyPath));
        }
      }

      return messages;
    };

    const errorMessages = formatErrors(errors).join('\n  ');

    throw new Error(
      `Configuration validation failed. Please check the following environment variables:\n  ${errorMessages}`
    );
  }

  return config;
}

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService<Config, true>) {}

  get app(): AppConfig {
    return this.configService.get('app', { infer: true });
  }

  get kafka(): KafkaConfig {
    return this.configService.get('kafka', { infer: true });
  }

  get fhirServer(): FhirServerConfig {
    return this.configService.get('fhirServer', { infer: true });
  }

  get port(): number {
    return this.app.port || 3000;
  }

  get nodeEnv(): string {
    return this.app.nodeEnv || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get kafkaBootstrapServers(): string {
    return this.kafka.bootstrapServers;
  }

  get kafkaClientId(): string {
    return this.kafka.clientId;
  }

  get fhirServerUrl(): string {
    return this.fhirServer.url;
  }

  get formPopulationCompletedTopic(): string {
    return this.kafka.formPopulationCompletedTopic;
  }
}
