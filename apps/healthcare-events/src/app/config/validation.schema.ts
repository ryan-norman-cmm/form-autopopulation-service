import { IsString, IsNotEmpty, IsOptional, IsUrl, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Healthcare Events application configuration schema
 * Only includes configuration actually used by this service
 */
export class AppConfigSchema {
  @IsString()
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: 'development' | 'production' | 'test' = 'development';

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 3002))
  @Type(() => Number)
  PORT?: number = 3002;
}

/**
 * FHIR/Aidbox configuration validation schema
 * Required for healthcare events subscription management
 */
export class FhirConfigSchema {
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false })
  @IsNotEmpty()
  AIDBOX_URL!: string;

  @IsString()
  @IsNotEmpty()
  AIDBOX_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  AIDBOX_CLIENT_SECRET!: string;

  @IsString()
  @IsOptional()
  FHIR_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FHIR_CLIENT_SECRET?: string;
}

/**
 * Kafka message broker configuration validation schema
 * Required for healthcare event publishing
 */
export class KafkaConfigSchema {
  @IsString()
  @IsNotEmpty()
  KAFKA_BOOTSTRAP_SERVERS!: string;

  @IsString()
  @IsOptional()
  KAFKA_CLIENT_ID?: string = 'healthcare-service';

  @IsString()
  @IsOptional()
  KAFKA_BROKERS?: string;
}

/**
 * Healthcare Events service specific configuration
 * Required for FHIR subscription management
 */
export class HealthcareEventsConfigSchema {
  @IsString()
  @IsOptional()
  FHIR_SUBSCRIPTIONS_CONFIG_PATH?: string =
    '/app/config/fhir-subscriptions.yml';
}

/**
 * Combined configuration schema for healthcare events service
 * Only includes configuration actually needed by this service
 */
export class HealthcareEventsAllConfigSchema extends AppConfigSchema {
  // FHIR configurations - REQUIRED
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false })
  @IsNotEmpty()
  AIDBOX_URL!: string;

  @IsString()
  @IsNotEmpty()
  AIDBOX_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  AIDBOX_CLIENT_SECRET!: string;

  @IsString()
  @IsOptional()
  FHIR_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FHIR_CLIENT_SECRET?: string;

  // Kafka configurations - REQUIRED
  @IsString()
  @IsNotEmpty()
  KAFKA_BOOTSTRAP_SERVERS!: string;

  @IsString()
  @IsOptional()
  KAFKA_CLIENT_ID?: string = 'healthcare-service';

  @IsString()
  @IsOptional()
  KAFKA_BROKERS?: string;

  @IsString()
  @IsOptional()
  SUBSCRIPTION_KAFKA_TOPIC?: string;

  // Healthcare events configurations - OPTIONAL
  @IsString()
  @IsOptional()
  FHIR_SUBSCRIPTIONS_CONFIG_PATH?: string =
    '/app/config/fhir-subscriptions.yml';
}
