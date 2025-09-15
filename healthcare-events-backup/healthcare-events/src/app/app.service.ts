import { Injectable } from '@nestjs/common';
import { SubscriptionManagerService } from './subscription-manager/subscription-manager.service';
import {
  AidboxSubscriptionTopic,
  AidboxTopicDestination,
  FhirSubscriptionDefinition,
} from './subscription-manager/interfaces/subscription-config.interface';

// Type definitions for FHIR meta tags and parameters
interface FhirMetaTag {
  system?: string;
  code?: string;
}

interface FhirParameter {
  name?: string;
  valueString?: string;
  value?: {
    string?: string;
  };
}

@Injectable()
export class AppService {
  constructor(
    private readonly subscriptionManager: SubscriptionManagerService
  ) {}

  async getSubscriptions() {
    const { topics, destinations, config } =
      await this.subscriptionManager.getAllManagedResources();

    return {
      subscriptionTopics: topics.map((topic: AidboxSubscriptionTopic) => ({
        id: topic.id,
        resourceType: topic.resourceType,
        status: topic.status,
        url: topic.url,
        trigger: topic.trigger,
        owner: topic.meta?.tag?.find(
          (tag: FhirMetaTag) =>
            tag.system === 'http://fhir-mod-demo.local/subscription-owner'
        )?.code,
        configHash: this.getExtensionValue(
          topic,
          'http://fhir-mod-demo.local/extension/config-hash'
        ),
        lastUpdated: topic.meta?.lastUpdated,
        versionId: topic.meta?.versionId,
      })),

      topicDestinations: destinations.map(
        (destination: AidboxTopicDestination) => ({
          id: destination.id,
          resourceType: destination.resourceType,
          kind: destination.kind,
          topic: destination.topic,
          parameters:
            destination.parameter?.reduce(
              (params: Record<string, string>, param: FhirParameter) => {
                const value = param.valueString || param.value?.string;
                if (param.name && value) {
                  params[param.name] = value;
                }
                return params;
              },
              {} as Record<string, string>
            ) || {},
          owner: destination.meta?.tag?.find(
            (tag: FhirMetaTag) =>
              tag.system === 'http://fhir-mod-demo.local/subscription-owner'
          )?.code,
          configHash: this.getExtensionValue(
            destination,
            'http://fhir-mod-demo.local/extension/config-hash'
          ),
          lastUpdated: destination.meta?.lastUpdated,
          versionId: destination.meta?.versionId,
        })
      ),

      configuration: config
        ? {
            subscriptions: config.subscriptions.map(
              (sub: FhirSubscriptionDefinition) => ({
                resourceType: sub.resourceType,
                topicName: sub.topicName,
                supportedInteractions: sub.supportedInteractions,
                owner: sub.owner,
                kafkaTopic: sub.kafkaTopic,
                description: sub.description,
              })
            ),
          }
        : null,

      summary: {
        totalTopics: topics.length,
        totalDestinations: destinations.length,
        timestamp: new Date().toISOString(),
        service: 'healthcare-events',
        status:
          topics.length > 0 || destinations.length > 0
            ? 'healthy - subscription management active'
            : 'healthy - no subscriptions configured',
      },
    };
  }

  private getExtensionValue(
    resource: unknown,
    url: string
  ): string | undefined {
    const getExtValue = (ext: unknown) =>
      (ext as { valueString?: string; value?: { string?: string } })
        ?.valueString ||
      (ext as { valueString?: string; value?: { string?: string } })?.value
        ?.string;

    const resourceExtension = (
      resource as { extension?: Array<{ url: string }> }
    )?.extension?.find((ext) => ext.url === url);
    const metaExtension = (
      resource as { meta?: { extension?: Array<{ url: string }> } }
    )?.meta?.extension?.find((ext) => ext.url === url);

    return getExtValue(resourceExtension) || getExtValue(metaExtension);
  }
}
