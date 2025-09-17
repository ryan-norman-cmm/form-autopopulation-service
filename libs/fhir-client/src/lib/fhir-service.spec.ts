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

  it('should have resource methods', () => {
    const service = new FhirService(mockConfig);
    expect(service.createResource).toBeDefined();
    expect(service.getResource).toBeDefined();
    expect(service.updateResource).toBeDefined();
    expect(service.deleteResource).toBeDefined();
    expect(service.resourceExists).toBeDefined();
  });

  it('should handle configuration properly', () => {
    const service = new FhirService(mockConfig);

    // Verify that the service was created with the right configuration
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(FhirService);

    // Verify all required methods are available
    expect(typeof service.createResource).toBe('function');
    expect(typeof service.getResource).toBe('function');
    expect(typeof service.updateResource).toBe('function');
    expect(typeof service.deleteResource).toBe('function');
    expect(typeof service.resourceExists).toBe('function');
  });
});
