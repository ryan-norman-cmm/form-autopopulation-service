import { test, expect } from '@playwright/test';
import { WegovyOutput } from '@form-auto-population/fhir-questionnaire-converter';
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

  // Use port 0 to get an available port automatically
  mockFhirServer = app.listen(0);
  serverPort = (mockFhirServer.address() as any)?.port;
  console.log(`🏥 Mock FHIR server started on port ${serverPort}`);

  // Initialize Kafka producer
  kafkaProducer = new KafkaProducer();
  await kafkaProducer.connect();
});

test.afterAll(async () => {
  if (mockFhirServer) {
    mockFhirServer.close();
  }
  if (kafkaProducer) {
    await kafkaProducer.disconnect();
  }
});

test.beforeEach(async () => {
  // Clear resources before each test
  createdResources = [];
});

test('End-to-end Kafka form auto-population with real service', async ({
  request,
}) => {
  // Check if the service is configured for testing
  // The service needs to be started with:
  // AIDBOX_URL=http://localhost:{mockFhirServerPort} KAFKA_BOOTSTRAP_SERVERS=localhost:9094 npx nx serve form-auto-population-service

  // Skip if service is not running - Service must be manually started for this test
  const serviceHealthCheck = await request
    .get('http://localhost:3000/health')
    .catch(() => null);
  if (!serviceHealthCheck?.ok()) {
    test.skip(
      true,
      'Form auto-population service not running on port 3000. Start with: AIDBOX_URL=http://localhost:' +
        serverPort +
        ' KAFKA_BOOTSTRAP_SERVERS=localhost:9094 npx nx serve form-auto-population-service'
    );
  }

  // Wait for mock FHIR server to be ready
  await expect(async () => {
    const response = await request.get(`http://localhost:${serverPort}/health`);
    expect(response.ok()).toBeTruthy();
  }).toPass({ timeout: 5000 });

  const testEvent: FormPopulationCompletedEvent = {
    formId: 'wegovy-intake',
    patientId: 'patient-123',
    wegovyOutput: WEGOVY_TEST_DATA,
    timestamp: '2025-09-13T10:00:00Z',
  };

  // Publish Kafka event to trigger the service
  await kafkaProducer.publishFormPopulationCompleted(testEvent);
  console.log('📨 Published Kafka event, waiting for service to process...');

  // Wait for the service to process the event and create the FHIR resource
  // The service should connect to our mock FHIR server on the dynamic port
  // We need to configure the service to use our mock FHIR server
  // For this test, we'll poll for the created resource

  let questionnaireResponse: any = null;
  await expect(async () => {
    const response = await request.get(
      `http://localhost:${serverPort}/QuestionnaireResponse`
    );
    expect(response.ok()).toBeTruthy();
    const bundle = await response.json();
    expect(bundle.entry).toHaveLength(1);
    questionnaireResponse = bundle.entry[0].resource;
  }).toPass({ timeout: 30000, intervals: [2000] });

  // Verify the FHIR QuestionnaireResponse structure
  expect(questionnaireResponse.resourceType).toBe('QuestionnaireResponse');
  expect(questionnaireResponse.status).toBe('completed');
  expect(questionnaireResponse.questionnaire).toBe(
    'Questionnaire/wegovy-intake'
  );
  expect(questionnaireResponse.subject.reference).toBe('Patient/patient-123');
  expect(questionnaireResponse.authored).toBe('2025-09-13T10:00:00Z');

  // Verify the response contains the expected number of items
  expect(questionnaireResponse.item).toHaveLength(5);

  // Verify specific data type conversions
  const ageItem = questionnaireResponse.item.find(
    (item: any) => item.linkId === 'patient-age'
  );
  expect(ageItem.answer[0].valueInteger).toBe(45);

  const genderItem = questionnaireResponse.item.find(
    (item: any) => item.linkId === 'patient-gender'
  );
  expect(genderItem.answer[0].valueCoding.code).toBe('female');
  expect(genderItem.answer[0].valueCoding.system).toBe(
    'http://hl7.org/fhir/administrative-gender'
  );

  const bmiItem = questionnaireResponse.item.find(
    (item: any) => item.linkId === 'current-bmi'
  );
  expect(bmiItem.answer[0].valueDecimal).toBe(32.5);

  const criteriaItem = questionnaireResponse.item.find(
    (item: any) => item.linkId === 'bmi-criteria'
  );
  expect(criteriaItem.answer[0].valueBoolean).toBe(true);

  const comorbiditiesItem = questionnaireResponse.item.find(
    (item: any) => item.linkId === 'weight-related-comorbidities'
  );
  expect(comorbiditiesItem.answer).toHaveLength(2);
  expect(comorbiditiesItem.answer[0].valueString).toBe(
    'Type 2 diabetes mellitus'
  );
  expect(comorbiditiesItem.answer[1].valueString).toBe('Hypertension');

  // Verify FHIR metadata
  expect(questionnaireResponse.meta.profile).toEqual([
    'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse',
  ]);
  expect(questionnaireResponse.meta.lastUpdated).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
  );

  console.log('✅ End-to-end Kafka form auto-population test passed!');
  console.log(
    `📋 Service processed Kafka event and created QuestionnaireResponse`
  );
  console.log(`👤 Patient: ${questionnaireResponse.subject.reference}`);
  console.log(`📝 Form: ${questionnaireResponse.questionnaire}`);
});
