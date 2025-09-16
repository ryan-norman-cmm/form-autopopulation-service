# FHIR Client Library

A comprehensive TypeScript library for FHIR R4 operations with Aidbox integration, designed specifically for healthcare applications with built-in compliance and error handling.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Healthcare Compliance](#healthcare-compliance)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The FHIR Client Library provides a type-safe, healthcare-compliant interface for working with FHIR R4 resources via the Aidbox platform. It abstracts the complexity of FHIR operations while maintaining full compliance with healthcare data handling requirements, including HIPAA-appropriate error handling and audit-friendly logging.

### What This Library Does

- **FHIR Operations**: Complete CRUD operations for all FHIR R4 resource types
- **Type Safety**: Full TypeScript support with Aidbox SDK integration
- **Healthcare Compliance**: HIPAA-compliant error handling and data sanitization
- **Aidbox Extensions**: Support for Aidbox-specific resources and features
- **Developer Experience**: Simple, intuitive API with comprehensive error handling

### Use Cases

- Patient data management in healthcare applications
- FHIR resource operations across microservices
- Healthcare event processing and workflows
- Clinical data integration and interoperability
- Aidbox subscription management for real-time updates

## Features

### FHIR R4 Compliance

- **Complete Resource Support**: All FHIR R4 resource types with type definitions
- **Standard Operations**: Create, Read, Update, Delete (CRUD) operations
- **Search Capabilities**: Advanced searching with parameter support
- **Bundle Handling**: Proper handling of FHIR bundles and search results
- **Resource Validation**: Automatic resourceType assignment and validation

### Healthcare-Specific Features

- **Data Sanitization**: Prevents patient data leakage in error messages
- **Audit Logging**: Healthcare-compliant logging without sensitive data exposure
- **Error Handling**: Structured error responses that maintain patient privacy
- **Compliance Ready**: Designed for HIPAA and other healthcare regulatory requirements

### Aidbox Integration

- **Aidbox SDK**: Built on official Aidbox SDK with full feature support
- **Custom Resources**: Support for Aidbox-specific resources (AidboxSubscriptionTopic, etc.)
- **Authentication**: Flexible authentication with basic auth support
- **Direct HTTP Access**: Access to underlying HTTP client for advanced operations

### Developer Experience

- **TypeScript First**: Full type safety with auto-completion support
- **Simple API**: Intuitive methods that abstract FHIR complexity
- **Comprehensive Testing**: Extensive unit tests with mocking support
- **Error-First Design**: Detailed error handling with healthcare considerations

## Technology Stack

### Core Dependencies

- **[@aidbox/sdk-r4](https://www.npmjs.com/package/@aidbox/sdk-r4)**: Official Aidbox SDK for FHIR R4
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development with strict mode

### Healthcare Standards

- **[FHIR R4](https://www.hl7.org/fhir/)**: HL7 FHIR Release 4 healthcare interoperability standard
- **[Aidbox](https://aidbox.app/)**: FHIR-compliant healthcare data platform

### Development Tools

- **[Vitest](https://vitest.dev/)**: Modern testing framework with TypeScript support
- **[Nx](https://nx.dev/)**: Monorepo tooling and build optimization

## Getting Started

### Installation

This library is part of the FHIR Mod Demo monorepo. To use it in other applications:

```bash
# From your application directory
npm install @aidbox/sdk-r4
# Then import the library code or publish it as a separate package
```

### Basic Usage

```typescript
import { FhirService } from '@fhir-mod-demo/fhir-client';

// Initialize the FHIR service
const fhirService = new FhirService({
  baseUrl: 'http://localhost:8081/fhir',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Use the service for FHIR operations
const patient = await fhirService.getPatient('patient-123');
```

### Configuration

The `FhirService` requires configuration for Aidbox connection:

```typescript
interface FhirServiceConfig {
  baseUrl: string; // Aidbox FHIR server URL
  clientId: string; // Authentication client ID
  clientSecret: string; // Authentication client secret
}
```

## API Reference

### Core Patient Operations

#### Get Patient

```typescript
async getPatient(id: string): Promise<Patient>
```

Retrieves a patient by ID with healthcare-compliant error handling.

```typescript
try {
  const patient = await fhirService.getPatient('patient-123');
  console.log(patient.name?.[0]?.family);
} catch (error) {
  // Error messages won't expose patient IDs or sensitive data
  console.error('Failed to retrieve patient:', error.message);
}
```

#### Create Patient

```typescript
async createPatient(patient: Patient): Promise<Patient>
```

Creates a new patient with automatic resourceType validation.

```typescript
const newPatient = await fhirService.createPatient({
  name: [
    {
      family: 'Smith',
      given: ['John'],
    },
  ],
  gender: 'male',
  birthDate: '1990-01-01',
});
```

#### Update Patient

```typescript
async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient>
```

Updates an existing patient with partial data.

```typescript
const updatedPatient = await fhirService.updatePatient('patient-123', {
  telecom: [
    {
      system: 'phone',
      value: '+1234567890',
      use: 'home',
    },
  ],
});
```

#### Search Patients

```typescript
async searchPatients(params?: Record<string, string | number | boolean>): Promise<Patient[]>
```

Searches for patients with optional parameters.

```typescript
const patients = await fhirService.searchPatients({
  family: 'Smith',
  birthdate: 'ge1990-01-01',
});
```

### Generic Resource Operations

#### Create Any FHIR Resource

```typescript
async createResource<T extends keyof ResourceTypeMap>(
  resourceType: T,
  resource: ResourceTypeMap[T]
): Promise<ResourceTypeMap[T]>
```

```typescript
// Create a Communication resource
const communication = await fhirService.createResource('Communication', {
  status: 'in-progress',
  subject: { reference: 'Patient/123' },
  payload: [{ contentString: 'Your appointment is tomorrow' }],
});
```

#### Get Any FHIR Resource

```typescript
async getResource<T extends keyof ResourceTypeMap>(
  resourceType: T,
  id: string
): Promise<ResourceTypeMap[T]>
```

```typescript
// Get a Communication resource
const communication = await fhirService.getResource(
  'Communication',
  'comm-123'
);
```

#### Update Any FHIR Resource

```typescript
async updateResource<T extends keyof ResourceTypeMap>(
  resourceType: T,
  id: string,
  updates: Partial<ResourceTypeMap[T]>
): Promise<ResourceTypeMap[T]>
```

```typescript
// Update Communication status
const updated = await fhirService.updateResource('Communication', 'comm-123', {
  status: 'completed',
});
```

#### Delete Any FHIR Resource

```typescript
async deleteResource<T extends keyof ResourceTypeMap>(
  resourceType: T,
  id: string
): Promise<ResourceTypeMap[T]>
```

#### Check Resource Existence

```typescript
async resourceExists<T extends keyof ResourceTypeMap>(
  resourceType: T,
  id: string
): Promise<boolean>
```

### Aidbox-Specific Operations

#### Create Aidbox Resource

```typescript
async createAidboxResource<T extends AidboxResource>(
  resourceType: string,
  resource: T
): Promise<T>
```

```typescript
// Create an AidboxSubscriptionTopic
const subscriptionTopic = await fhirService.createAidboxResource(
  'AidboxSubscriptionTopic',
  {
    status: 'active',
    url: 'http://example.com/subscription/topic',
    trigger: [
      {
        resource: 'Communication',
        supportedInteraction: ['create'],
      },
    ],
  }
);
```

#### Put Aidbox Resource

```typescript
async putAidboxResource<T extends AidboxResource>(
  resourceType: string,
  id: string,
  resource: T
): Promise<T>
```

```typescript
// Create or update an AidboxTopicDestination
const destination = await fhirService.putAidboxResource(
  'AidboxTopicDestination',
  'dest-123',
  {
    kind: 'kafka-at-least-once',
    topic: 'http://example.com/subscription/topic',
    parameter: [
      { name: 'kafkaTopic', valueString: 'fhir.events' },
      { name: 'bootstrapServers', valueString: 'kafka:9092' },
    ],
  }
);
```

### Advanced Operations

#### Get Underlying Client

```typescript
getClient(): Client<BasicAuthorization>
```

Access the underlying Aidbox client for advanced operations.

```typescript
const aidboxClient = fhirService.getClient();
// Use aidboxClient for operations not covered by the wrapper
```

#### Get HTTP Client

```typescript
getHTTPClient();
```

Access the HTTP client for direct API calls.

```typescript
const httpClient = fhirService.getHTTPClient();
const response = await httpClient.get('/metadata');
```

## Healthcare Compliance

### Error Handling

The library implements healthcare-compliant error handling:

```typescript
// ✅ Good: Error messages don't expose patient data
try {
  const patient = await fhirService.getPatient('patient-123');
} catch (error) {
  // Error message: "Failed to retrieve patient resource: Not found"
  // Does NOT include: patient ID, personal information, etc.
}

// ✅ Good: Search errors don't expose search parameters
try {
  const patients = await fhirService.searchPatients({ ssn: '123-45-6789' });
} catch (error) {
  // Error message: "Failed to search patient resources: Server error"
  // Does NOT include: search parameters, SSN, etc.
}
```

### Data Sanitization

All error messages are sanitized to prevent sensitive data leakage:

```typescript
// Internal implementation sanitizes errors
throw new Error(
  `Failed to retrieve patient resource: ${
    error instanceof Error ? error.message : 'Unknown error'
  }`
  // Patient ID and other sensitive data are NOT included
);
```

### Audit Compliance

The library supports audit-compliant logging patterns:

```typescript
// ✅ Log operations without sensitive data
console.log('Patient operation completed successfully');

// ❌ Don't log sensitive data
// console.log(`Patient ${patientId} updated with data:`, patientData);
```

## Usage Examples

### Patient Management Workflow

```typescript
import { FhirService } from '@fhir-mod-demo/fhir-client';

class PatientManager {
  private fhirService: FhirService;

  constructor() {
    this.fhirService = new FhirService({
      baseUrl: `${process.env.AIDBOX_URL!}/fhir`,
      clientId: process.env.FHIR_CLIENT_ID!,
      clientSecret: process.env.FHIR_CLIENT_SECRET!,
    });
  }

  async createPatientWithContact(patientData: Partial<Patient>) {
    // Create patient
    const patient = await this.fhirService.createPatient({
      ...patientData,
      resourceType: 'Patient',
    });

    // Add communication preference
    if (patient.id) {
      await this.fhirService.updatePatient(patient.id, {
        telecom: [
          {
            system: 'sms',
            value: '+1234567890',
            use: 'mobile',
          },
        ],
      });
    }

    return patient;
  }

  async findPatientsForReminders() {
    return await this.fhirService.searchPatients({
      active: true,
      'telecom:missing': false,
    });
  }
}
```

### Communication Resource Management

```typescript
class CommunicationManager {
  private fhirService: FhirService;

  constructor(fhirService: FhirService) {
    this.fhirService = fhirService;
  }

  async createSMSCommunication(patientId: string, message: string) {
    return await this.fhirService.createResource('Communication', {
      status: 'in-progress',
      subject: { reference: `Patient/${patientId}` },
      medium: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/v3-ParticipationMode',
              code: 'WRITTEN',
              display: 'written',
            },
          ],
        },
      ],
      payload: [
        {
          contentString: message,
        },
      ],
    });
  }

  async updateCommunicationStatus(communicationId: string, status: string) {
    return await this.fhirService.updateResource(
      'Communication',
      communicationId,
      {
        status: status as any, // Cast to satisfy FHIR type requirements
      }
    );
  }
}
```

### Subscription Management

```typescript
class SubscriptionManager {
  private fhirService: FhirService;

  constructor(fhirService: FhirService) {
    this.fhirService = fhirService;
  }

  async createCommunicationSubscription(topicName: string, kafkaTopic: string) {
    // Create subscription topic
    const subscriptionTopic = await this.fhirService.createAidboxResource(
      'AidboxSubscriptionTopic',
      {
        id: topicName,
        status: 'active',
        url: `http://aidbox.app/subscriptions/${topicName}`,
        trigger: [
          {
            resource: 'Communication',
            supportedInteraction: ['create', 'update'],
          },
        ],
      }
    );

    // Create topic destination
    const destination = await this.fhirService.createAidboxResource(
      'AidboxTopicDestination',
      {
        kind: 'kafka-at-least-once',
        topic: subscriptionTopic.url,
        parameter: [
          { name: 'kafkaTopic', valueString: kafkaTopic },
          { name: 'bootstrapServers', valueString: 'kafka:9092' },
        ],
      }
    );

    return { subscriptionTopic, destination };
  }
}
```

## Testing

### Running Tests

```bash
# Run library tests
npx nx test fhir-client

# Watch mode
npx nx test fhir-client --watch

# Coverage report
npx nx test fhir-client --coverage
```

### Writing Tests

Example test using the library:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FhirService } from './fhir-service';

// Mock the Aidbox SDK
vi.mock('@aidbox/sdk-r4', () => ({
  Client: vi.fn(() => ({
    resource: {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
      })),
    },
    HTTPClient: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    })),
  })),
}));

describe('FhirService', () => {
  let fhirService: FhirService;

  beforeEach(() => {
    fhirService = new FhirService({
      baseUrl: 'http://test-fhir-server',
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });
  });

  it('should get patient successfully', async () => {
    const mockPatient = {
      resourceType: 'Patient',
      id: 'test-123',
      name: [{ family: 'Test', given: ['Patient'] }],
    };

    const mockClient = fhirService.getClient();
    vi.mocked(mockClient.resource.get).mockResolvedValue(mockPatient);

    const result = await fhirService.getPatient('test-123');

    expect(result).toEqual(mockPatient);
    expect(mockClient.resource.get).toHaveBeenCalledWith('Patient', 'test-123');
  });

  it('should handle errors with healthcare compliance', async () => {
    const mockClient = fhirService.getClient();
    vi.mocked(mockClient.resource.get).mockRejectedValue(
      new Error('Not found')
    );

    await expect(fhirService.getPatient('test-123')).rejects.toThrow(
      'Failed to retrieve patient resource: Not found'
    );
  });
});
```

### Test Coverage

The library maintains comprehensive test coverage:

- Core FHIR operations (CRUD)
- Error handling scenarios
- Healthcare compliance features
- Aidbox-specific operations
- Type safety validations

## Error Handling

### Error Types

The library handles various error scenarios:

```typescript
// Network/connectivity errors
try {
  const patient = await fhirService.getPatient('123');
} catch (error) {
  if (error.message.includes('Failed to retrieve')) {
    // Handle FHIR server errors
  }
}

// Validation errors
try {
  await fhirService.createPatient({} as Patient);
} catch (error) {
  if (error.message.includes('Failed to create')) {
    // Handle validation errors
  }
}

// Authentication errors
try {
  const client = new FhirService({
    baseUrl: 'http://fhir-server',
    clientId: 'invalid',
    clientSecret: 'invalid',
  });
  await client.getPatient('123');
} catch (error) {
  // Handle authentication failures
}
```

### Error Message Patterns

All error messages follow healthcare-compliant patterns:

```typescript
// ✅ Compliant error messages
'Failed to retrieve patient resource: Not found';
'Failed to create Communication resource: Validation error';
'Failed to update AidboxSubscriptionTopic resource: Unauthorized';

// ❌ Non-compliant (what we avoid)
'Patient John Smith (SSN: 123-45-6789) not found';
'Communication for patient-123 failed with data: {...}';
```

## Best Practices

### 1. Configuration Management

```typescript
// ✅ Use environment variables
const fhirService = new FhirService({
  baseUrl: `${process.env.AIDBOX_URL!}/fhir`,
  clientId: process.env.FHIR_CLIENT_ID!,
  clientSecret: process.env.FHIR_CLIENT_SECRET!,
});

// ❌ Don't hardcode credentials
const fhirService = new FhirService({
  baseUrl: 'http://localhost:8081/fhir',
  clientId: 'hardcoded-client',
  clientSecret: 'hardcoded-secret',
});
```

### 2. Error Handling

```typescript
// ✅ Always use try-catch for FHIR operations
try {
  const patient = await fhirService.getPatient(id);
  return patient;
} catch (error) {
  logger.error('Patient retrieval failed', { operation: 'getPatient' });
  throw error; // Re-throw with sanitized message
}

// ❌ Don't ignore errors or log sensitive data
const patient = await fhirService.getPatient(id); // No error handling
logger.error('Failed for patient:', id, patientData); // Exposes sensitive data
```

### 3. Resource Type Safety

```typescript
// ✅ Use generic methods with proper typing
const communication = await fhirService.createResource('Communication', {
  status: 'in-progress',
  subject: { reference: 'Patient/123' },
});

// ✅ Let TypeScript infer types
const patient: Patient = await fhirService.getPatient('123');

// ❌ Don't use any types
const resource: any = await fhirService.getResource('Patient', '123');
```

### 4. Search Operations

```typescript
// ✅ Use specific search parameters
const patients = await fhirService.searchPatients({
  active: true,
  birthdate: 'ge1990-01-01',
});

// ✅ Handle empty results
const results = await fhirService.searchPatients({ family: 'rare-name' });
if (results.length === 0) {
  console.log('No patients found matching criteria');
}
```

### 5. Resource Updates

```typescript
// ✅ Use partial updates
await fhirService.updatePatient('123', {
  telecom: [{ system: 'phone', value: '+1234567890' }],
});

// ✅ Check resource existence before operations
if (await fhirService.resourceExists('Patient', '123')) {
  await fhirService.updatePatient('123', updates);
}
```

---

This library is part of the FHIR Healthcare Communication Platform. For more information about the overall architecture, see the [main project README](../../README.md).
