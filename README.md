# Form Auto-Population Service

A NestJS microservice for automated form population using FHIR patient data, built with Kafka event-driven architecture and Aidbox FHIR server integration.

## Features

- 🏥 **FHIR Integration** - Patient data from Aidbox FHIR server
- 📋 **Form Auto-Population** - Intelligent field population based on patient data
- ✅ **Form Validation** - Comprehensive form validation with custom rules
- 📨 **Event-Driven Architecture** - Kafka microservices for scalable processing
- 🔍 **Health Monitoring** - Multi-service health checks
- 🧪 **Comprehensive Testing** - Vitest test suite with 100% service coverage

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Clients  │    │  Kafka Events   │    │  FHIR Server    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Form Auto-Population Service                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ REST Controller │  │ Kafka Consumer  │  │ FHIR Client     │ │
│  │ - Form Templates│  │ - Population    │  │ - Patient Data  │ │
│  │ - Validation    │  │ - Validation    │  │ - Resource CRUD │ │
│  │ - Population    │  │ - Events        │  │ - Subscriptions │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Database     │    │     Kafka       │    │    Aidbox       │
│   (Forms Data)  │    │ (Event Stream)  │    │ (FHIR Server)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Aidbox license key (free dev license available)

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Aidbox license key:
# AIDBOX_LICENSE_KEY=your_aidbox_dev_license_key_here
```

**Getting Aidbox License (Required)**:

1. Sign up at [https://aidbox.app/ui/portal#/signup](https://aidbox.app/ui/portal#/signup)
2. Verify email and complete profile
3. Go to Licenses → New license → Dev → Self-Hosted → Create
4. Copy the license key to your `.env` file

### 3. Start Infrastructure

```bash
# Start Kafka, Aidbox, databases, and supporting services
docker compose up -d

# Verify services are healthy
docker compose ps
```

### 4. Install Dependencies & Start Service

```bash
# Install dependencies
npm install

# Start the form auto-population service
npx nx serve form-auto-population-service
```

## Service Endpoints

### HTTP API

- **Service**: http://localhost:3000/api
- **Health**: http://localhost:3000/health
- **Form Population**: POST http://localhost:3000/api/forms/populate
- **Form Validation**: POST http://localhost:3000/api/forms/validate
- **Form Templates**: GET http://localhost:3000/api/forms/:formId/template

### Infrastructure Services

- **Aidbox FHIR Server**: http://localhost:8081
- **Healthcare Events Service**: http://localhost:3002
- **Kafdrop (Kafka UI)**: http://localhost:19001
- **pgAdmin**: http://localhost:5050

### Database Ports

- **Forms Database**: localhost:5435 (forms_user/forms_password)
- **Aidbox Database**: localhost:5434 (aidbox/qawcX9QCjB)

## Development

### Available Commands

```bash
# Development
npx nx serve form-auto-population-service    # Start form service
docker compose up fhir-server-operator       # Start FHIR server operator
npx nx build form-auto-population-service    # Build form service
npx nx build fhir-client                     # Build FHIR client library
npx nx test form-auto-population-service     # Run form service tests
npx nx test fhir-client                      # Run FHIR client tests

# Infrastructure
docker compose up -d                        # Start all services
docker compose down                         # Stop all services
docker compose logs -f                      # View all logs
```

### API Usage Examples

#### Form Population Request

```bash
curl -X POST http://localhost:3000/api/forms/populate \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "patient-intake",
    "patientId": "patient-123",
    "formData": {}
  }'
```

#### Form Validation Request

```bash
curl -X POST http://localhost:3000/api/forms/validate \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "patient-intake",
    "patientId": "patient-123",
    "formData": {
      "patientName": "John Doe",
      "dateOfBirth": "1990-01-01"
    }
  }'
```

## Kafka Event Processing

The service listens for these Kafka topics:

- **`form.population.requested`** - Triggers automatic form population
- **`form.validation.requested`** - Triggers form validation
- **`form.populated`** - Form population completion events

## Configuration

Key environment variables in `.env`:

- **`AIDBOX_LICENSE_KEY`** - Required Aidbox license
- **`KAFKA_BOOTSTRAP_SERVERS`** - Kafka connection (default: localhost:9094)
- **`AIDBOX_URL`** - FHIR server URL (default: http://localhost:8081)
- **`PORT`** - Service port (default: 3000)

## Troubleshooting

### Common Issues

1. **Aidbox won't start**: Verify your `AIDBOX_LICENSE_KEY` is valid
2. **Kafka connection errors**: Ensure Kafka is healthy with `docker compose ps`
3. **Service won't connect**: Check `.env` configuration matches Docker networking

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Check infrastructure status
docker compose ps
```
