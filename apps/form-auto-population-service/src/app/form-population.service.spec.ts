import { Test, TestingModule } from '@nestjs/testing';
import { FormPopulationService } from './form-population.service';
import { WegovyOutput } from '@form-auto-population/fhir-questionnaire-converter';

describe('FormPopulationService', () => {
  let service: FormPopulationService;
  let mockFhirService: {
    createResource: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockFhirService = {
      createResource: vi.fn(),
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

  describe('createQuestionnaireResponse', () => {
    it('should create FHIR QuestionnaireResponse from Wegovy output', async () => {
      const mockWegovyOutput: WegovyOutput = [
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
      ];

      const mockSavedResponse = {
        id: 'questionnaire-response-123',
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
      };

      mockFhirService.createResource.mockResolvedValue(mockSavedResponse);

      const event = {
        formId: 'test-form',
        patientId: 'patient-123',
        wegovyOutput: mockWegovyOutput,
        timestamp: '2025-09-13T10:00:00Z',
      };

      const result = await service.createQuestionnaireResponse(event);

      expect(result.id).toBe('questionnaire-response-123');
      expect(mockFhirService.createResource).toHaveBeenCalledWith(
        'QuestionnaireResponse',
        expect.objectContaining({
          resourceType: 'QuestionnaireResponse',
          status: 'completed',
          questionnaire: 'Questionnaire/test-form',
          subject: {
            reference: 'Patient/patient-123',
          },
          authored: '2025-09-13T10:00:00Z',
          item: expect.arrayContaining([
            expect.objectContaining({
              linkId: 'patient-age',
              text: 'Patient Age',
              answer: [{ valueInteger: 45 }],
            }),
            expect.objectContaining({
              linkId: 'patient-gender',
              text: 'Patient Gender',
              answer: [
                {
                  valueCoding: {
                    system: 'http://hl7.org/fhir/administrative-gender',
                    code: 'female',
                    display: 'Female',
                  },
                },
              ],
            }),
          ]),
        })
      );
    });

    it('should throw error when FHIR service fails', async () => {
      const mockWegovyOutput: WegovyOutput = [
        {
          question_id: 'test-question',
          question_text: 'Test Question',
          answer: 'test answer',
        },
      ];

      mockFhirService.createResource.mockRejectedValue(
        new Error('FHIR server error')
      );

      const event = {
        formId: 'test-form',
        patientId: 'patient-123',
        wegovyOutput: mockWegovyOutput,
        timestamp: '2025-09-13T10:00:00Z',
      };

      await expect(service.createQuestionnaireResponse(event)).rejects.toThrow(
        'FHIR server error'
      );
    });
  });
});
