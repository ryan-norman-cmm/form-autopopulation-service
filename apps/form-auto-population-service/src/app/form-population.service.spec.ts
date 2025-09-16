import { Test, TestingModule } from '@nestjs/testing';
import { FormPopulationService } from './form-population.service';
import { QuestionnaireOutput } from '@form-auto-population/fhir-questionnaire-converter';

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
    it('should throw error when FHIR service fails', async () => {
      const mockQuestionnaireOutput: QuestionnaireOutput = [
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
        questionnaireOutput: mockQuestionnaireOutput,
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
