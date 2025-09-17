import { Controller, Get } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import axios from 'axios';
import { AppConfigService } from '@form-auto-population/config';

@Controller({ path: 'health' })
export class HealthController {
  constructor(private configService: AppConfigService) {}

  @Get()
  async getHealth() {
    let kafkaStatus = 'unknown';
    let fhirServerStatus = 'unknown';
    let fhirServerDetails = {};

    // Check Kafka connection if configured
    if (this.configService.kafkaBootstrapServers) {
      try {
        const kafka = new Kafka({
          clientId: 'form-population-health-check',
          brokers: this.configService.kafkaBootstrapServers.split(','),
        });

        const admin = kafka.admin();
        await admin.connect();

        // Check if form population topics exist
        const topics = await admin.listTopics();
        const hasFormTopics = topics.some((topic) =>
          topic.includes('form.population')
        );

        await admin.disconnect();
        kafkaStatus = hasFormTopics ? 'connected' : 'topics-missing';
      } catch {
        kafkaStatus = 'disconnected';
      }
    } else {
      kafkaStatus = 'not-configured';
    }

    // Check FHIR server - REQUIRED
    if (this.configService.fhirServerUrl) {
      try {
        const fhirUrl = this.configService.fhirServerUrl;
        const healthEndpoint = `${fhirUrl}/health`;

        const response = await axios.get(healthEndpoint, {
          timeout: 5000,
          validateStatus: (status) => status < 500, // Accept any status < 500
        });

        const isHealthy = response.status === 200;
        fhirServerStatus = isHealthy ? 'connected' : 'unavailable';
        fhirServerDetails = {
          url: fhirUrl,
          responseStatus: response.status,
          responseTime: response.headers['x-response-time'] || 'unknown',
          lastChecked: new Date().toISOString(),
        };
      } catch (error) {
        fhirServerStatus = 'disconnected';
        fhirServerDetails = {
          url: this.configService.fhirServerUrl,
          error: error instanceof Error ? error.message : 'Connection failed',
          lastChecked: new Date().toISOString(),
        };
      }
    } else {
      // FHIR server is required for this service
      fhirServerStatus = 'not-configured';
      fhirServerDetails = {
        error: 'AIDBOX_URL environment variable not configured',
      };
    }

    // Service is only healthy if all required services are working
    const allHealthy =
      kafkaStatus === 'connected' && fhirServerStatus === 'connected';

    return {
      status: allHealthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'form-auto-population-service',
      version: '1.0.0',
      checks: {
        kafka: {
          status: kafkaStatus,
          brokers: this.configService.kafkaBootstrapServers?.split(',') || [],
          required: true,
        },
        fhirServer: {
          status: fhirServerStatus,
          ...fhirServerDetails,
          required: true,
        },
      },
      uptime: process.uptime(),
      required: ['kafka', 'fhirServer'],
    };
  }
}
