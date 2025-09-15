import 'reflect-metadata';
import { validateConfig, createConfigFactory } from './config.validation';
import { describe, it, expect } from 'vitest';

describe('Configuration Validation', () => {
  describe('validateConfig', () => {
    it('should validate valid healthcare events configuration', async () => {
      const config = {
        NODE_ENV: 'development',
        PORT: '3002',
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        FHIR_CLIENT_ID: 'root',
        FHIR_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
        KAFKA_CLIENT_ID: 'healthcare-service',
        KAFKA_BROKERS: 'localhost:9092',
        FHIR_SUBSCRIPTIONS_CONFIG_PATH: '/app/config/fhir-subscriptions.yml',
      };

      const result = await validateConfig(config);
      expect(result).toBeDefined();
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3002);
      expect(result.AIDBOX_URL).toBe('http://localhost:8081');
      expect(result.KAFKA_BOOTSTRAP_SERVERS).toBe('localhost:9092');
    });

    it('should validate minimal required configuration', async () => {
      const config = {
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      const result = await validateConfig(config);
      expect(result).toBeDefined();
      expect(result.NODE_ENV).toBe('development'); // default
      expect(result.PORT).toBe(3002); // default
      expect(result.AIDBOX_URL).toBe('http://localhost:8081');
      expect(result.KAFKA_BOOTSTRAP_SERVERS).toBe('localhost:9092');
    });

    it('should throw error for missing required FHIR configuration', async () => {
      const config = {
        NODE_ENV: 'development',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      await expect(validateConfig(config)).rejects.toThrow(
        'Configuration validation failed'
      );
    });

    it('should throw error for missing required Kafka configuration', async () => {
      const config = {
        NODE_ENV: 'development',
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
      };

      await expect(validateConfig(config)).rejects.toThrow(
        'Configuration validation failed'
      );
    });

    it('should handle type transformations correctly', async () => {
      const config = {
        PORT: '3003',
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      const result = await validateConfig(config);
      expect(result.PORT).toBe(3003);
      expect(typeof result.PORT).toBe('number');
    });

    it('should preserve undefined values for optional fields', async () => {
      const config = {
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      const result = await validateConfig(config);
      expect(result.FHIR_CLIENT_ID).toBeUndefined();
      expect(result.KAFKA_CLIENT_ID).toBe('healthcare-service'); // default
      expect(result.FHIR_SUBSCRIPTIONS_CONFIG_PATH).toBe(
        '/app/config/fhir-subscriptions.yml'
      ); // default
    });

    it('should reject invalid NODE_ENV values', async () => {
      const config = {
        NODE_ENV: 'invalid-env',
        AIDBOX_URL: 'http://localhost:8081',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      await expect(validateConfig(config)).rejects.toThrow(
        'Configuration validation failed'
      );
    });

    it('should reject invalid URLs', async () => {
      const config = {
        AIDBOX_URL: 'not-a-valid-url',
        AIDBOX_CLIENT_ID: 'root',
        AIDBOX_CLIENT_SECRET: 'secret',
        KAFKA_BOOTSTRAP_SERVERS: 'localhost:9092',
      };

      await expect(validateConfig(config)).rejects.toThrow(
        'Configuration validation failed'
      );
    });
  });

  describe('createConfigFactory', () => {
    it('should create a configuration factory function', () => {
      const factory = createConfigFactory();
      expect(factory).toBeDefined();
      expect(typeof factory).toBe('function');
    });
  });
});
