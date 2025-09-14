import { convertToQuestionnaireResponse } from './fhir-questionnaire-converter';
import { WegovyOutput, QuestionnaireResponseMetadata } from './types';

describe('convertToQuestionnaireResponse', () => {
  const mockMetadata: QuestionnaireResponseMetadata = {
    formId: 'test-form-123',
    patientId: 'patient-456',
    timestamp: '2025-09-13T10:00:00Z',
  };

  it('should convert basic wegovy output to FHIR format', () => {
    const wegovyOutput: WegovyOutput = [
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

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.resourceType).toBe('QuestionnaireResponse');
    expect(result.status).toBe('completed');
    expect(result.questionnaire).toBe('Questionnaire/test-form-123');
    expect(result.subject.reference).toBe('Patient/patient-456');
    expect(result.authored).toBe('2025-09-13T10:00:00Z');
    expect(result.item).toHaveLength(2);
  });

  it('should handle integer answers', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'patient-age',
        question_text: 'Patient Age',
        answer: 45,
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueInteger: 45 }]);
  });

  it('should handle decimal answers', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'current-bmi',
        question_text: 'Current BMI',
        answer: 32.5,
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueDecimal: 32.5 }]);
  });

  it('should handle boolean answers', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'bmi-criteria',
        question_text: 'BMI meets criteria',
        answer: true,
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueBoolean: true }]);
  });

  it('should handle string array answers', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'weight-related-comorbidities',
        question_text: 'Weight-related comorbidities',
        answer: ['Type 2 diabetes mellitus', 'Hypertension'],
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([
      { valueString: 'Type 2 diabetes mellitus' },
      { valueString: 'Hypertension' },
    ]);
  });

  it('should handle gender with coding', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'patient-gender',
        question_text: 'Patient Gender',
        answer: 'Female',
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

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
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'prescriber-name',
        question_text: 'Prescriber Name',
        answer: 'Dr. Sarah Johnson',
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.item[0].answer).toEqual([{ valueString: 'Dr. Sarah Johnson' }]);
  });

  it('should include proper FHIR metadata', () => {
    const wegovyOutput: WegovyOutput = [
      {
        question_id: 'test-question',
        question_text: 'Test Question',
        answer: 'test answer',
      },
    ];

    const result = convertToQuestionnaireResponse(wegovyOutput, mockMetadata);

    expect(result.meta.profile).toEqual([
      'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse',
    ]);
    expect(result.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
