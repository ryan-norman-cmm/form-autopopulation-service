export {
  FhirService,
  type FhirServiceConfig,
  type AidboxResource,
} from './lib/fhir-service';

// Re-export commonly used types from Aidbox SDK
export type {
  Patient,
  Bundle,
  Communication,
  Observation,
  DiagnosticReport,
  Encounter,
  Practitioner,
  Organization,
  DomainResource,
  ResourceTypeMap,
} from '@aidbox/sdk-r4/types';
