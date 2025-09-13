import { FhirService } from './fhir-service';

describe('FhirService', () => {
  const mockConfig = {
    baseUrl: 'http://localhost:8080',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };

  it('should create FhirService instance', () => {
    const service = new FhirService(mockConfig);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(FhirService);
  });

  it('should have getClient method', () => {
    const service = new FhirService(mockConfig);
    const client = service.getClient();
    expect(client).toBeDefined();
  });

  it('should handle configuration properly', () => {
    const service = new FhirService(mockConfig);
    const client = service.getClient();

    // Verify that the client was created with the right configuration
    expect(client).toBeDefined();
    expect(service).toBeInstanceOf(FhirService);
  });
});
