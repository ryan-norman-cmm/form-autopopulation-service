import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FhirService } from '@form-auto-population/fhir-client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FormPopulationController } from './form-population.controller';
import { FormPopulationService } from './form-population.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController, FormPopulationController, HealthController],
  providers: [
    AppService,
    FormPopulationService,
    {
      provide: 'FHIR_SERVICE',
      useFactory: (configService: ConfigService) => {
        const baseUrl =
          configService.get('AIDBOX_URL') ||
          configService.get('FHIR_SERVER_URL');
        const clientId =
          configService.get('AIDBOX_CLIENT_ID') ||
          configService.get('FHIR_CLIENT_ID');
        const clientSecret =
          configService.get('AIDBOX_CLIENT_SECRET') ||
          configService.get('FHIR_CLIENT_SECRET');

        if (!baseUrl) {
          throw new Error(
            'FHIR server configuration is required. Set AIDBOX_URL or FHIR_SERVER_URL environment variable.'
          );
        }

        if (!clientId) {
          throw new Error(
            'FHIR client ID is required. Set AIDBOX_CLIENT_ID or FHIR_CLIENT_ID environment variable.'
          );
        }

        if (!clientSecret) {
          throw new Error(
            'FHIR client secret is required. Set AIDBOX_CLIENT_SECRET or FHIR_CLIENT_SECRET environment variable.'
          );
        }

        const fhirConfig = {
          baseUrl,
          clientId,
          clientSecret,
        };

        return new FhirService(fhirConfig);
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
