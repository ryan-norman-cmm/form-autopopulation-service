import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AppConfigSchema,
  FhirConfigSchema,
  KafkaConfigSchema,
  HealthcareEventsConfigSchema,
  HealthcareEventsAllConfigSchema,
} from './validation.schema';

describe('Configuration Validation Schemas', () => {
  describe('AppConfigSchema', () => {
    it('should validate valid app configuration', async () => {
      const config = {
        NODE_ENV: 'development',
        PORT: 3002,
      };

      const validatedConfig = plainToClass(AppConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.NODE_ENV).toBe('development');
      expect(validatedConfig.PORT).toBe(3002);
    });

    it('should use defaults when optional fields are missing', async () => {
      const config = {};

      const validatedConfig = plainToClass(AppConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.NODE_ENV).toBe('development');
      expect(validatedConfig.PORT).toBe(3002);
    });

    it('should reject invalid NODE_ENV values', async () => {
      const config = {
        NODE_ENV: 'invalid-environment',
      };

      const validatedConfig = plainToClass(AppConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors.length).toBeGreaterThan(0);
      const nodeEnvError = errors.find((e) => e.property === 'NODE_ENV');
      expect(nodeEnvError).toBeDefined();
    });
  });

  describe('FhirConfigSchema', () => {
    it('should validate valid FHIR configuration', async () => {
      const config = {
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        FHIR_CLIENT_ID: 'root',
        FHIR_CLIENT_SECRET: 'secret',
      };

      const validatedConfig = plainToClass(FhirConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.AIDBOX_URL).toBe('http://localhost:8081');
      expect(validatedConfig.AIDBOX_CLIENT_ID).toBe('root');
    });

    it('should reject clearly invalid URLs', async () => {
      const config = {
        AIDBOX_URL: 'definitely-not-a-url',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
      };

      const validatedConfig = plainToClass(FhirConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors.length).toBeGreaterThan(0);
      const urlError = errors.find((e) => e.property === 'AIDBOX_URL');
      expect(urlError).toBeDefined();
    });

    it('should reject missing required FHIR fields', async () => {
      const config = {
        AIDBOX_URL: 'http://localhost:8081',
        // Missing AIDBOX_CLIENT_ID and AIDBOX_CLIENT_SECRET
      };

      const validatedConfig = plainToClass(FhirConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('AIDBOX_CLIENT_ID');
      expect(errorProperties).toContain('AIDBOX_CLIENT_SECRET');
    });
  });

  describe('KafkaConfigSchema', () => {
    it('should validate valid Kafka configuration', async () => {
      const config = {
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
        KAFKA_CLIENT_ID: 'healthcare-service',
        KAFKA_BROKERS: 'localhost:9092',
      };

      const validatedConfig = plainToClass(KafkaConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.KAFKA_BOOTSTRAP_SERVERS).toBe('localhost:9092');
      expect(validatedConfig.KAFKA_CLIENT_ID).toBe('healthcare-service');
    });

    it('should use defaults for optional Kafka fields', async () => {
      const config = {
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      const validatedConfig = plainToClass(KafkaConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.KAFKA_CLIENT_ID).toBe('healthcare-service');
    });

    it('should reject missing required Kafka fields', async () => {
      const config = {
        // Missing KAFKA_BOOTSTRAP_SERVERS
        KAFKA_CLIENT_ID: 'healthcare-service',
      };

      const validatedConfig = plainToClass(KafkaConfigSchema, config);
      const errors = await validate(validatedConfig);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('KAFKA_BOOTSTRAP_SERVERS');
    });
  });

  describe('HealthcareEventsConfigSchema', () => {
    it('should validate healthcare events configuration', async () => {
      const config = {
        FHIR_SUBSCRIPTIONS_CONFIG_PATH: '/custom/config/path.yml',
      };

      const validatedConfig = plainToClass(
        HealthcareEventsConfigSchema,
        config
      );
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.FHIR_SUBSCRIPTIONS_CONFIG_PATH).toBe(
        '/custom/config/path.yml'
      );
    });

    it('should use default for subscription config path', async () => {
      const config = {};

      const validatedConfig = plainToClass(
        HealthcareEventsConfigSchema,
        config
      );
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.FHIR_SUBSCRIPTIONS_CONFIG_PATH).toBe(
        '/app/config/fhir-subscriptions.yml'
      );
    });
  });

  describe('HealthcareEventsAllConfigSchema', () => {
    it('should validate complete healthcare events configuration', async () => {
      const config = {
        NODE_ENV: 'development',
        PORT: 3002,
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
        KAFKA_CLIENT_ID: 'healthcare-service',
        FHIR_SUBSCRIPTIONS_CONFIG_PATH: '/app/config/fhir-subscriptions.yml',
      };

      const validatedConfig = plainToClass(
        HealthcareEventsAllConfigSchema,
        config
      );
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.NODE_ENV).toBe('development');
      expect(validatedConfig.AIDBOX_URL).toBe('http://localhost:8081');
      expect(validatedConfig.KAFKA_BOOTSTRAP_SERVERS).toBe('localhost:9092');
    });

    it('should validate minimal required configuration with defaults', async () => {
      const config = {
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      const validatedConfig = plainToClass(
        HealthcareEventsAllConfigSchema,
        config
      );
      const errors = await validate(validatedConfig);

      expect(errors).toHaveLength(0);
      expect(validatedConfig.NODE_ENV).toBe('development'); // default
      expect(validatedConfig.PORT).toBe(3002); // default
      expect(validatedConfig.KAFKA_CLIENT_ID).toBe('healthcare-service'); // default
    });

    it('should reject configuration missing required fields', async () => {
      const config = {
        NODE_ENV: 'development',
        PORT: 3002,
        // Missing AIDBOX_* and KAFKA_BOOTSTRAP_SERVERS
      };

      const validatedConfig = plainToClass(
        HealthcareEventsAllConfigSchema,
        config
      );
      const errors = await validate(validatedConfig);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('AIDBOX_URL');
      expect(errorProperties).toContain('AIDBOX_CLIENT_ID');
      expect(errorProperties).toContain('AIDBOX_CLIENT_SECRET');
      expect(errorProperties).toContain('KAFKA_BOOTSTRAP_SERVERS');
    });
  });
});
