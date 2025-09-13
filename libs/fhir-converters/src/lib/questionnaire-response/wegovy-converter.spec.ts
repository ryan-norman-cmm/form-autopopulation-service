/**
 * Unit tests for Wegovy to FHIR QuestionnaireResponse converter
 */

import { convertWegovyToQuestionnaireResponse, validateWegovyOutput } from './wegovy-converter';
import type { WegovyAiOutput } from './types/wegovy-ai-output.type';

describe('WegovyConverter', () => {
  // Sample Wegovy AI output based on the fixture
  const sampleWegovyOutput: WegovyAiOutput = [
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
    {
      question_id: 'current-bmi',
      question_text: 'Current BMI (kg/m²)',
      answer: 32.5,
    },
    {
      question_id: 'bmi-criteria',
      question_text: 'BMI meets criteria (≥30 kg/m² OR ≥27 kg/m² with weight-related comorbidity)?',
      answer: true,
    },
    {
      question_id: 'weight-related-comorbidities',
      question_text: 'Weight-related comorbidities (select all that apply)',
      answer: ['Type 2 diabetes mellitus', 'Hypertension'],
    },
    {
      question_id: 'pregnancy-status',
      question_text: 'Is the patient pregnant or planning to become pregnant?',
      answer: false,
    },
    {
      question_id: 'lifestyle-intervention-details',
      question_text: 'Describe lifestyle interventions attempted',
      answer: 'Patient participated in supervised diet program with nutritionist for 8 months.',
    },
    {
      question_id: 'medical-necessity',
      question_text: 'I attest that Wegovy is medically necessary for this patient',
      answer: true,
    },
    {
      question_id: 'attestation-date',
      question_text: 'Date of attestation',
      answer: '2025-09-13',
    },
  ];

  const patientId = 'test-patient-123';

  describe('convertWegovyToQuestionnaireResponse', () => {
    it('should convert basic Wegovy output to FHIR QuestionnaireResponse', () => {
      const result = convertWegovyToQuestionnaireResponse(sampleWegovyOutput, patientId);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('QuestionnaireResponse');
      expect(result.status).toBe('completed');
      expect(result.questionnaire).toBe('Questionnaire/wegovy-prior-auth');
      expect(result.subject?.reference).toBe('Patient/test-patient-123');
      expect(result.authored).toBeDefined();
      expect(result.item).toHaveLength(sampleWegovyOutput.length);
    });

    it('should handle different answer types correctly', () => {
      const result = convertWegovyToQuestionnaireResponse(sampleWegovyOutput, patientId);

      // Find specific items to test
      const ageItem = result.item?.find(item => item.linkId === 'patient-age');
      const genderItem = result.item?.find(item => item.linkId === 'patient-gender');
      const bmiItem = result.item?.find(item => item.linkId === 'current-bmi');
      const bmiCriteriaItem = result.item?.find(item => item.linkId === 'bmi-criteria');
      const comorbiditiesItem = result.item?.find(item => item.linkId === 'weight-related-comorbidities');

      // Test integer conversion
      expect(ageItem?.answer?.[0].valueInteger).toBe(45);

      // Test choice with coding
      expect(genderItem?.answer?.[0].valueCoding).toEqual({
        system: 'http://hl7.org/fhir/administrative-gender',
        code: 'female',
        display: 'Female',
      });

      // Test decimal conversion
      expect(bmiItem?.answer?.[0].valueDecimal).toBe(32.5);

      // Test boolean conversion
      expect(bmiCriteriaItem?.answer?.[0].valueBoolean).toBe(true);

      // Test array of choices with SNOMED codes
      expect(comorbiditiesItem?.answer).toHaveLength(2);
      expect(comorbiditiesItem?.answer?.[0].valueCoding).toEqual({
        system: 'http://snomed.info/sct',
        code: '44054006',
        display: 'Type 2 diabetes mellitus',
      });
      expect(comorbiditiesItem?.answer?.[1].valueCoding).toEqual({
        system: 'http://snomed.info/sct',
        code: '38341003',
        display: 'Hypertension',
      });
    });

    it('should include proper metadata', () => {
      const result = convertWegovyToQuestionnaireResponse(sampleWegovyOutput, patientId);

      expect(result.meta).toBeDefined();
      expect(result.meta?.profile).toContain('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse');
      expect(result.meta?.lastUpdated).toBeDefined();
    });

    it('should handle optional parameters', () => {
      const result = convertWegovyToQuestionnaireResponse(sampleWegovyOutput, patientId, {
        questionnaireId: 'custom-questionnaire',
        status: 'in-progress',
        authorId: 'practitioner-123',
        encounterId: 'encounter-456',
      });

      expect(result.questionnaire).toBe('Questionnaire/custom-questionnaire');
      expect(result.status).toBe('in-progress');
      expect(result.author?.reference).toBe('Practitioner/practitioner-123');
      expect(result.encounter?.reference).toBe('Encounter/encounter-456');
    });

    it('should handle text answers correctly', () => {
      const result = convertWegovyToQuestionnaireResponse(sampleWegovyOutput, patientId);
      
      const textItem = result.item?.find(item => item.linkId === 'lifestyle-intervention-details');
      expect(textItem?.answer?.[0].valueString).toBe('Patient participated in supervised diet program with nutritionist for 8 months.');
    });

    it('should handle unknown choice values as strings', () => {
      const customOutput: WegovyAiOutput = [
        {
          question_id: 'patient-gender',
          question_text: 'Patient Gender',
          answer: 'Unknown Gender Value',
        },
      ];

      const result = convertWegovyToQuestionnaireResponse(customOutput, patientId);
      const genderItem = result.item?.find(item => item.linkId === 'patient-gender');
      
      expect(genderItem?.answer?.[0].valueString).toBe('Unknown Gender Value');
    });

    it('should handle empty answers gracefully', () => {
      const emptyAnswerOutput: WegovyAiOutput = [
        {
          question_id: 'patient-age',
          question_text: 'Patient Age',
          answer: '',
        },
      ];

      const result = convertWegovyToQuestionnaireResponse(emptyAnswerOutput, patientId);
      const ageItem = result.item?.find(item => item.linkId === 'patient-age');
      
      // Empty string should not create an answer
      expect(ageItem?.answer).toBeUndefined();
    });
  });

  describe('validateWegovyOutput', () => {
    it('should validate correct Wegovy output', () => {
      const result = validateWegovyOutput(sampleWegovyOutput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required questions', () => {
      const incompleteOutput: WegovyAiOutput = [
        {
          question_id: 'patient-age',
          question_text: 'Patient Age',
          answer: 45,
        },
      ];

      const result = validateWegovyOutput(incompleteOutput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required questions: patient-gender, current-bmi, bmi-criteria, medical-necessity, attestation-date');
    });

    it('should detect invalid input types', () => {
      const result = validateWegovyOutput(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Wegovy output must be an array');
    });

    it('should detect empty arrays', () => {
      const result = validateWegovyOutput([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Wegovy output cannot be empty');
    });

    it('should detect missing item properties', () => {
      const invalidOutput: WegovyAiOutput = [
        {
          question_id: '',
          question_text: '',
          answer: undefined as any,
        },
      ];

      const result = validateWegovyOutput(invalidOutput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 0: missing question_id');
      expect(result.errors).toContain('Item 0: missing question_text');
      expect(result.errors).toContain('Item 0: missing answer');
    });

    it('should validate all required questions are present', () => {
      const minimalValidOutput: WegovyAiOutput = [
        { question_id: 'patient-age', question_text: 'Age', answer: 45 },
        { question_id: 'patient-gender', question_text: 'Gender', answer: 'Female' },
        { question_id: 'current-bmi', question_text: 'BMI', answer: 32.5 },
        { question_id: 'bmi-criteria', question_text: 'Criteria', answer: true },
        { question_id: 'medical-necessity', question_text: 'Necessary', answer: true },
        { question_id: 'attestation-date', question_text: 'Date', answer: '2025-09-13' },
      ];

      const result = validateWegovyOutput(minimalValidOutput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});