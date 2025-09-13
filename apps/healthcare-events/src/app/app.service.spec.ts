import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { SubscriptionManagerService } from './subscription-manager/subscription-manager.service';

describe('AppService', () => {
  let service: AppService;
  let mockSubscriptionManager: SubscriptionManagerService;

  beforeEach(async () => {
    // Mock data structure
    const mockData = {
      topics: [
        {
          id: 'communication.created',
          resourceType: 'AidboxSubscriptionTopic',
          status: 'active',
          url: 'http://fhir-mod-demo.local/topic/communication.created',
          trigger: [
            {
              resource: 'Communication',
              supportedInteraction: ['create'],
            },
          ],
          meta: {
            lastUpdated: '2024-08-28T12:00:00Z',
            versionId: '1',
            tag: [
              {
                system: 'http://fhir-mod-demo.local/subscription-owner',
                code: 'communication-service',
              },
            ],
          },
          extension: [
            {
              url: 'http://fhir-mod-demo.local/extension/config-hash',
              valueString: 'abc123',
            },
          ],
        },
        {
          id: 'communication.updated',
          resourceType: 'AidboxSubscriptionTopic',
          status: 'active',
          url: 'http://fhir-mod-demo.local/topic/communication.updated',
          trigger: [
            {
              resource: 'Communication',
              supportedInteraction: ['update'],
            },
          ],
          meta: {
            lastUpdated: '2024-08-28T12:00:00Z',
            versionId: '1',
            tag: [
              {
                system: 'http://fhir-mod-demo.local/subscription-owner',
                code: 'communication-service',
              },
            ],
          },
          extension: [
            {
              url: 'http://fhir-mod-demo.local/extension/config-hash',
              valueString: 'def456',
            },
          ],
        },
      ],
      destinations: [
        {
          id: 'communication.created-kafka-destination',
          resourceType: 'AidboxTopicDestination',
          kind: 'kafka',
          topic: 'communication.created',
          parameter: [
            {
              name: 'bootstrapServers',
              valueString: 'localhost:9094',
            },
            {
              name: 'topicName',
              valueString: 'fhir.communication.events',
            },
          ],
          meta: {
            lastUpdated: '2024-08-28T12:00:00Z',
            versionId: '1',
            tag: [
              {
                system: 'http://fhir-mod-demo.local/subscription-owner',
                code: 'communication-service',
              },
            ],
          },
        },
        {
          id: 'communication.updated-kafka-destination',
          resourceType: 'AidboxTopicDestination',
          kind: 'kafka',
          topic: 'communication.updated',
          parameter: [
            {
              name: 'bootstrapServers',
              valueString: 'localhost:9094',
            },
            {
              name: 'topicName',
              valueString: 'fhir.communication.events',
            },
          ],
          meta: {
            lastUpdated: '2024-08-28T12:00:00Z',
            versionId: '1',
            tag: [
              {
                system: 'http://fhir-mod-demo.local/subscription-owner',
                code: 'communication-service',
              },
            ],
          },
        },
      ],
      config: {
        subscriptions: [
          {
            resourceType: 'Communication',
            topicName: 'communication.created',
            supportedInteractions: ['create'],
            owner: 'communication-service',
            kafkaTopic: 'communication.created',
            description: 'Communication creation events for SMS workflow',
          },
          {
            resourceType: 'Communication',
            topicName: 'communication.updated',
            supportedInteractions: ['update'],
            owner: 'communication-service',
            kafkaTopic: 'communication.updated',
            description: 'Communication update events for SMS workflow',
          },
        ],
      },
    };

    // Create a proper mock
    mockSubscriptionManager = {
      getAllManagedResources: vi.fn().mockResolvedValue(mockData),
    } as SubscriptionManagerService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: SubscriptionManagerService,
          useValue: mockSubscriptionManager,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.skip('should return subscription configuration', async () => {
    const result = await service.getSubscriptions();

    expect(result).toBeDefined();
    expect(result.subscriptionTopics).toHaveLength(2);
    expect(result.topicDestinations).toHaveLength(2);
    expect(result.summary.totalTopics).toBe(2);
    expect(result.summary.totalDestinations).toBe(2);
    expect(result.summary.service).toBe('healthcare-events');
    expect(result.summary.status).toBe(
      'healthy - subscription management active'
    );
  });

  it.skip('should return communication subscription topics', async () => {
    const result = await service.getSubscriptions();

    const createdTopic = result.subscriptionTopics.find(
      (topic) => topic.id === 'communication.created'
    );
    const updatedTopic = result.subscriptionTopics.find(
      (topic) => topic.id === 'communication.updated'
    );

    expect(createdTopic).toBeDefined();
    expect(createdTopic?.resourceType).toBe('AidboxSubscriptionTopic');
    expect(createdTopic?.status).toBe('active');
    expect(createdTopic?.trigger[0].resource).toBe('Communication');
    expect(createdTopic?.trigger[0].supportedInteraction).toContain('create');

    expect(updatedTopic).toBeDefined();
    expect(updatedTopic?.resourceType).toBe('AidboxSubscriptionTopic');
    expect(updatedTopic?.status).toBe('active');
    expect(updatedTopic?.trigger[0].resource).toBe('Communication');
    expect(updatedTopic?.trigger[0].supportedInteraction).toContain('update');
  });

  it.skip('should return kafka destinations for topics', async () => {
    const result = await service.getSubscriptions();

    const createdDestination = result.topicDestinations.find(
      (dest) => dest.id === 'communication.created-kafka-destination'
    );
    const updatedDestination = result.topicDestinations.find(
      (dest) => dest.id === 'communication.updated-kafka-destination'
    );

    expect(createdDestination).toBeDefined();
    expect(createdDestination?.resourceType).toBe('AidboxTopicDestination');
    expect(createdDestination?.topic).toBe('communication.created');
    expect(createdDestination?.parameters?.bootstrapServers).toBe(
      'localhost:9094'
    );
    expect(createdDestination?.parameters?.topicName).toBe(
      'fhir.communication.events'
    );

    expect(updatedDestination).toBeDefined();
    expect(updatedDestination?.resourceType).toBe('AidboxTopicDestination');
    expect(updatedDestination?.topic).toBe('communication.updated');
    expect(updatedDestination?.parameters?.bootstrapServers).toBe(
      'localhost:9094'
    );
    expect(updatedDestination?.parameters?.topicName).toBe(
      'fhir.communication.events'
    );
  });
});
