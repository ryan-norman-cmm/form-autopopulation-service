import { Controller, Get } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import axios from 'axios';

@Controller({ path: 'health' })
export class HealthController {
  @Get()
  async getHealth() {
    let kafkaStatus = 'unknown';
    let externalApiStatus = 'unknown';

    // Check Kafka connection if configured
    if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
      try {
        const kafka = new Kafka({
          clientId: 'form-population-health-check',
          brokers: process.env.KAFKA_BOOTSTRAP_SERVERS.split(','),
        });

        const admin = kafka.admin();
        await admin.connect();

        // Check if form population topics exist
        const topics = await admin.listTopics();
        const hasFormTopics = topics.some(
          (topic) =>
            topic.includes('form.population') ||
            topic.includes('form.validation')
        );

        await admin.disconnect();
        kafkaStatus = hasFormTopics ? 'connected' : 'topics-missing';
      } catch {
        kafkaStatus = 'disconnected';
      }
    } else {
      kafkaStatus = 'not-configured';
    }

    // Check external APIs (FHIR server) - REQUIRED
    if (process.env.AIDBOX_URL) {
      try {
        const fhirUrl = process.env.AIDBOX_URL;
        const healthEndpoint = `${fhirUrl}/health`;

        const response = await axios.get(healthEndpoint, {
          timeout: 5000,
          validateStatus: (status) => status < 500, // Accept any status < 500
        });

        const isHealthy = response.status === 200;
        externalApiStatus = isHealthy ? 'connected' : 'unavailable';
      } catch {
        externalApiStatus = 'disconnected';
      }
    } else {
      // FHIR server is required for this service
      externalApiStatus = 'not-configured';
    }

    // Service is only healthy if all required services are working
    const allHealthy =
      kafkaStatus === 'connected' && externalApiStatus === 'connected';

    return {
      status: allHealthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'form-auto-population-service',
      version: '1.0.0',
      checks: {
        kafka: kafkaStatus,
        externalApi: externalApiStatus,
      },
      uptime: process.uptime(),
      required: ['kafka', 'externalApi'],
    };
  }
}
