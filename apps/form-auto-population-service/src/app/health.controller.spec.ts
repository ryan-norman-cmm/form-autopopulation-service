import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

// Mock kafkajs
vi.mock('kafkajs', () => ({
  Kafka: vi.fn().mockImplementation(() => ({
    admin: vi.fn().mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      listTopics: vi
        .fn()
        .mockResolvedValue([
          'form.population.requested',
          'form.validation.requested',
        ]),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

// Mock axios
vi.mock('axios');

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return unhealthy status when services not configured', async () => {
      // Clear environment variables for this test
      delete process.env.KAFKA_BOOTSTRAP_SERVERS;
      delete process.env.DATABASE_URL;
      delete process.env.FHIR_SERVER_URL;
      delete process.env.AIDBOX_URL;

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        service: 'form-auto-population-service',
        version: '1.0.0',
        checks: {
          kafka: 'not-configured',
          database: 'not-configured',
          externalApi: 'not-configured',
        },
        uptime: expect.any(Number),
        required: ['kafka', 'externalApi'],
        optional: ['database'],
      });
    });

    it('should check Kafka connection when configured', async () => {
      // Set environment variables for this test
      process.env.KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092';
      process.env.AIDBOX_URL = 'http://localhost:8081';

      const result = await controller.getHealth();

      expect(result.checks.kafka).toBe('connected');
      // Status will still be unhealthy because FHIR server is mocked as unavailable
      expect(result.status).toBe('unhealthy');

      // Clean up
      delete process.env.KAFKA_BOOTSTRAP_SERVERS;
      delete process.env.AIDBOX_URL;
    });

    it('should check database configuration when set', async () => {
      // Set environment variables for this test
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';

      const result = await controller.getHealth();

      expect(result.checks.database).toBe('configured');
      expect(result.status).toBe('unhealthy'); // Still unhealthy because Kafka and FHIR are not configured

      // Clean up
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
    });
  });
});
