/**
 * Configuration module exports
 * Provides centralized access to unified configuration service and schemas
 */

// Unified configuration service
export { HealthcareEventsConfig } from './healthcare-events.config';

// Validation schemas
export {
  AppConfigSchema,
  FhirConfigSchema,
  KafkaConfigSchema,
  HealthcareEventsConfigSchema,
  HealthcareEventsAllConfigSchema,
} from './validation.schema';

// Configuration validation function
export { validateConfig } from './config.validation';
