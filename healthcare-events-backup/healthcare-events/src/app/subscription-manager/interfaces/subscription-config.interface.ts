export interface SubscriptionConfig {
  subscriptions: FhirSubscriptionDefinition[];
}

export interface FhirSubscriptionDefinition {
  resourceType: string;
  topicName: string;
  supportedInteractions: ('create' | 'update' | 'delete')[];
  owner: string; // Required owner for each subscription
  fhirPathCriteria?: string;
  kafkaTopic?: string; // Optional override, defaults to fhir.{resourceType}.events
  description?: string;
}

export interface AidboxSubscriptionTopic {
  resourceType: 'AidboxSubscriptionTopic';
  id?: string;
  meta?: {
    tag?: FhirTag[];
    extension?: FhirExtension[];
    lastUpdated?: string;
    createdAt?: string;
    versionId?: string;
  };
  extension?: FhirExtension[];
  url: string;
  status: 'active' | 'inactive' | 'draft' | 'retired';
  trigger: AidboxSubscriptionTrigger[];
  [key: string]: unknown;
}

export interface AidboxSubscriptionTrigger {
  resource: string;
  fhirPathCriteria?: string;
  supportedInteraction: ('create' | 'update' | 'delete')[];
}

export interface AidboxTopicDestination {
  resourceType: 'AidboxTopicDestination';
  id?: string;
  meta?: {
    profile: string[];
    tag?: FhirTag[];
    extension?: FhirExtension[];
    lastUpdated?: string;
    createdAt?: string;
    versionId?: string;
  };
  extension?: FhirExtension[];
  status?: 'active' | 'inactive' | 'error';
  kind: 'kafka-at-least-once' | 'kafka-at-most-once';
  topic: string;
  parameter: AidboxTopicParameter[];
  [key: string]: unknown;
}

export interface AidboxTopicParameter {
  name: string;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  value?: {
    string?: string;
    integer?: number;
    boolean?: boolean;
  };
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueCode?: string;
  valueUri?: string;
  valueId?: string;
}

export interface FhirTag {
  system: string;
  code: string;
  display?: string;
}
