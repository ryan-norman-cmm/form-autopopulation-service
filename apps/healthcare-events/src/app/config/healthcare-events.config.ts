import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FhirServiceConfig } from '@form-auto-population/fhir-client';
import { HealthcareEventsAllConfigSchema } from './validation.schema';

export interface KafkaClientConfig {
  brokers: string[];
  consumerGroup: string;
  communicationTopic: string;
  connectionTimeout: number;
  requestTimeout: number;
}

/**
 * Unified Healthcare Events configuration service
 * Provides typed access to all environment variables needed by the Healthcare Events Service
 */
@Injectable()
export class HealthcareEventsConfig {
  constructor(
    private readonly configService: ConfigService<HealthcareEventsAllConfigSchema>
  ) {}

  // ============================================================================
  // Application Configuration
  // ============================================================================

  /**
   * Get the current Node.js environment
   */
  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.configService.get('NODE_ENV', { infer: true }) ?? 'development';
  }

  /**
   * Get the service port (healthcare-events port)
   */
  get port(): number {
    return this.configService.get('PORT', { infer: true }) ?? 3002;
  }

  /**
   * Check if we're in development mode
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  /**
   * Check if we're in production mode
   */
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /**
   * Check if we're in test mode
   */
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  // ============================================================================
  // Healthcare Events Configuration
  // ============================================================================

  /**
   * Get FHIR subscriptions configuration file path
   */
  get fhirSubscriptionsConfigPath(): string {
    return (
      this.configService.get('FHIR_SUBSCRIPTIONS_CONFIG_PATH', {
        infer: true,
      }) || '/app/config/fhir-subscriptions.yml'
    );
  }

  /**
   * Check if healthcare configuration is properly set up
   */
  get isHealthcareConfigured(): boolean {
    try {
      return !!(this.fhirSubscriptionsConfigPath && this.isKafkaConfigured);
    } catch {
      return false;
    }
  }

  /**
   * Get healthcare events configuration
   */
  getHealthcareConfig() {
    return {
      fhirSubscriptionsConfigPath: this.fhirSubscriptionsConfigPath,
      kafkaBrokers: this.kafkaBrokersString,
    };
  }

  // ============================================================================
  // Kafka Configuration
  // ============================================================================

  /**
   * Get Kafka brokers string
   */
  get kafkaBrokersString(): string {
    const brokers = this.configService.get('KAFKA_BOOTSTRAP_SERVERS', {
      infer: true,
    });
    if (!brokers) {
      throw new Error(
        'KAFKA_BOOTSTRAP_SERVERS is required for healthcare events streaming'
      );
    }
    return brokers;
  }

  /**
   * Get Kafka broker list
   */
  get kafkaBrokers(): string[] {
    const brokerString = this.configService.get('KAFKA_BOOTSTRAP_SERVERS', {
      infer: true,
    });
    if (!brokerString) {
      return ['localhost:9094'];
    }
    return brokerString.split(',').map((broker: string) => broker.trim());
  }

  /**
   * Get Kafka consumer group ID
   */
  get kafkaConsumerGroup(): string {
    return (
      this.configService.get('KAFKA_CLIENT_ID', { infer: true }) ||
      'healthcare-service'
    );
  }

  /**
   * Get Kafka communication topic name
   */
  get kafkaCommunicationTopic(): string {
    return (
      this.configService.get('SUBSCRIPTION_KAFKA_TOPIC', { infer: true }) ||
      'communication.created'
    );
  }

  /**
   * Get Kafka connection timeout in milliseconds
   */
  get kafkaConnectionTimeout(): number {
    const timeout = process.env.KAFKA_CONNECTION_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : 3000;
  }

  /**
   * Get Kafka request timeout in milliseconds
   */
  get kafkaRequestTimeout(): number {
    const timeout = process.env.KAFKA_REQUEST_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : 30000;
  }

  /**
   * Check if Kafka is properly configured
   */
  get isKafkaConfigured(): boolean {
    return this.kafkaBrokers.length > 0 && this.kafkaConsumerGroup.length > 0;
  }

  /**
   * Get Kafka client configuration
   */
  getKafkaConfig(): KafkaClientConfig {
    return {
      brokers: this.kafkaBrokers,
      consumerGroup: this.kafkaConsumerGroup,
      communicationTopic: this.kafkaCommunicationTopic,
      connectionTimeout: this.kafkaConnectionTimeout,
      requestTimeout: this.kafkaRequestTimeout,
    };
  }

  // ============================================================================
  // FHIR/Aidbox Configuration
  // ============================================================================

  /**
   * Get FHIR service configuration for client initialization
   */
  getFhirConfig(): FhirServiceConfig {
    const aidboxUrl = this.configService.get('AIDBOX_URL', { infer: true });
    if (!aidboxUrl) {
      throw new Error('AIDBOX_URL is required for FHIR functionality');
    }

    const baseUrl =
      aidboxUrl === 'http://aidbox-dev:8080'
        ? 'http://aidbox-dev:8080'
        : aidboxUrl;

    const aidboxClientId = this.configService.get('AIDBOX_CLIENT_ID', {
      infer: true,
    });
    const aidboxClientSecret = this.configService.get('AIDBOX_CLIENT_SECRET', {
      infer: true,
    });

    if (!aidboxClientId || !aidboxClientSecret) {
      throw new Error(
        'AIDBOX_CLIENT_ID and AIDBOX_CLIENT_SECRET are required for FHIR functionality'
      );
    }

    // Use FHIR-specific credentials if available, fallback to Aidbox credentials
    const fhirClientId =
      this.configService.get('FHIR_CLIENT_ID', { infer: true }) ||
      aidboxClientId;
    const fhirClientSecret =
      this.configService.get('FHIR_CLIENT_SECRET', { infer: true }) ||
      aidboxClientSecret;

    return {
      baseUrl,
      clientId: fhirClientId,
      clientSecret: fhirClientSecret,
    };
  }

  /**
   * Get Aidbox-specific configuration (for direct Aidbox API access)
   */
  getAidboxConfig(): FhirServiceConfig {
    const aidboxUrl = this.configService.get('AIDBOX_URL', { infer: true });
    if (!aidboxUrl) {
      throw new Error('AIDBOX_URL is required for FHIR functionality');
    }

    const baseUrl =
      aidboxUrl === 'http://aidbox-dev:8080'
        ? 'http://aidbox-dev:8080'
        : aidboxUrl;

    const aidboxClientId = this.configService.get('AIDBOX_CLIENT_ID', {
      infer: true,
    });
    const aidboxClientSecret = this.configService.get('AIDBOX_CLIENT_SECRET', {
      infer: true,
    });

    if (!aidboxClientId || !aidboxClientSecret) {
      throw new Error(
        'AIDBOX_CLIENT_ID and AIDBOX_CLIENT_SECRET are required for FHIR functionality'
      );
    }

    return {
      baseUrl,
      clientId: aidboxClientId,
      clientSecret: aidboxClientSecret,
    };
  }

  /**
   * Get FHIR endpoint URL (derived from Aidbox URL + /fhir)
   */
  get fhirUrl(): string {
    const aidboxUrl = this.configService.get('AIDBOX_URL', { infer: true });
    return aidboxUrl ? `${aidboxUrl}/fhir` : '';
  }

  /**
   * Check if FHIR/Aidbox is properly configured
   */
  get isFhirConfigured(): boolean {
    try {
      const aidboxUrl = this.configService.get('AIDBOX_URL');
      const aidboxClientId = this.configService.get('AIDBOX_CLIENT_ID');
      const aidboxClientSecret = this.configService.get('AIDBOX_CLIENT_SECRET');

      return !!(aidboxUrl && aidboxClientId && aidboxClientSecret);
    } catch {
      return false;
    }
  }
}
