import { Controller, Get } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import axios from 'axios';

@Controller({ path: 'health' })
export class HealthController {
  @Get()
  async getHealth() {
    let kafkaStatus = 'unknown';
    let databaseStatus = 'unknown';
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

    // Check database connection if configured
    if (
      process.env.DATABASE_URL ||
      (process.env.DB_HOST && process.env.DB_PORT)
    ) {
      try {
        // In a real implementation, you would check your actual database connection
        // For now, we'll just mark it as configured
        databaseStatus = 'configured';
      } catch {
        databaseStatus = 'disconnected';
      }
    } else {
      databaseStatus = 'not-configured';
    }

    // Check external APIs (FHIR server) - REQUIRED
    if (process.env.FHIR_SERVER_URL || process.env.AIDBOX_URL) {
      try {
        const fhirUrl = process.env.FHIR_SERVER_URL || process.env.AIDBOX_URL;
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
      kafkaStatus === 'connected' &&
      (databaseStatus === 'configured' ||
        databaseStatus === 'not-configured') &&
      externalApiStatus === 'connected';

    return {
      status: allHealthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'form-auto-population-service',
      version: '1.0.0',
      checks: {
        kafka: kafkaStatus,
        database: databaseStatus,
        externalApi: externalApiStatus,
      },
      uptime: process.uptime(),
      required: ['kafka', 'externalApi'],
      optional: ['database'],
    };
  }
}
