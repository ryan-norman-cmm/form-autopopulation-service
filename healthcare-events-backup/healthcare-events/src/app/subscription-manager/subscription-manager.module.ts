import { Module } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';
import { SubscriptionManagerService } from './subscription-manager.service';
import { HealthcareEventsConfig } from '../config';

@Module({
  providers: [
    // Unified configuration service
    HealthcareEventsConfig,

    // FHIR service factory
    {
      provide: 'FHIR_SERVICE',
      useFactory: (config: HealthcareEventsConfig) => {
        if (!config.isFhirConfigured) {
          throw new Error(
            'FHIR/Aidbox configuration is required for healthcare events functionality'
          );
        }

        return new FhirService(config.getFhirConfig());
      },
      inject: [HealthcareEventsConfig],
    },

    // Application services
    SubscriptionManagerService,
  ],
  exports: [SubscriptionManagerService],
})
export class SubscriptionManagerModule {}
