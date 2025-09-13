import { Test, TestingModule } from '@nestjs/testing';
import { FormPopulationService } from './form-population.service';

describe('FormPopulationService', () => {
  let service: FormPopulationService;
  let mockFhirService: any;

  beforeEach(async () => {
    mockFhirService = {
      getResource: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormPopulationService,
        {
          provide: 'FHIR_SERVICE',
          useValue: mockFhirService,
        },
      ],
    }).compile();

    service = module.get<FormPopulationService>(FormPopulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('populateForm', () => {
    it('should populate basic demographic fields', async () => {
      const mockPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        birthDate: '1990-01-01',
        gender: 'male',
        telecom: [
          { system: 'phone', value: '+1234567890' },
          { system: 'email', value: 'john.doe@example.com' },
        ],
        address: [
          {
            line: ['123 Main St'],
            city: 'Anytown',
            state: 'NY',
            postalCode: '12345',
          },
        ],
      };

      mockFhirService.getResource.mockResolvedValue(mockPatient);

      const event = {
        formId: 'patient-intake',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      const result = await service.populateForm(event);

      expect(result.formId).toBe(event.formId);
      expect(result.patientId).toBe(event.patientId);
      expect(result.populatedFields.patientName).toBe('John Doe');
      expect(result.populatedFields.dateOfBirth).toBe('1990-01-01');
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockFhirService.getResource).toHaveBeenCalledWith(
        'Patient',
        'patient-123'
      );
    });

    it('should not override existing form data', async () => {
      const mockPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        birthDate: '1990-01-01',
      };

      mockFhirService.getResource.mockResolvedValue(mockPatient);

      const event = {
        formId: 'patient-intake',
        patientId: 'patient-123',
        formData: {
          patientName: 'Existing Name',
        },
        timestamp: new Date().toISOString(),
      };

      const result = await service.populateForm(event);

      expect(result.populatedFields.patientName).toBe('Existing Name');
    });

    it('should populate medical fields for medical forms', async () => {
      const mockPatient = {
        id: 'patient-123',
        name: [{ given: ['Jane'], family: 'Smith' }],
        birthDate: '1985-01-01',
        gender: 'female',
      };

      mockFhirService.getResource.mockResolvedValue(mockPatient);

      const event = {
        formId: 'medical-history',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      const result = await service.populateForm(event);

      expect(result.populatedFields.patientName).toBe('Jane Smith');
      expect(result.populatedFields.dateOfBirth).toBe('1985-01-01');
      expect(result.populatedFields.gender).toBe('female');
      // Medical history fields are empty since we don't have AllergyIntolerance resources
      expect(result.populatedFields.allergies).toEqual([]);
    });

    it('should throw error when FHIR service fails', async () => {
      mockFhirService.getResource.mockRejectedValue(
        new Error('FHIR connection failed')
      );

      const event = {
        formId: 'patient-intake',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      await expect(service.populateForm(event)).rejects.toThrow(
        'FHIR connection failed'
      );
    });

    it('should throw error when patient is not found', async () => {
      mockFhirService.getResource.mockResolvedValue(null);

      const event = {
        formId: 'patient-intake',
        patientId: 'nonexistent-patient',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      await expect(service.populateForm(event)).rejects.toThrow(
        'Patient not found: nonexistent-patient'
      );
    });

    it('should throw error when formId is missing', async () => {
      const event = {
        formId: '',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      await expect(service.populateForm(event)).rejects.toThrow(
        'Form ID is required for form population'
      );
    });

    it('should throw error when patientId is missing', async () => {
      const event = {
        formId: 'patient-intake',
        patientId: '',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      await expect(service.populateForm(event)).rejects.toThrow(
        'Patient ID is required for form population'
      );
    });
  });

  describe('validateForm', () => {
    it('should return valid for properly structured form', async () => {
      const event = {
        formId: 'patient-intake',
        patientId: 'patient-123',
        formData: {
          patientName: 'John Doe',
          dateOfBirth: '1990-01-01',
        },
        timestamp: new Date().toISOString(),
      };

      const result = await service.validateForm(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for missing required fields', async () => {
      const event = {
        formId: '',
        patientId: '',
        formData: null,
        timestamp: new Date().toISOString(),
      };

      const result = await service.validateForm(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Form ID is required');
      expect(result.errors).toContain('Patient ID is required');
      expect(result.errors).toContain('Form data must be a valid object');
    });

    it('should validate intake form specific rules', async () => {
      const event = {
        formId: 'patient-intake',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      const result = await service.validateForm(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Patient name is required for intake forms'
      );
      expect(result.errors).toContain(
        'Date of birth is required for intake forms'
      );
    });

    it('should validate contact form specific rules', async () => {
      const event = {
        formId: 'contact-form',
        patientId: 'patient-123',
        formData: {},
        timestamp: new Date().toISOString(),
      };

      const result = await service.validateForm(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'At least one contact method (phone or email) is required'
      );
    });
  });
});
