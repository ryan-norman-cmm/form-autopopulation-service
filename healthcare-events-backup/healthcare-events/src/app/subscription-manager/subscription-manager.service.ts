import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { FhirService } from '@form-auto-population/fhir-client';
import { HealthcareEventsConfig } from '../config';
import {
  SubscriptionConfig,
  FhirSubscriptionDefinition,
  AidboxSubscriptionTopic,
  AidboxTopicDestination,
  AidboxTopicParameter,
} from './interfaces/subscription-config.interface';

@Injectable()
export class SubscriptionManagerService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionManagerService.name);
  private readonly ownerTagSystem =
    'http://fhir-mod-demo.local/subscription-owner';
  private readonly configHashExtensionUrl =
    'http://fhir-mod-demo.local/extension/config-hash';

  constructor(
    @Inject('FHIR_SERVICE') private readonly fhirService: FhirService,
    private readonly healthcareConfig: HealthcareEventsConfig
  ) {}

  async onModuleInit() {
    this.logger.log('🏥 Initializing Healthcare Events Service');
    await this.initializeSubscriptions();
  }

  private async initializeSubscriptions(): Promise<void> {
    try {
      // Load subscription configuration
      const config = await this.loadSubscriptionConfig();

      // Exit early if no configuration provided
      if (
        !config ||
        !config.subscriptions ||
        config.subscriptions.length === 0
      ) {
        this.logger.log(
          '✅ Healthcare Events Service initialization completed (no subscriptions configured)'
        );
        return;
      }

      // Synchronize subscriptions with configuration
      await this.synchronizeSubscriptions(config);

      this.logger.log('✅ Healthcare Events Service initialization completed');
    } catch (error) {
      this.logger.error('❌ Failed to initialize subscriptions:', error);
      throw error;
    }
  }

  private async synchronizeSubscriptions(
    config: SubscriptionConfig
  ): Promise<void> {
    const configHash = this.generateConfigHash(config);
    this.logger.log(`📋 Configuration hash: ${configHash}`);

    // Group subscriptions by owner
    const subscriptionsByOwner = this.groupSubscriptionsByOwner(config);

    // Process each owner group
    for (const [owner, subscriptions] of subscriptionsByOwner.entries()) {
      this.logger.log(
        `🔄 Synchronizing ${subscriptions.length} subscriptions for owner: ${owner}`
      );

      // Get existing managed resources for this owner
      const { topics, destinations } = await this.getManagedResources(owner);

      // Track which resources should exist for this owner
      const expectedTopicIds = new Set<string>();
      const expectedDestinationIds = new Set<string>();

      // Process each subscription definition for this owner
      for (const subscription of subscriptions) {
        const topicId = subscription.topicName;
        const destinationId = `${subscription.topicName}-kafka-destination`;

        expectedTopicIds.add(topicId);
        expectedDestinationIds.add(destinationId);

        await this.syncSubscriptionTopic(subscription, configHash);
        await this.syncTopicDestination(subscription, configHash);
      }

      // Clean up orphaned resources for this owner
      await this.cleanupOrphanedResources(
        topics,
        destinations,
        expectedTopicIds,
        expectedDestinationIds
      );

      this.logger.log(
        `✅ Synchronized ${subscriptions.length} subscriptions for owner: ${owner}`
      );
    }
  }

  private groupSubscriptionsByOwner(
    config: SubscriptionConfig
  ): Map<string, FhirSubscriptionDefinition[]> {
    const groups = new Map<string, FhirSubscriptionDefinition[]>();

    for (const subscription of config.subscriptions) {
      const owner = subscription.owner;

      if (!groups.has(owner)) {
        groups.set(owner, []);
      }
      groups.get(owner)!.push(subscription);
    }

    return groups;
  }

  private generateConfigHash(config: SubscriptionConfig): string {
    // Create a hash based on the configuration to detect changes
    const configStr = JSON.stringify(config, null, 0);
    const hash = Buffer.from(configStr).toString('base64').substring(0, 16);
    return hash;
  }

  private async getManagedResources(owner: string): Promise<{
    topics: AidboxSubscriptionTopic[];
    destinations: AidboxTopicDestination[];
  }> {
    try {
      // Search for subscription topics managed by this owner using metadata tags
      const topicsResponse =
        await this.fhirService.searchAidboxResources<AidboxSubscriptionTopic>(
          'AidboxSubscriptionTopic',
          `_tag=${this.ownerTagSystem}|${owner}`
        );

      // Search for topic destinations managed by this owner using metadata tags
      const destinationsResponse =
        await this.fhirService.searchAidboxResources<AidboxTopicDestination>(
          'AidboxTopicDestination',
          `_tag=${this.ownerTagSystem}|${owner}`
        );

      return {
        topics: topicsResponse.entry?.map((e) => e.resource) || [],
        destinations: destinationsResponse.entry?.map((e) => e.resource) || [],
      };
    } catch (error) {
      this.logger.warn(
        'Could not search for existing resources, proceeding with empty list:',
        error
      );
      return { topics: [], destinations: [] };
    }
  }

  private async loadSubscriptionConfig(): Promise<SubscriptionConfig | null> {
    try {
      const configPath = this.healthcareConfig.fhirSubscriptionsConfigPath;

      // Check if configuration file exists
      if (!fs.existsSync(configPath)) {
        this.logger.log(
          `No configuration file found at ${configPath}, skipping subscription initialization`
        );
        return null;
      }

      // Load and parse YAML configuration
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as SubscriptionConfig;

      this.logger.log(
        `Loaded ${config.subscriptions.length} subscription definitions`
      );
      return config;
    } catch (error) {
      this.logger.error('Failed to load subscription configuration:', error);
      return null;
    }
  }

  private async syncSubscriptionTopic(
    definition: FhirSubscriptionDefinition,
    configHash: string
  ): Promise<void> {
    const topicId = definition.topicName;
    const subscriptionOwner = definition.owner;

    try {
      const existing =
        await this.fhirService.getAidboxResource<AidboxSubscriptionTopic>(
          'AidboxSubscriptionTopic',
          topicId
        );

      const currentHash = this.getExtensionValue(
        existing,
        this.configHashExtensionUrl
      );

      if (
        currentHash === configHash &&
        this.isTopicUpToDate(existing, definition, subscriptionOwner)
      ) {
        this.logger.log(`✅ AidboxSubscriptionTopic ${topicId} is up to date`);
        return;
      }

      // Update existing resource
      const updated = this.buildSubscriptionTopic(
        definition,
        subscriptionOwner,
        configHash
      );
      updated.id = topicId;

      await this.fhirService.putAidboxResource<AidboxSubscriptionTopic>(
        'AidboxSubscriptionTopic',
        topicId,
        updated
      );
      this.logger.log(`🔄 Updated AidboxSubscriptionTopic: ${topicId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        (error as { response?: { status?: number } })?.response?.status ===
          404 ||
        errorMessage.includes('404') ||
        errorMessage.includes('Not Found')
      ) {
        // Create new resource
        const newTopic = this.buildSubscriptionTopic(
          definition,
          subscriptionOwner,
          configHash
        );
        newTopic.id = topicId;

        await this.fhirService.putAidboxResource<AidboxSubscriptionTopic>(
          'AidboxSubscriptionTopic',
          topicId,
          newTopic
        );
        this.logger.log(`✅ Created AidboxSubscriptionTopic: ${topicId}`);
      } else {
        throw error;
      }
    }
  }

  private async syncTopicDestination(
    definition: FhirSubscriptionDefinition,
    configHash: string
  ): Promise<void> {
    const destinationId = `${definition.topicName}-kafka-destination`;
    const subscriptionOwner = definition.owner;

    try {
      const existing =
        await this.fhirService.getAidboxResource<AidboxTopicDestination>(
          'AidboxTopicDestination',
          destinationId
        );

      const currentHash = this.getExtensionValue(
        existing,
        this.configHashExtensionUrl
      );

      if (
        currentHash === configHash &&
        this.isDestinationUpToDate(existing, definition, subscriptionOwner)
      ) {
        this.logger.log(
          `✅ AidboxTopicDestination ${destinationId} is up to date`
        );
        return;
      }

      // Try PUT update first; if it fails, recreate the resource
      await this.createOrUpdateDestination(
        destinationId,
        definition,
        subscriptionOwner,
        configHash,
        'update'
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        (error as { response?: { status?: number } })?.response?.status ===
          404 ||
        errorMessage.includes('404') ||
        errorMessage.includes('Not Found')
      ) {
        // Resource doesn't exist, create it
        await this.createOrUpdateDestination(
          destinationId,
          definition,
          subscriptionOwner,
          configHash,
          'create'
        );
      } else {
        throw error;
      }
    }
  }

  private async createOrUpdateDestination(
    destinationId: string,
    definition: FhirSubscriptionDefinition,
    owner: string,
    configHash: string,
    operation: 'create' | 'update'
  ): Promise<void> {
    const destination = this.buildTopicDestination(
      definition,
      owner,
      configHash
    );
    destination.id = destinationId;

    if (operation === 'update') {
      try {
        await this.fhirService.putAidboxResource<AidboxTopicDestination>(
          'AidboxTopicDestination',
          destinationId,
          destination
        );
        this.logger.log(`🔄 Updated AidboxTopicDestination: ${destinationId}`);
        return;
      } catch (updateError) {
        this.logger.warn(
          `⚠️ PUT update failed for ${destinationId}, recreating:`,
          updateError
        );
        // Fall through to delete/create
      }
    }

    // Delete existing (if update failed) and create new
    if (operation === 'update') {
      try {
        await this.fhirService.deleteAidboxResource(
          'AidboxTopicDestination',
          destinationId
        );
        this.logger.log(`🗑️ Deleted AidboxTopicDestination: ${destinationId}`);
      } catch (deleteError) {
        this.logger.warn(
          `⚠️ Delete failed, proceeding with create:`,
          deleteError
        );
      }
    }

    await this.fhirService.createAidboxResource<AidboxTopicDestination>(
      'AidboxTopicDestination',
      destination
    );
    this.logger.log(
      `✅ ${
        operation === 'create' ? 'Created' : 'Recreated'
      } AidboxTopicDestination: ${destinationId}`
    );
  }

  private buildSubscriptionTopic(
    definition: FhirSubscriptionDefinition,
    owner: string,
    configHash: string
  ): AidboxSubscriptionTopic {
    const topicId = definition.topicName;
    return {
      resourceType: 'AidboxSubscriptionTopic',
      id: topicId,
      meta: {
        tag: [
          {
            system: this.ownerTagSystem,
            code: owner,
            display: `Managed by ${owner}`,
          },
        ],
        extension: [
          {
            url: this.configHashExtensionUrl,
            valueString: configHash,
          },
        ],
      },
      status: 'active',
      url: `http://aidbox.app/subscriptions/${topicId}`,
      trigger: [
        {
          resource: definition.resourceType,
          supportedInteraction: definition.supportedInteractions,
          ...(definition.fhirPathCriteria && {
            fhirPathCriteria: definition.fhirPathCriteria,
          }),
        },
      ],
    };
  }

  private buildTopicDestination(
    definition: FhirSubscriptionDefinition,
    owner: string,
    configHash: string
  ): AidboxTopicDestination {
    const destinationId = `${definition.topicName}-kafka-destination`;

    return {
      resourceType: 'AidboxTopicDestination',
      id: destinationId,
      meta: {
        profile: [
          'http://aidbox.app/StructureDefinition/aidboxtopicdestination-kafka-at-least-once',
        ],
        tag: [
          {
            system: this.ownerTagSystem,
            code: owner,
            display: `Managed by ${owner}`,
          },
        ],
        extension: [
          {
            url: this.configHashExtensionUrl,
            valueString: configHash,
          },
        ],
      },
      kind: 'kafka-at-least-once',
      topic: `http://aidbox.app/subscriptions/${definition.topicName}`,
      parameter: [
        {
          name: 'kafkaTopic',
          // Use custom kafkaTopic if provided, otherwise default to fhir.{resourceType}.events
          value: {
            string:
              definition.kafkaTopic ||
              `fhir.${definition.resourceType.toLowerCase()}.events`,
          },
        },
        {
          name: 'bootstrapServers',
          value: {
            string: this.healthcareConfig.kafkaBrokersString,
          },
        },
      ],
    };
  }

  private getExtensionValue(
    resource: AidboxSubscriptionTopic | AidboxTopicDestination,
    url: string
  ): string | undefined {
    // Check both resource-level extensions and meta extensions
    const resourceExtension = resource.extension?.find(
      (ext) => ext.url === url
    )?.valueString;
    const metaExtension = resource.meta?.extension?.find(
      (ext) => ext.url === url
    )?.valueString;
    return resourceExtension || metaExtension;
  }

  private getOwnerFromMetadata(
    resource: AidboxSubscriptionTopic | AidboxTopicDestination
  ): string | undefined {
    return resource.meta?.tag?.find((tag) => tag.system === this.ownerTagSystem)
      ?.code;
  }

  private isTopicUpToDate(
    existing: AidboxSubscriptionTopic,
    definition: FhirSubscriptionDefinition,
    owner: string
  ): boolean {
    const ownerMatch = this.getOwnerFromMetadata(existing) === owner;
    const statusMatch = existing.status === 'active';
    const triggerMatch =
      existing.trigger?.[0]?.resource === definition.resourceType &&
      JSON.stringify(existing.trigger[0].supportedInteraction?.sort()) ===
        JSON.stringify(definition.supportedInteractions.sort());

    return ownerMatch && statusMatch && triggerMatch;
  }

  private isDestinationUpToDate(
    existing: AidboxTopicDestination,
    definition: FhirSubscriptionDefinition,
    owner: string
  ): boolean {
    const ownerMatch = this.getOwnerFromMetadata(existing) === owner;
    const topicMatch =
      existing.topic ===
      `http://aidbox.app/subscriptions/${definition.topicName}`;
    const kafkaTopicParam = existing.parameter?.find(
      (p) => p.name === 'kafkaTopic'
    );
    const expectedKafkaTopic =
      definition.kafkaTopic ||
      `fhir.${definition.resourceType.toLowerCase()}.events`;
    const kafkaTopicMatch =
      this.getParameterValue(kafkaTopicParam) === expectedKafkaTopic;

    return ownerMatch && topicMatch && kafkaTopicMatch;
  }

  private getParameterValue(param?: AidboxTopicParameter): string | undefined {
    return param?.valueString || param?.value?.string;
  }

  /**
   * Get all currently managed subscription resources
   */
  async getAllManagedResources(): Promise<{
    topics: AidboxSubscriptionTopic[];
    destinations: AidboxTopicDestination[];
    config: SubscriptionConfig | null;
  }> {
    try {
      const config = await this.loadSubscriptionConfig();

      if (!config?.subscriptions?.length) {
        return { topics: [], destinations: [], config: null };
      }

      // Group subscriptions by owner to get all managed resources
      const subscriptionsByOwner = this.groupSubscriptionsByOwner(config);
      const allTopics: AidboxSubscriptionTopic[] = [];
      const allDestinations: AidboxTopicDestination[] = [];

      // Collect resources from all owners
      for (const [owner] of subscriptionsByOwner.entries()) {
        const { topics, destinations } = await this.getManagedResources(owner);
        allTopics.push(...topics);
        allDestinations.push(...destinations);
      }

      return {
        topics: allTopics,
        destinations: allDestinations,
        config,
      };
    } catch (error) {
      this.logger.warn('Failed to get managed resources:', error);
      return { topics: [], destinations: [], config: null };
    }
  }
  private async cleanupOrphanedResources(
    existingTopics: AidboxSubscriptionTopic[],
    existingDestinations: AidboxTopicDestination[],
    expectedTopicIds: Set<string>,
    expectedDestinationIds: Set<string>
  ): Promise<void> {
    // Clean up orphaned topics
    for (const topic of existingTopics) {
      if (!topic.id || expectedTopicIds.has(topic.id)) continue;

      try {
        await this.fhirService.deleteAidboxResource(
          'AidboxSubscriptionTopic',
          topic.id
        );
        this.logger.log(
          `🗑️ Removed orphaned AidboxSubscriptionTopic: ${topic.id}`
        );
      } catch (error) {
        this.logger.warn(`Failed to remove orphaned topic ${topic.id}:`, error);
      }
    }

    // Clean up orphaned destinations
    for (const destination of existingDestinations) {
      if (!destination.id || expectedDestinationIds.has(destination.id))
        continue;

      try {
        await this.fhirService.deleteAidboxResource(
          'AidboxTopicDestination',
          destination.id
        );
        this.logger.log(
          `🗑️ Removed orphaned AidboxTopicDestination: ${destination.id}`
        );
      } catch (error) {
        this.logger.warn(
          `Failed to remove orphaned destination ${destination.id}:`,
          error
        );
      }
    }
  }
}
