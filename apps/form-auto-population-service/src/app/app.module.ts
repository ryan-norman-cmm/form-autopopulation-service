import { Module } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';
import {
  AppConfigModule,
  AppConfigService,
} from '@form-auto-population/config';
import { AppController } from './app.controller';
import { FormPopulationController } from './form-population.controller';
import { FormPopulationService } from './form-population.service';
import { HealthController } from './health.controller';

@Module({
  imports: [AppConfigModule],
  controllers: [AppController, FormPopulationController, HealthController],
  providers: [
    FormPopulationService,
    {
      provide: 'FHIR_SERVICE',
      useFactory: (configService: AppConfigService) => {
        const fhirServerConfig = configService.fhirServer;

        if (!fhirServerConfig.url) {
          throw new Error(
            'FHIR server configuration is required. Set AIDBOX_URL environment variable.'
          );
        }

        if (!fhirServerConfig.clientId) {
          throw new Error(
            'FHIR client ID is required. Set FORM_AUTOPOPULATION_CLIENT_ID environment variable.'
          );
        }

        if (!fhirServerConfig.clientSecret) {
          throw new Error(
            'FHIR client secret is required. Set FORM_AUTOPOPULATION_CLIENT_SECRET environment variable.'
          );
        }

        const fhirConfig = {
          baseUrl: fhirServerConfig.url,
          clientId: fhirServerConfig.clientId,
          clientSecret: fhirServerConfig.clientSecret,
        };

        return new FhirService(fhirConfig);
      },
      inject: [AppConfigService],
    },
  ],
})
export class AppModule {}
