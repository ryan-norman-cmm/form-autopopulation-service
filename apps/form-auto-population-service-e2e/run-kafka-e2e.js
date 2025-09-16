#!/usr/bin/env node

/**
 * Kafka E2E Test Coordinator
 * This script coordinates running the E2E test with a real service instance
 */

const { spawn, exec } = require('child_process');
const express = require('express');
const { promisify } = require('util');
const execAsync = promisify(exec);

let mockFhirServer;
let serviceProcess;
let serverPort;

async function startMockFhirServer() {
  return new Promise((resolve) => {
    console.log('🏥 Starting mock FHIR server...');

    const app = express();
    app.use(express.json());

    const createdResources = [];

    // Mock FHIR endpoints
    app.post('/fhir/QuestionnaireResponse', (req, res) => {
      const resource = req.body;
      resource.id = `questionnaire-response-${Date.now()}`;
      createdResources.push(resource);
      console.log(
        `📋 Mock FHIR server created QuestionnaireResponse: ${resource.id}`
      );
      res.status(201).json(resource);
    });

    app.post('/QuestionnaireResponse', (req, res) => {
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

    app.get('/QuestionnaireResponse', (req, res) => {
      res.json({
        resourceType: 'Bundle',
        entry: createdResources.map((r) => ({ resource: r })),
      });
    });

    app.post('/auth/token', (req, res) => {
      res.json({
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    mockFhirServer = app.listen(0, () => {
      serverPort = mockFhirServer.address().port;
      console.log(`🏥 Mock FHIR server started on port ${serverPort}`);
      resolve(serverPort);
    });
  });
}

async function startService(fhirPort) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting form-auto-population-service...');

    const env = {
      ...process.env,
      AIDBOX_URL: `http://localhost:${fhirPort}`,
      FHIR_SERVER_URL: `http://localhost:${fhirPort}/fhir`,
      KAFKA_BOOTSTRAP_SERVERS: 'localhost:9094',
      PORT: '3000',
    };

    serviceProcess = spawn(
      'npx',
      ['nx', 'serve', 'form-auto-population-service'],
      {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    serviceProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[SERVICE] ${output.trim()}`);

      if (output.includes('Form Auto-Population Service started')) {
        console.log('✅ Service started successfully');
        resolve();
      }
    });

    serviceProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`[SERVICE ERROR] ${output.trim()}`);
    });

    serviceProcess.on('error', (error) => {
      console.error('❌ Failed to start service:', error);
      reject(error);
    });

    // Resolve after 10 seconds if no startup message
    setTimeout(() => {
      console.log('⏰ Service startup timeout - proceeding with test');
      resolve();
    }, 10000);
  });
}

async function runE2ETest() {
  console.log('🧪 Running Kafka integration E2E test...');

  return new Promise((resolve, reject) => {
    const testProcess = spawn(
      'npx',
      [
        'nx',
        'e2e',
        'form-auto-population-service-e2e',
        '--',
        '--grep',
        'Kafka integration',
      ],
      {
        stdio: 'inherit',
      }
    );

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ E2E test completed successfully');
        resolve();
      } else {
        console.log(`❌ E2E test failed with code ${code}`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });
  });
}

async function cleanup() {
  console.log('🧹 Cleaning up...');

  if (serviceProcess) {
    serviceProcess.kill('SIGTERM');
    console.log('🛑 Service process terminated');
  }

  if (mockFhirServer) {
    mockFhirServer.close();
    console.log('🏥 Mock FHIR server closed');
  }
}

async function main() {
  try {
    console.log('🚀 Starting Kafka E2E Test Coordinator\n');

    // Start mock FHIR server
    const fhirPort = await startMockFhirServer();

    // Wait a moment for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start the service
    await startService(fhirPort);

    // Wait for service to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Run the E2E test
    await runE2ETest();

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});

main();
