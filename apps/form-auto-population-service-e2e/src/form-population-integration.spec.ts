import { test, expect } from '@playwright/test';
import {
  WegovyOutput,
  convertToQuestionnaireResponse,
} from '@form-auto-population/fhir-questionnaire-converter';
import express from 'express';
import { Server } from 'http';
import { KafkaProducer, FormPopulationCompletedEvent } from './kafka-producer';

// Test data - subset of Wegovy AI output for testing
const WEGOVY_TEST_DATA: WegovyOutput = [
  {
    question_id: 'patient-age',
    question_text: 'Patient Age',
    answer: 45,
  },
  {
    question_id: 'patient-gender',
    question_text: 'Patient Gender',
    answer: 'Female',
  },
  {
    question_id: 'current-bmi',
    question_text: 'Current BMI (kg/m²)',
    answer: 32.5,
  },
  {
    question_id: 'bmi-criteria',
    question_text: 'BMI meets criteria',
    answer: true,
  },
  {
    question_id: 'weight-related-comorbidities',
    question_text: 'Weight-related comorbidities',
    answer: ['Type 2 diabetes mellitus', 'Hypertension'],
  },
];

let mockFhirServer: Server;
let createdResources: any[] = [];
let serverPort: number;
let kafkaProducer: KafkaProducer;

