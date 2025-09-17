import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { AppConfigService } from '@form-auto-population/config';

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
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ status: 200, headers: {} }),
  },
}));

describe('HealthController', () => {
  let controller: HealthController;
  let configService: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: AppConfigService,
          useValue: {
            kafkaBootstrapServers: 'localhost:9092',
            fhirServerUrl: 'http://localhost:8081',
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    configService = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return unhealthy status when services not configured', async () => {
      // Mock config service to return undefined for required services
      vi.spyOn(configService, 'kafkaBootstrapServers', 'get').mockReturnValue(
        undefined as any
      );
      vi.spyOn(configService, 'fhirServerUrl', 'get').mockReturnValue(
        undefined as any
      );

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        service: 'form-auto-population-service',
        version: '1.0.0',
        checks: {
          kafka: {
            status: 'not-configured',
            brokers: [],
            required: true,
          },
          fhirServer: {
            status: 'not-configured',
            error: 'AIDBOX_URL environment variable not configured',
            required: true,
          },
        },
        uptime: expect.any(Number),
        required: ['kafka', 'fhirServer'],
      });
    });

    it('should check Kafka connection when configured', async () => {
      // Config service already has default values configured

      const result = await controller.getHealth();

      expect(result.checks.kafka.status).toBe('connected');
      expect(result.checks.kafka.brokers).toEqual(['localhost:9092']);
      expect(result.checks.kafka.required).toBe(true);
    });

    it('should check FHIR server connection when configured', async () => {
      // Config service already has default values configured

      const result = await controller.getHealth();

      expect(result.checks.fhirServer.status).toBe('connected');
      expect(result.checks.fhirServer.url).toBe('http://localhost:8081');
      expect(result.checks.fhirServer.required).toBe(true);
      expect(result.checks.fhirServer.lastChecked).toEqual(expect.any(String));
    });

    it('should return healthy status when all required services are connected', async () => {
      // Config service already has default values configured

      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.kafka.status).toBe('connected');
      expect(result.checks.fhirServer.status).toBe('connected');
    });
  });
});
