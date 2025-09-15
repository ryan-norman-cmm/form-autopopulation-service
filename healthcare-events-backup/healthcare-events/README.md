# Healthcare Events Service

A NestJS microservice that manages FHIR subscriptions and maintains synchronization between FHIR server subscriptions and Kafka topics. This service does **not** publish events directly - instead, it ensures that FHIR subscriptions are properly configured to automatically route events to Kafka via Aidbox's native Kafka integration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [FHIR Resources](#fhir-resources)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Docker](#docker)
- [Troubleshooting](#troubleshooting)

## Overview

The Healthcare Events Service acts as the subscription synchronization manager between FHIR-compliant healthcare data and Kafka event streaming. It automatically creates and manages FHIR subscriptions that monitor healthcare resource changes (like Communication, Patient, or other clinical resources), ensuring that Aidbox's native Kafka integration properly routes these events to designated Kafka topics.

### What This Service Does

- **FHIR Subscription Management**: Automatically creates and maintains FHIR subscription resources (AidboxSubscriptionTopic and AidboxTopicDestination)
- **Subscription Synchronization**: Ensures FHIR server subscriptions stay in sync with configured Kafka topics
- **Healthcare Compliance**: Implements healthcare-grade error handling and audit logging
- **Configuration-Driven**: Uses YAML configuration for flexible subscription definitions
- **Container-Ready**: Seamlessly integrates with Docker Compose healthcare stacks
- **Docker Compose Configuration**: Supports inline YAML subscription definitions via Docker Compose configs

### Role in Healthcare Platform

- Ensures FHIR subscriptions are properly configured for Communication resource event routing
- Maintains synchronization between FHIR server capabilities and Kafka topic configuration
- Provides a declarative approach to subscription management via configuration files
- Enables consistent subscription setup across development, staging, and production environments

### Important: Event Publishing Architecture

**This service does NOT publish events directly to Kafka.** Instead, it configures Aidbox FHIR server subscriptions that leverage Aidbox's built-in Kafka integration to automatically publish events when FHIR resources change. The event publishing flow is:

1. **Healthcare Events Service** → Creates FHIR subscriptions (AidboxSubscriptionTopic + AidboxTopicDestination)
2. **Aidbox FHIR Server** → Monitors resource changes and publishes events to Kafka automatically
3. **Downstream Services** → Consume events from Kafka topics for processing

## Features

### FHIR Integration

- **FHIR R4 Compliant**: Follows HL7 FHIR R4 specifications for healthcare interoperability
- **Aidbox Integration**: Works with Aidbox FHIR server for subscription management
- **Resource Monitoring**: Supports monitoring of any FHIR resource type
- **Event Filtering**: Configurable FHIRPath criteria for selective event publishing

### Subscription Synchronization

- **Aidbox Integration**: Configures Aidbox's native Kafka integration for event publishing
- **Reliable Setup**: Ensures FHIR subscriptions are properly configured and maintained
- **Topic Mapping**: Maps FHIR resource types and interactions to appropriate Kafka topics
- **Configuration Validation**: Validates subscription configurations before applying them

### Operations

- **Automated Initialization**: Creates FHIR subscriptions automatically on startup
- **Health Monitoring**: Comprehensive health checks for FHIR and Kafka connectivity
- **Graceful Shutdown**: Properly cleans up resources during service shutdown
- **Error Recovery**: Robust error handling with automatic retry mechanisms

### Healthcare-Specific Features

- **Audit Logging**: Complete audit trail for all healthcare event processing
- **Data Sanitization**: Healthcare-compliant error handling that protects patient privacy
- **Compliance Ready**: Designed for HIPAA and other healthcare regulatory requirements
- **Security**: Secure credential management and encrypted communications

## Technology Stack

### Backend Framework

- **[NestJS](https://nestjs.com/)**: Progressive Node.js framework with dependency injection
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development with strict mode
- **[Node.js](https://nodejs.org/)**: Runtime environment optimized for healthcare applications

### Healthcare Standards

- **[FHIR R4](https://www.hl7.org/fhir/)**: Healthcare interoperability standard
- **[Aidbox](https://aidbox.app/)**: FHIR-compliant healthcare data platform
- **[HL7](https://www.hl7.org/)**: Health Level Seven International standards

### Event Streaming

- **[Apache Kafka](https://kafka.apache.org/)**: Distributed event streaming platform
- **[KafkaJS](https://kafka.js.org/)**: Modern Kafka client for Node.js

### Development Tools

- **[Jest](https://jestjs.io/)**: Testing framework with mocking capabilities
- **[Nx](https://nx.dev/)**: Monorepo management and build optimization
- **[ESLint](https://eslint.org/)**: Code quality and style enforcement

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Aidbox FHIR server running and accessible
- Apache Kafka broker running
- (Optional) Docker for containerized development

### Quick Start

1. **Install Dependencies**

   ```bash
   # From project root
   npm install
   ```

2. **Infrastructure Setup**

   ```bash
   # Start required infrastructure via Docker Compose
   docker compose -f docker-compose.full.yml up aidbox kafka postgres-aidbox -d

   # Verify FHIR server is ready
   curl http://localhost:8081/health

   # Verify Kafka is ready
   docker compose logs kafka
   ```

3. **Configuration**

   ```bash
   # Copy environment template
   cp .env.example .env

   # Configure FHIR connection (required)
   FHIR_CLIENT_ID=root
   FHIR_CLIENT_SECRET=97QvlvxWLx

   # Configure Kafka connection (required)
   KAFKA_BROKERS=localhost:9094

   # Set configuration path
   FHIR_SUBSCRIPTIONS_CONFIG_PATH=config/fhir-subscriptions.yml
   ```

4. **Start Development Server**

   ```bash
   # Start the Healthcare Events service (port 3002)
   npx nx serve healthcare-events
   ```

5. **Verify Setup**

   ```bash
   # Test health endpoint
   curl http://localhost:3002/

   # Check FHIR subscription creation logs
   docker compose logs healthcare-events | grep "Created subscription"

   # Verify Kafka topics were created (via Aidbox)
   kafkacat -b localhost:9094 -L

   # Important: Events are published by Aidbox, not this service
   # Test event publishing by creating a Communication resource
   curl -X POST http://localhost:8081/fhir/Communication \
     -H "Content-Type: application/json" \
     -u root:your_secret \
     -d '{"resourceType": "Communication", "status": "in-progress"}'

   # Check for events in Kafka (published by Aidbox)
   kafkacat -b localhost:9094 -t communication.created -C
   ```

## Development

### Available Commands

```bash
# Development server
npx nx serve healthcare-events           # Port 3002

# Build commands
npx nx build healthcare-events           # Production build
npm run start                           # Run built application

# Testing
npx nx test healthcare-events            # Run Jest unit tests
npx nx test healthcare-events --watch    # Watch mode
npx nx test healthcare-events --coverage # Coverage report

# Quality checks
npx nx lint healthcare-events            # ESLint validation
npx nx typecheck healthcare-events       # TypeScript checking

# Configuration validation
npx nx test healthcare-events --testNamePattern="config"
```

### Development Workflow

1. **Start Infrastructure**

   ```bash
   # Start FHIR server and Kafka
   docker compose -f docker-compose.full.yml up aidbox kafka postgres-aidbox -d

   # Wait for services to be ready
   curl --retry 10 --retry-delay 5 http://localhost:8081/health
   ```

2. **Configure Subscriptions**

   ```yaml
   # Edit config/fhir-subscriptions.yml
   subscriptions:
     - resourceType: Communication
       topicName: communication-created
       supportedInteractions:
         - create
       description: 'Communication creation events for SMS workflow'
   ```

3. **Start Development Server**

   ```bash
   npx nx serve healthcare-events
   ```

4. **Test Event Publishing (Via Aidbox)**

   ```bash
   # Create a test Communication resource via FHIR API
   # Note: Aidbox will automatically publish the event to Kafka
   curl -X POST http://localhost:8081/fhir/Communication \
     -H "Content-Type: application/json" \
     -u root:97QvlvxWLx \
     -d '{"resourceType": "Communication", "status": "in-progress"}'

   # Check Kafka for published event (published by Aidbox, not healthcare-events)
   kafkacat -b localhost:9094 -t communication.created -C

   # Check healthcare-events logs to see subscription management
   docker compose logs healthcare-events
   ```

## Project Structure

```
apps/healthcare-events/
├── src/
│   ├── app/                                    # Application logic
│   │   ├── subscription-manager/               # Core subscription management
│   │   │   ├── interfaces/                     # TypeScript interfaces
│   │   │   │   └── subscription-config.interface.ts # Subscription config types
│   │   │   ├── subscription-manager.module.ts  # Subscription manager module
│   │   │   └── subscription-manager.service.ts # Core subscription logic
│   │   ├── app.controller.ts                   # Health check endpoints
│   │   ├── app.module.ts                       # Main application module
│   │   └── app.service.ts                      # Application service
│   ├── assets/                                 # Static assets
│   └── main.ts                                 # Application entry point
├── config/                                     # Configuration files
│   └── fhir-subscriptions.yml                 # FHIR subscription definitions
├── Dockerfile                                  # Docker container definition
├── jest.config.ts                             # Jest test configuration
├── project.json                               # Nx project configuration
├── tsconfig.app.json                          # TypeScript configuration
├── tsconfig.spec.json                         # Test TypeScript configuration
└── README.md                                  # This file
```

### Key Files Explained

- **`subscription-manager.service.ts`**: Core service that creates and manages FHIR subscriptions
- **`subscription-config.interface.ts`**: TypeScript interfaces for subscription configuration
- **`app.controller.ts`**: Health check endpoints and service monitoring
- **`config/fhir-subscriptions.yml`**: Configuration file defining which FHIR resources to monitor

## Key Concepts

### FHIR Subscriptions (For Healthcare Context)

**FHIR Subscriptions** allow real-time monitoring of healthcare resource changes:

- **Resource Monitoring**: Watch for changes to specific FHIR resource types (Patient, Communication, etc.)
- **Event Triggers**: Respond to create, update, or delete operations
- **Filter Criteria**: Use FHIRPath expressions to filter which events to process
- **Delivery Mechanisms**: Route events to various destinations (Kafka, webhooks, etc.)

### Aidbox Subscription Resources

**Aidbox** extends FHIR subscriptions with additional capabilities:

- **AidboxSubscriptionTopic**: Defines what healthcare events to monitor
- **AidboxTopicDestination**: Configures where to send events (Kafka integration)
- **Real-time Processing**: Immediate event delivery without polling
- **Scalable Architecture**: Designed for high-volume healthcare environments

### Event-Driven Healthcare Architecture

This service enables modern healthcare architectures through proper subscription setup:

- **Decoupling**: FHIR servers handle event publishing via native Kafka integration
- **Scalability**: Multiple services can consume events from the same Kafka topics
- **Reliability**: Aidbox ensures events are not lost during FHIR resource operations
- **Compliance**: Audit trails and healthcare-specific error handling in subscription management

### Configuration-Driven Design

The service uses YAML configuration for flexibility:

- **Resource Types**: Monitor any FHIR resource (Communication, Patient, Observation, etc.)
- **Interaction Types**: Choose which operations to monitor (create, update, delete)
- **Topic Routing**: Configure which Kafka topics receive events
- **Filtering**: Use FHIRPath expressions for selective event processing

## FHIR Resources

### Subscription Configuration Schema

```yaml
subscriptions:
  - resourceType: string # FHIR resource type to monitor
    topicName: string # Unique identifier for subscription
    supportedInteractions: # Array of FHIR interactions
      - create # Monitor resource creation
      - update # Monitor resource updates
      - delete # Monitor resource deletion
    description: string # Human-readable description
    kafkaTopic: string # Target Kafka topic (optional)
    fhirPathCriteria: string # FHIRPath filter expression (optional)
```

### Created FHIR Resources

#### AidboxSubscriptionTopic

Defines what healthcare events to monitor:

```json
{
  "resourceType": "AidboxSubscriptionTopic",
  "id": "communication-created",
  "status": "active",
  "url": "http://aidbox.app/subscriptions/communication-created",
  "description": "Communication creation events for SMS workflow",
  "trigger": [
    {
      "resource": "Communication",
      "supportedInteraction": ["create"]
    }
  ]
}
```

#### AidboxTopicDestination

Routes events to Kafka:

```json
{
  "resourceType": "AidboxTopicDestination",
  "kind": "kafka-at-least-once",
  "topic": "http://aidbox.app/subscriptions/communication-created",
  "parameter": [
    { "name": "kafkaTopic", "valueString": "communication.created" },
    { "name": "bootstrapServers", "valueString": "kafka:9092" }
  ]
}
```

### Event Message Format

Published Kafka events follow this structure:

```json
{
  "eventType": "communication.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "resourceType": "Communication",
  "resourceId": "Communication/12345",
  "resource": {
    "resourceType": "Communication",
    "id": "12345",
    "status": "in-progress",
    "subject": {
      "reference": "Patient/67890"
    },
    "payload": [
      {
        "contentString": "Your appointment is tomorrow at 2 PM"
      }
    ]
  },
  "metadata": {
    "subscriptionId": "communication-created",
    "source": "healthcare-events-service",
    "version": "1.0"
  }
}
```

## Configuration

### Environment Variables

**Required Configuration:**

```bash
# FHIR Server (required)
FHIR_CLIENT_ID=root
FHIR_CLIENT_SECRET=secure_secret

# Kafka (required)
KAFKA_BROKERS=localhost:9094

# Configuration (required)
FHIR_SUBSCRIPTIONS_CONFIG_PATH=config/fhir-subscriptions.yml

# Application
NODE_ENV=development
PORT=3002
```

### Subscription Examples

#### SMS Communication Workflow

Monitor Communication resources for SMS processing:

```yaml
subscriptions:
  - resourceType: Communication
    topicName: sms-communication-events
    supportedInteractions: [create, update]
    description: 'SMS communication lifecycle events'
    kafkaTopic: 'healthcare.sms.events'
    fhirPathCriteria: "medium.coding.where(system='http://terminology.hl7.org/CodeSystem/v3-ParticipationMode' and code='WRITTEN').exists()"
```

#### Patient Updates

Track patient demographic changes:

```yaml
subscriptions:
  - resourceType: Patient
    topicName: patient-updates
    supportedInteractions: [create, update]
    description: 'Patient demographic and status changes'
    kafkaTopic: 'healthcare.patient.events'
```

#### Clinical Document Workflow

Monitor document creation for processing:

```yaml
subscriptions:
  - resourceType: DocumentReference
    topicName: document-workflow
    supportedInteractions: [create]
    description: 'New clinical documents for processing'
    kafkaTopic: 'healthcare.documents.events'
```

### Advanced Configuration

#### FHIRPath Filtering

Use FHIRPath expressions to filter events:

```yaml
subscriptions:
  - resourceType: Communication
    topicName: urgent-communications
    supportedInteractions: [create]
    description: 'Urgent patient communications'
    fhirPathCriteria: "priority = 'urgent'"
```

#### Multiple Kafka Topics

Route different events to different topics:

```yaml
subscriptions:
  - resourceType: Communication
    topicName: sms-events
    supportedInteractions: [create]
    kafkaTopic: 'sms.outbound'
    fhirPathCriteria: "medium.coding.code = 'SMS'"

  - resourceType: Communication
    topicName: email-events
    supportedInteractions: [create]
    kafkaTopic: 'email.outbound'
    fhirPathCriteria: "medium.coding.code = 'EMAIL'"
```

## API Reference

### Health Check Endpoints

#### Service Health

```http
GET /
```

Returns basic service health status.

**Response:**

```json
{
  "status": "ok",
  "message": "Healthcare Events Service is running"
}
```

#### Detailed Health

```http
GET /health
```

Returns comprehensive health information including FHIR and Kafka connectivity.

**Response:**

```json
{
  "status": "ok",
  "info": {
    "fhir": { "status": "up", "url": "http://localhost:8081/fhir" },
    "kafka": { "status": "up", "brokers": ["localhost:9094"] }
  },
  "subscriptions": {
    "created": 2,
    "active": 2,
    "topics": ["communication-created", "communication-updated"]
  },
  "lastInitialized": "2024-01-01T00:00:00.000Z"
}
```

### Management Endpoints

#### Subscription Status

```http
GET /subscriptions
```

Lists all created FHIR subscriptions and their status.

**Response:**

```json
{
  "subscriptions": [
    {
      "id": "communication-created",
      "resourceType": "Communication",
      "status": "active",
      "kafkaTopic": "communication.created",
      "eventsProcessed": 1247,
      "lastEvent": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Reinitialize Subscriptions

```http
POST /subscriptions/reinitialize
```

Recreates all FHIR subscriptions (useful for configuration changes).

**Response:**

```json
{
  "success": true,
  "message": "Subscriptions reinitialized successfully",
  "created": 2,
  "updated": 0,
  "errors": []
}
```

## Testing

### Testing Strategy

The service includes comprehensive testing:

1. **Unit Tests**: Individual service methods and business logic
2. **Integration Tests**: FHIR server and Kafka integration
3. **Configuration Tests**: Subscription configuration validation
4. **Mock Tests**: External service mocking for development

### Running Tests

```bash
# Run all tests
npx nx test healthcare-events

# Watch mode for development
npx nx test healthcare-events --watch

# Coverage report
npx nx test healthcare-events --coverage

# Integration tests only
npx nx test healthcare-events --testNamePattern="integration"

# Configuration validation tests
npx nx test healthcare-events --testNamePattern="config"
```

### Writing Tests

Example subscription management test:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionManagerService } from './subscription-manager.service';
import { FhirClientService } from '@fhir-mod-demo/fhir-client';

describe('SubscriptionManagerService', () => {
  let service: SubscriptionManagerService;
  let mockFhirClient: jest.Mocked<FhirClientService>;

  beforeEach(async () => {
    mockFhirClient = {
      create: jest.fn(),
      read: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionManagerService, { provide: FhirClientService, useValue: mockFhirClient }],
    }).compile();

    service = module.get<SubscriptionManagerService>(SubscriptionManagerService);
  });

  it('should create FHIR subscription successfully', async () => {
    const subscriptionConfig = {
      resourceType: 'Communication',
      topicName: 'test-topic',
      supportedInteractions: ['create'],
      description: 'Test subscription',
    };

    mockFhirClient.create.mockResolvedValue({
      resourceType: 'AidboxSubscriptionTopic',
      id: 'test-topic',
      status: 'active',
    });

    const result = await service.createSubscription(subscriptionConfig);

    expect(result.success).toBe(true);
    expect(mockFhirClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'AidboxSubscriptionTopic',
      })
    );
  });
});
```

### Mocking External Services

Tests mock FHIR and Kafka services:

```typescript
const mockFhirClient = {
  create: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
};

const mockKafkaAdmin = {
  createTopics: jest.fn(),
  listTopics: jest.fn(),
};

// Use in test setup
jest.mock('@fhir-mod-demo/fhir-client', () => ({
  FhirClientService: jest.fn(() => mockFhirClient),
}));
```

## Docker

### Development Container

```bash
# Build development image
docker build -f apps/healthcare-events/Dockerfile --target development -t healthcare-events:dev .

# Run with environment variables
docker run --rm -p 3002:3002 --env-file .env healthcare-events:dev

# View logs
docker logs healthcare-events-container
```

### Docker Compose Integration

The service integrates seamlessly with the platform's Docker Compose setup:

```bash
# Start healthcare events service with dependencies
docker compose -f docker-compose.full.yml up healthcare-events -d

# View service logs
docker compose logs -f healthcare-events

# Check subscription creation
docker compose logs healthcare-events | grep "Created subscription"
```

### Docker Compose Configuration

The healthcare-events service supports two methods for subscription configuration in Docker Compose environments:

#### Method 1: Inline YAML Configuration (Historical Feature)

**Note:** This feature was available in earlier versions but has been replaced by external file mounting in the current setup. Here's how it worked:

```yaml
configs:
  fhir-subscriptions:
    content: |
      subscriptions:
        - resourceType: Communication
          topicName: communication-created
          supportedInteractions:
            - create
          description: "Communication creation events for SMS workflow"
          kafkaTopic: "communication.created"

        - resourceType: Communication
          topicName: communication-updated
          supportedInteractions:
            - update
          description: "Communication update events for SMS workflow"
          kafkaTopic: "communication.created"

services:
  healthcare-events:
    configs:
      - source: fhir-subscriptions
        target: /app/config/fhir-subscriptions.yml
        mode: 0444
```

This approach allowed defining subscriptions directly in the Docker Compose file, making it easy to customize subscriptions per environment without external files.

#### Method 2: External Configuration File (Current)

The current implementation mounts configuration from the host filesystem:

```yaml
services:
  healthcare-events:
    volumes:
      - ./config/fhir-subscriptions.yml:/app/config/fhir-subscriptions.yml:ro
    environment:
      - FHIR_SUBSCRIPTIONS_CONFIG_PATH=/app/config/fhir-subscriptions.yml
```

**Current configuration file (`config/fhir-subscriptions.yml`):**

```yaml
subscriptions:
  - resourceType: Communication
    topicName: communication.created
    supportedInteractions:
      - create
    description: 'Communication creation events for SMS workflow'

  - resourceType: Communication
    topicName: communication.updated
    supportedInteractions:
      - update
    description: 'Communication update events for SMS workflow'
```

#### Configuration Method Comparison

| Feature      | Inline YAML (Historical)                                                                                | External File (Current)                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Pros**     | Self-contained in docker-compose.yml<br>Easy environment customization<br>No external file dependencies | Version controlled configuration<br>Easier to edit and validate<br>Supports complex YAML structures |
| **Cons**     | YAML escaping in docker-compose<br>Limited editor support<br>Harder to version control                  | Requires external file<br>Must exist before container start                                         |
| **Use Case** | Quick development setups<br>Environment-specific configs                                                | Production deployments<br>Complex subscription configurations                                       |

#### Restoring Inline Configuration

To restore the inline configuration approach, modify `docker-compose.full.yml`:

```yaml
configs:
  fhir-subscriptions:
    content: |
      subscriptions:
        - resourceType: Communication
          topicName: communication.created
          supportedInteractions: [create]
          description: "Communication creation events"
        - resourceType: Communication
          topicName: communication.updated
          supportedInteractions: [update]
          description: "Communication update events"

services:
  healthcare-events:
    # Remove volume mount:
    # volumes:
    #   - ./config/fhir-subscriptions.yml:/app/config/fhir-subscriptions.yml:ro

    # Add config mount:
    configs:
      - source: fhir-subscriptions
        target: /app/config/fhir-subscriptions.yml
        mode: 0444
```

## Troubleshooting

### Common Issues

**Service won't start - FHIR server not ready**

```bash
# Check FHIR server health
curl http://localhost:8081/health

# Verify FHIR credentials
curl -u root:97QvlvxWLx http://localhost:8081/fhir/metadata

# Check Docker Compose dependency order
docker compose -f docker-compose.full.yml ps
```

**Configuration not loading**

```bash
# Verify config file exists in container
docker exec -it healthcare-events cat /app/config/fhir-subscriptions.yml

# Check file permissions
docker exec -it healthcare-events ls -la /app/config/

# Validate YAML syntax
npx js-yaml config/fhir-subscriptions.yml
```

**FHIR subscriptions not created**

```bash
# Check FHIR server logs for subscription creation
docker compose logs aidbox | grep -i subscription

# Verify credentials are correct
curl -u $FHIR_CLIENT_ID:$FHIR_CLIENT_SECRET http://localhost:8081/fhir/AidboxSubscriptionTopic

# Check service logs for authentication errors
docker compose logs healthcare-events | grep -i "401\|403\|unauthorized"
```

**Kafka connection issues**

```bash
# Verify Kafka broker accessibility from container
docker compose exec healthcare-events nc -zv kafka 9092

# Check Kafka topic creation
docker compose exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Monitor Kafka logs
docker compose logs kafka | grep -i topic
```

**Events not being published**

```bash
# Test FHIR resource creation
curl -X POST http://localhost:8081/fhir/Communication \
  -H "Content-Type: application/json" \
  -u root:97QvlvxWLx \
  -d '{"resourceType": "Communication", "status": "in-progress"}'

# Monitor Kafka messages
kafkacat -b localhost:9094 -t communication.created -C

# Check Aidbox subscription logs
curl -u root:97QvlvxWLx http://localhost:8081/fhir/AidboxSubscriptionTopic
```

### Performance Issues

**High memory usage**

- Review subscription configuration for overly broad filters
- Monitor FHIR server resource usage
- Consider subscription batching for high-volume environments

**Event processing delays**

- Check Kafka broker performance and partition configuration
- Review network connectivity between services
- Monitor FHIR server response times

### Production Considerations

**Security**

- Use Docker secrets for FHIR credentials
- Implement network segmentation for healthcare data
- Enable audit logging for all FHIR operations
- Use TLS/SSL for all external communications

**Reliability**

- Configure health checks for container orchestration
- Implement proper backup and recovery procedures
- Set up monitoring and alerting for subscription failures
- Use persistent volumes for configuration data

**Compliance**

- Ensure audit trails meet healthcare regulatory requirements
- Implement data retention policies
- Configure appropriate access controls
- Regular security assessments and updates

## Contributing

### Development Guidelines

1. **Healthcare Compliance**: Ensure all changes maintain HIPAA compliance
2. **FHIR Standards**: Follow FHIR R4 specifications for all resource operations
3. **Error Handling**: Implement healthcare-appropriate error sanitization
4. **Testing**: Write comprehensive tests including integration with FHIR servers
5. **Documentation**: Update configuration examples and troubleshooting guides

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes following healthcare and FHIR best practices
3. Add tests for new subscription types or configuration options
4. Test with real FHIR server and Kafka integration
5. Run quality checks: `lint`, `typecheck`, `test`, `build`
6. Update documentation for new configuration options
7. Submit pull request with healthcare impact assessment

---

For more information about the overall platform architecture, see the [main project README](../../README.md).
