import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configFactory, AppConfigService } from './config';

describe('Config Library', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('configFactory', () => {
    it('should throw error when required environment variables are missing', () => {
      // Don't set any environment variables
      expect(() => configFactory()).toThrow('Configuration validation failed');
    });
  });

  describe('AppConfigService', () => {
    it('should be instantiable', () => {
      const mockConfigService = {
        get: vi.fn().mockImplementation((key: string) => {
          const config = {
            app: { nodeEnv: 'test', port: 3000 },
            kafka: { bootstrapServers: 'localhost:9092' },
            fhirServer: { url: 'http://localhost:8081' }
          };
          return (config as any)[key];
        })
      };

      const appConfigService = new AppConfigService(mockConfigService as any);
      expect(appConfigService).toBeDefined();
      expect(appConfigService.nodeEnv).toBe('test');
      expect(appConfigService.port).toBe(3000);
    });
  });
});