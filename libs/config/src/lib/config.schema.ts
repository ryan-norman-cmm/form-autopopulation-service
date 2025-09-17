import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsUrl,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

export class KafkaConfig {
  @IsNotEmpty({
    message:
      'KAFKA_BOOTSTRAP_SERVERS is required. Please set this environment variable.',
  })
  @IsString({ message: 'KAFKA_BOOTSTRAP_SERVERS must be a valid string.' })
  bootstrapServers!: string;

  @IsNotEmpty({
    message:
      'KAFKA_CLIENT_ID is required. Please set this environment variable.',
  })
  @IsString({ message: 'KAFKA_CLIENT_ID must be a valid string.' })
  clientId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'KAFKA_CONNECTION_TIMEOUT must be a valid number.' })
  connectionTimeout?: number;

  @IsOptional()
  @IsNumber({}, { message: 'KAFKA_REQUEST_TIMEOUT must be a valid number.' })
  requestTimeout?: number;

  @IsNotEmpty({
    message:
      'FORM_POPULATION_COMPLETED_TOPIC is required. Please set this environment variable.',
  })
  @IsString({
    message: 'FORM_POPULATION_COMPLETED_TOPIC must be a valid string.',
  })
  formPopulationCompletedTopic!: string;
}

export class FhirServerConfig {
  @IsNotEmpty({
    message:
      'AIDBOX_URL is required. Please set this environment variable to your FHIR server URL.',
  })
  @IsUrl(
    {},
    { message: 'AIDBOX_URL must be a valid URL (e.g., http://localhost:8081).' }
  )
  url!: string;

  @IsNotEmpty({
    message:
      'FORM_AUTOPOPULATION_CLIENT_ID is required. Please set this environment variable.',
  })
  @IsString({
    message: 'FORM_AUTOPOPULATION_CLIENT_ID must be a valid string.',
  })
  clientId!: string;

  @IsNotEmpty({
    message:
      'FORM_AUTOPOPULATION_CLIENT_SECRET is required. Please set this environment variable.',
  })
  @IsString({
    message: 'FORM_AUTOPOPULATION_CLIENT_SECRET must be a valid string.',
  })
  clientSecret!: string;
}

export class AppConfig {
  @IsOptional()
  @IsString()
  nodeEnv?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsString()
  corsOrigin?: string;
}

export class Config {
  @ValidateNested()
  @Type(() => AppConfig)
  app!: AppConfig;

  @ValidateNested()
  @Type(() => KafkaConfig)
  kafka!: KafkaConfig;

  @ValidateNested()
  @Type(() => FhirServerConfig)
  fhirServer!: FhirServerConfig;
}
