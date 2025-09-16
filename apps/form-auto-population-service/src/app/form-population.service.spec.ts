import { Test, TestingModule } from '@nestjs/testing';
import { FormPopulationService } from './form-population.service';
import {
  QuestionnaireOutput,
  WegovyOutput,
} from '@form-auto-population/fhir-questionnaire-converter';

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

    it('should create FHIR QuestionnaireResponse from generic questionnaire output', async () => {
      const mockQuestionnaireOutput: QuestionnaireOutput = [
        {
          question_id: 'satisfaction-rating',
          question_text: 'Rate your satisfaction',
          answer: 8,
        },
        {
          question_id: 'comments',
          question_text: 'Additional comments',
          answer: 'Great service',
        },
      ];

      const mockSavedResponse = {
        id: 'questionnaire-response-456',
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
      };

      mockFhirService.createResource.mockResolvedValue(mockSavedResponse);

      const event = {
        formId: 'survey-form',
        patientId: 'patient-456',
        questionnaireOutput: mockQuestionnaireOutput,
        timestamp: '2025-09-15T10:00:00Z',
      };

      const result = await service.createQuestionnaireResponse(event);

      expect(result.id).toBe('questionnaire-response-456');
      expect(mockFhirService.createResource).toHaveBeenCalledWith(
        'QuestionnaireResponse',
        expect.objectContaining({
          resourceType: 'QuestionnaireResponse',
          questionnaire: 'Questionnaire/survey-form',
          item: expect.arrayContaining([
            expect.objectContaining({
              linkId: 'satisfaction-rating',
              answer: [{ valueInteger: 8 }],
            }),
            expect.objectContaining({
              linkId: 'comments',
              answer: [{ valueString: 'Great service' }],
            }),
          ]),
        })
      );
    });

    it('should maintain backward compatibility with wegovyOutput field', async () => {
      const mockWegovyOutput: WegovyOutput = [
        {
          question_id: 'patient-age',
          question_text: 'Patient Age',
          answer: 30,
        },
      ];

      const mockSavedResponse = {
        id: 'questionnaire-response-legacy',
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
      };

      mockFhirService.createResource.mockResolvedValue(mockSavedResponse);

      const event = {
        formId: 'legacy-form',
        patientId: 'patient-legacy',
        wegovyOutput: mockWegovyOutput,
        timestamp: '2025-09-15T10:00:00Z',
      };

      const result = await service.createQuestionnaireResponse(event);

      expect(result.id).toBe('questionnaire-response-legacy');
      expect(mockFhirService.createResource).toHaveBeenCalled();
    });

    it('should prefer questionnaireOutput over wegovyOutput when both are provided', async () => {
      const mockQuestionnaireOutput: QuestionnaireOutput = [
        {
          question_id: 'new-question',
          question_text: 'New Question',
          answer: 'new answer',
        },
      ];

      const mockWegovyOutput: WegovyOutput = [
        {
          question_id: 'old-question',
          question_text: 'Old Question',
          answer: 'old answer',
        },
      ];

      const mockSavedResponse = {
        id: 'questionnaire-response-priority',
        resourceType: 'QuestionnaireResponse',
        status: 'completed',
      };

      mockFhirService.createResource.mockResolvedValue(mockSavedResponse);

      const event = {
        formId: 'priority-form',
        patientId: 'patient-priority',
        questionnaireOutput: mockQuestionnaireOutput,
        wegovyOutput: mockWegovyOutput,
        timestamp: '2025-09-15T10:00:00Z',
      };

      await service.createQuestionnaireResponse(event);

      expect(mockFhirService.createResource).toHaveBeenCalledWith(
        'QuestionnaireResponse',
        expect.objectContaining({
          item: expect.arrayContaining([
            expect.objectContaining({
              linkId: 'new-question',
              answer: [{ valueString: 'new answer' }],
            }),
          ]),
        })
      );
    });

    it('should throw error when no output is provided', async () => {
      const event = {
        formId: 'empty-form',
        patientId: 'patient-empty',
        timestamp: '2025-09-15T10:00:00Z',
      };

      await expect(service.createQuestionnaireResponse(event)).rejects.toThrow(
        'No questionnaire output provided in event'
      );
    });
  });
});