test.beforeAll(async () => {
  // Start mock FHIR server (acts as Aidbox)
  const app = express();
  app.use(express.json());

  // Mock FHIR endpoint for creating QuestionnaireResponse
  app.post('/QuestionnaireResponse', (req, res) => {
    const resource = req.body;
    resource.id = `questionnaire-response-${Date.now()}`;
    createdResources.push(resource);
    console.log(
      `📋 Mock FHIR server created QuestionnaireResponse: ${resource.id}`
    );
    res.status(201).json(resource);
  });

  // Mock authentication endpoint
  app.post('/auth/token', (req, res) => {
    res.json({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
  });

  // Endpoint to retrieve created resources for testing
  app.get('/QuestionnaireResponse', (req, res) => {
    res.json({
      resourceType: 'Bundle',
      entry: createdResources.map((r) => ({ resource: r })),
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // FHIR base path - create separate handlers
  app.post('/fhir/QuestionnaireResponse', (req, res) => {
    const resource = req.body;
    resource.id = `questionnaire-response-${Date.now()}`;
    createdResources.push(resource);
    console.log(
      `📋 Mock FHIR server created QuestionnaireResponse: ${resource.id}`
    );
    res.status(201).json(resource);
  });

  app.get('/fhir/QuestionnaireResponse', (req, res) => {
    res.json({
      resourceType: 'Bundle',
      entry: createdResources.map((r) => ({ resource: r })),
    });
  });

  // Use port 0 to get an available port automatically
  mockFhirServer = app.listen(0);
  serverPort = (mockFhirServer.address() as any)?.port;
  console.log(`🏥 Mock FHIR server started on port ${serverPort}`);

  // Initialize Kafka producer
  kafkaProducer = new KafkaProducer();

  // Check if Kafka is available
  try {
    await kafkaProducer.connect();
    console.log('📨 Kafka producer connected successfully');
  } catch (error) {
    console.warn('⚠️ Could not connect to Kafka. Skipping Kafka tests.', error);
    test.skip(true, 'Kafka not available. Run: docker compose up -d');
  }
});

test.afterAll(async () => {
  if (mockFhirServer) {
    mockFhirServer.close();
  }
  if (kafkaProducer) {
    await kafkaProducer.disconnect();
  }
  if (serviceProcess) {
    serviceProcess.kill();
  }
});

test.beforeEach(async () => {
  // Clear resources before each test
  createdResources = [];
});

test.describe('Form Auto-Population Integration Tests', () => {
  test('Direct library conversion (baseline test)', async ({ request }) => {
    // This test validates the library conversion without Kafka
    // Use the converter function from static import

    const questionnaireResponse = convertToQuestionnaireResponse(
      WEGOVY_TEST_DATA,
      {
        formId: 'wegovy-intake',
        patientId: 'patient-123',
        timestamp: '2025-09-13T10:00:00Z',
      }
    );

    // Post the converted response to our mock FHIR server
    const fhirResponse = await request.post(
      `http://localhost:${serverPort}/QuestionnaireResponse`,
      {
        data: questionnaireResponse,
      }
    );

    expect(fhirResponse.ok()).toBeTruthy();
    const createdResource = await fhirResponse.json();

    // Verify the FHIR QuestionnaireResponse structure
    expect(createdResource.resourceType).toBe('QuestionnaireResponse');
    expect(createdResource.status).toBe('completed');
    expect(createdResource.item).toHaveLength(5);

    console.log('✅ Direct library conversion test passed!');
  });

  test('Kafka integration test (requires running service)', async ({
    request,
  }) => {
    // This test requires the service to be running with proper configuration
    // Check if we can find a running service
    let serviceFound = false;
    const servicePorts = [3000, 3001, 3002];
    let servicePort = 3000;

    for (const port of servicePorts) {
      try {
        const healthCheck = await request.get(
          `http://localhost:${port}/health`
        );
        if (healthCheck.ok()) {
          servicePort = port;
          serviceFound = true;
          console.log(`✅ Found running service on port ${port}`);
          break;
        }
      } catch {
        // Service not running on this port
      }
    }

    if (!serviceFound) {
      console.log(`⚠️ No running service found. To run this test:`);
      console.log(`1. Start Kafka: docker compose up -d kafka zookeeper`);
      console.log(
        `2. Start service: AIDBOX_URL=http://localhost:${serverPort} KAFKA_BOOTSTRAP_SERVERS=localhost:9094 npx nx serve form-auto-population-service`
      );
      test.skip(
        true,
        'Service not running. See console for start instructions.'
      );
    }

    const testEvent: FormPopulationCompletedEvent = {
      formId: 'wegovy-intake',
      patientId: 'patient-123-kafka',
      wegovyOutput: WEGOVY_TEST_DATA,
      timestamp: '2025-09-13T10:00:00Z',
    };

    // Publish Kafka event to trigger the service
    await kafkaProducer.publishFormPopulationCompleted(testEvent);
    console.log('📨 Published Kafka event, waiting for service to process...');

    // Wait for the service to process the event and create the FHIR resource
    let questionnaireResponse: any = null;

    await expect(async () => {
      const response = await request.get(
        `http://localhost:${serverPort}/QuestionnaireResponse`
      );
      expect(response.ok()).toBeTruthy();
      const bundle = await response.json();
      expect(bundle.entry).toBeDefined();
      expect(bundle.entry.length).toBeGreaterThan(0);

      // Find the response for our patient
      const entry = bundle.entry.find(
        (e: any) =>
          e.resource.subject?.reference === 'Patient/patient-123-kafka'
      );
      expect(entry).toBeDefined();
      questionnaireResponse = entry.resource;
    }).toPass({ timeout: 15000, intervals: [1000] });

    if (!questionnaireResponse) {
      console.log(
        '❌ Service did not process the Kafka event within 30 seconds'
      );
      console.log('🔍 Debugging info:');
      console.log(`- Mock FHIR server port: ${serverPort}`);
      console.log(`- Service port: ${servicePort}`);
      console.log(`- Created resources: ${createdResources.length}`);

      // Check if the service is configured correctly
      const serviceHealth = await request.get(
        `http://localhost:${servicePort}/health`
      );
      console.log(`- Service health: ${serviceHealth.ok() ? 'OK' : 'Failed'}`);

      test.fail(
        true,
        'Service did not create QuestionnaireResponse from Kafka event'
      );
    }

    // Verify the FHIR QuestionnaireResponse structure
    expect(questionnaireResponse.resourceType).toBe('QuestionnaireResponse');
    expect(questionnaireResponse.status).toBe('completed');
    expect(questionnaireResponse.questionnaire).toBe(
      'Questionnaire/wegovy-intake'
    );
    expect(questionnaireResponse.subject.reference).toBe(
      'Patient/patient-123-kafka'
    );
    expect(questionnaireResponse.authored).toBe('2025-09-13T10:00:00Z');
    expect(questionnaireResponse.item).toHaveLength(5);

    console.log('✅ End-to-end Kafka integration test passed!');
    console.log(
      `📋 Service processed Kafka event and created QuestionnaireResponse`
    );
    console.log(`👤 Patient: ${questionnaireResponse.subject.reference}`);
    console.log(`📝 Form: ${questionnaireResponse.questionnaire}`);
  });
});
