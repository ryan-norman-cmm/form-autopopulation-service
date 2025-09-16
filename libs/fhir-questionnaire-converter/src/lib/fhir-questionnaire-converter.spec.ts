import { convertToQuestionnaireResponse } from './fhir-questionnaire-converter';
import { QuestionnaireOutput, QuestionnaireResponseMetadata, WegovyOutput } from './types';

describe('convertToQuestionnaireResponse', () => {
  const mockMetadata: QuestionnaireResponseMetadata = {
    formId: 'test-form-123',
    patientId: 'patient-456',
    timestamp: '2025-09-13T10:00:00Z',
  };

  it('should convert basic questionnaire output to FHIR format', () => {
    const questionnaireOutput: QuestionnaireOutput = [
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

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.resourceType).toBe('QuestionnaireResponse');
    expect(result.status).toBe('completed');
    expect(result.questionnaire).toBe('Questionnaire/test-form-123');
    expect(result.subject.reference).toBe('Patient/patient-456');
    expect(result.authored).toBe('2025-09-13T10:00:00Z');
    expect(result.item).toHaveLength(2);
  });

  it('should handle integer answers', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'patient-age',
        question_text: 'Patient Age',
        answer: 45,
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueInteger: 45 }]);
  });

  it('should handle decimal answers', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'current-bmi',
        question_text: 'Current BMI',
        answer: 32.5,
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueDecimal: 32.5 }]);
  });

  it('should handle boolean answers', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'bmi-criteria',
        question_text: 'BMI meets criteria',
        answer: true,
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueBoolean: true }]);
  });

  it('should handle string array answers', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'weight-related-comorbidities',
        question_text: 'Weight-related comorbidities',
        answer: ['Type 2 diabetes mellitus', 'Hypertension'],
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([
      { valueString: 'Type 2 diabetes mellitus' },
      { valueString: 'Hypertension' },
    ]);
  });

  it('should handle gender with coding', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'patient-gender',
        question_text: 'Patient Gender',
        answer: 'Female',
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: 'female',
          display: 'Female',
        },
      },
    ]);
  });

  it('should handle string answers', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'prescriber-name',
        question_text: 'Prescriber Name',
        answer: 'Dr. Sarah Johnson',
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([
      { valueString: 'Dr. Sarah Johnson' },
    ]);
  });

  it('should include proper FHIR metadata', () => {
    const questionnaireOutput: QuestionnaireOutput = [
      {
        question_id: 'test-question',
        question_text: 'Test Question',
        answer: 'test answer',
      },
    ];

    const result = convertToQuestionnaireResponse(questionnaireOutput, mockMetadata);

    expect(result.meta.profile).toEqual([
      'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse',
    ]);
    expect(result.meta.lastUpdated).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it('should maintain backward compatibility with WegovyOutput type', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'patient-age',
        question_text: 'Patient Age',
        answer: 45,
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.resourceType).toBe('QuestionnaireResponse');
    expect(result.item).toHaveLength(1);
    expect(result.item[0].linkId).toBe('patient-age');
  });

  it('should handle generic survey questionnaire', () => {
    const surveyOutput: QuestionnaireOutput = [
      {
        question_id: 'satisfaction-rating',
        question_text: 'Rate your satisfaction',
        answer: 8,
      },
      {
        question_id: 'feedback-comments',
        question_text: 'Additional comments',
        answer: 'Service was excellent',
      },
      {
        question_id: 'recommend-to-friend',
        question_text: 'Would you recommend to a friend?',
        answer: true,
      },
    ];

    const result = convertToQuestionnaireResponse(surveyOutput, mockMetadata);

    expect(result.item).toHaveLength(3);
    expect(result.item[0].answer).toEqual([{ valueInteger: 8 }]);
    expect(result.item[1].answer).toEqual([{ valueString: 'Service was excellent' }]);
    expect(result.item[2].answer).toEqual([{ valueBoolean: true }]);
  });

  it('should handle mental health assessment questionnaire', () => {
    const mentalHealthOutput: QuestionnaireOutput = [
      {
        question_id: 'anxiety-level',
        question_text: 'Anxiety level (1-10)',
        answer: 6,
      },
      {
        question_id: 'sleep-quality',
        question_text: 'How would you rate your sleep quality?',
        answer: 'Poor',
      },
      {
        question_id: 'symptoms',
        question_text: 'Which symptoms have you experienced?',
        answer: ['Difficulty concentrating', 'Restlessness', 'Fatigue'],
      },
    ];

    const result = convertToQuestionnaireResponse(mentalHealthOutput, mockMetadata);

    expect(result.item).toHaveLength(3);
    expect(result.item[0].answer).toEqual([{ valueInteger: 6 }]);
    expect(result.item[1].answer).toEqual([{ valueString: 'Poor' }]);
    expect(result.item[2].answer).toHaveLength(3);
    expect(result.item[2].answer[0]).toEqual({ valueString: 'Difficulty concentrating' });
  });
});
