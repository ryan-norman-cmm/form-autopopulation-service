/**
 * Wegovy AI Output to FHIR QuestionnaireResponse Converter
 * 
 * Converts AI-generated Wegovy prior authorization responses to FHIR R4 QuestionnaireResponse format
 */

import type { QuestionnaireResponse } from '@aidbox/sdk-r4/types';
import {
  type WegovyAiOutput,
  type WegovyAiOutputItem,
  getAnswerAsString,
  getAnswerAsBoolean,
  getAnswerAsNumber,
  getAnswerAsStringArray,
} from './types/wegovy-ai-output.type';
import {
  type QuestionnaireResponseInput,
  type QuestionnaireResponseItemInput,
  type QuestionnaireResponseAnswerInput,
  createQuestionnaireResponseBase,
} from './types/questionnaire-response.type';

/**
 * Configuration for Wegovy questionnaire conversion
 */
const WEGOVY_QUESTIONNAIRE_ID = 'wegovy-prior-auth';

/**
 * Mapping of question IDs to their expected answer types based on the Wegovy questionnaire
 */
const QUESTION_TYPE_MAP: Record<string, 'boolean' | 'decimal' | 'integer' | 'string' | 'choice' | 'text'> = {
  // Patient Demographics
  'patient-age': 'integer',
  'patient-gender': 'choice',
  
  // Clinical Eligibility Criteria
  'current-bmi': 'decimal',
  'bmi-criteria': 'boolean',
  'weight-related-comorbidities': 'choice', // repeats: true
  'baseline-weight': 'decimal',
  
  // Contraindications and Safety Assessment
  'pregnancy-status': 'boolean',
  'breastfeeding-status': 'boolean',
  'personal-medullary-thyroid-cancer': 'boolean',
  'family-medullary-thyroid-cancer': 'boolean',
  'multiple-endocrine-neoplasia-syndrome': 'boolean',
  'pancreatitis-history': 'boolean',
  'diabetic-retinopathy': 'boolean',
  'gallbladder-disease': 'boolean',
  'kidney-disease': 'boolean',
  
  // Previous Weight Management Attempts
  'lifestyle-interventions': 'boolean',
  'lifestyle-intervention-details': 'text',
  'previous-weight-loss-medications': 'choice', // repeats: true
  'previous-medication-response': 'choice',
  
  // Prescriber Information
  'prescriber-specialty': 'string',
  'prescriber-name': 'string',
  'prescriber-npi': 'string',
  
  // Treatment Plan
  'requested-dose': 'choice',
  'duration-of-therapy': 'choice',
  'monitoring-plan': 'text',
  
  // Supporting Documentation
  'recent-labs': 'boolean',
  'consultation-notes': 'boolean',
  'additional-clinical-notes': 'text',
  
  // Prescriber Attestation
  'medical-necessity': 'boolean',
  'attestation-date': 'string',
};

/**
 * SNOMED CT and RxNorm coding mappings for choice questions
 */
const CHOICE_MAPPINGS: Record<string, Record<string, { system: string; code: string; display: string }>> = {
  'patient-gender': {
    'Male': { system: 'http://hl7.org/fhir/administrative-gender', code: 'male', display: 'Male' },
    'Female': { system: 'http://hl7.org/fhir/administrative-gender', code: 'female', display: 'Female' },
    'Other': { system: 'http://hl7.org/fhir/administrative-gender', code: 'other', display: 'Other' },
  },
  'weight-related-comorbidities': {
    'Type 2 diabetes mellitus': { system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 diabetes mellitus' },
    'Hypertension': { system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertension' },
    'Hypercholesterolemia': { system: 'http://snomed.info/sct', code: '13644009', display: 'Hypercholesterolemia' },
    'Sleep apnea': { system: 'http://snomed.info/sct', code: '73430006', display: 'Sleep apnea' },
    'Anemia': { system: 'http://snomed.info/sct', code: '271737000', display: 'Anemia' },
    'History of myocardial infarction': { system: 'http://snomed.info/sct', code: '399211009', display: 'History of myocardial infarction' },
    'Stroke': { system: 'http://snomed.info/sct', code: '230690007', display: 'Stroke' },
  },
  'previous-weight-loss-medications': {
    'Orlistat': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '37925', display: 'Orlistat' },
    'Phentermine/Topiramate': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1551467', display: 'Phentermine/Topiramate' },
    'Naltrexone/Bupropion': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1551393', display: 'Naltrexone/Bupropion' },
    'Liraglutide': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1658717', display: 'Liraglutide' },
  },
  'requested-dose': {
    'Semaglutide 0.25 mg/0.5 mL prefilled pen': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '2599543', display: 'Semaglutide 0.25 mg/0.5 mL prefilled pen' },
    'Semaglutide 0.5 mg/0.5 mL prefilled pen': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '2599549', display: 'Semaglutide 0.5 mg/0.5 mL prefilled pen' },
    'Semaglutide 1 mg/0.5 mL prefilled pen': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '2599555', display: 'Semaglutide 1 mg/0.5 mL prefilled pen' },
    'Semaglutide 1.7 mg/0.75 mL prefilled pen': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '2599561', display: 'Semaglutide 1.7 mg/0.75 mL prefilled pen' },
    'Semaglutide 2.4 mg/0.75 mL prefilled pen': { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '2599567', display: 'Semaglutide 2.4 mg/0.75 mL prefilled pen' },
  },
};

/**
 * Convert a single Wegovy AI output item to FHIR QuestionnaireResponse item
 */
function convertWegovyItemToFhir(item: WegovyAiOutputItem): QuestionnaireResponseItemInput {
  const questionType = QUESTION_TYPE_MAP[item.question_id] || 'string';
  const fhirItem: QuestionnaireResponseItemInput = {
    linkId: item.question_id,
    text: item.question_text,
  };

  // Handle different answer types
  const answers: QuestionnaireResponseAnswerInput[] = [];

  switch (questionType) {
    case 'boolean': {
      const boolValue = getAnswerAsBoolean(item);
      if (boolValue !== null) {
        answers.push({ valueBoolean: boolValue });
      }
      break;
    }

    case 'decimal': {
      const numberValue = getAnswerAsNumber(item);
      if (numberValue !== null) {
        answers.push({ valueDecimal: numberValue });
      }
      break;
    }

    case 'integer': {
      const numberValue = getAnswerAsNumber(item);
      if (numberValue !== null) {
        answers.push({ valueInteger: Math.round(numberValue) });
      }
      break;
    }

    case 'choice': {
      const choiceValues = getAnswerAsStringArray(item);
      const choiceMapping = CHOICE_MAPPINGS[item.question_id];
      
      choiceValues.forEach(value => {
        if (choiceMapping && choiceMapping[value]) {
          const coding = choiceMapping[value];
          answers.push({
            valueCoding: coding,
          });
        } else {
          // Fallback to string value if no mapping found
          answers.push({ valueString: value });
        }
      });
      break;
    }

    case 'text':
    case 'string':
    default: {
      const stringValue = getAnswerAsString(item);
      if (stringValue) {
        answers.push({ valueString: stringValue });
      }
      break;
    }
  }

  if (answers.length > 0) {
    fhirItem.answer = answers;
  }

  return fhirItem;
}

/**
 * Convert Wegovy AI output to FHIR QuestionnaireResponse
 */
export function convertWegovyToQuestionnaireResponse(
  wegovyOutput: WegovyAiOutput,
  patientId: string,
  options: {
    questionnaireId?: string;
    status?: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
    authorId?: string;
    encounterId?: string;
  } = {}
): QuestionnaireResponse {
  const {
    questionnaireId = WEGOVY_QUESTIONNAIRE_ID,
    status = 'completed',
    authorId,
    encounterId,
  } = options;

  // Create base QuestionnaireResponse
  const response = createQuestionnaireResponseBase(questionnaireId, patientId, status);

  // Add optional references
  if (authorId) {
    response.author = {
      reference: `Practitioner/${authorId}`,
    };
  }

  if (encounterId) {
    response.encounter = {
      reference: `Encounter/${encounterId}`,
    };
  }

  // Convert all Wegovy items to FHIR items
  response.item = wegovyOutput.map(item => convertWegovyItemToFhir(item));

  // Add metadata
  response.meta = {
    profile: ['http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse'],
    lastUpdated: new Date().toISOString(),
  };

  // Ensure resourceType is set
  const result = {
    resourceType: 'QuestionnaireResponse' as const,
    ...response,
  };

  return result as QuestionnaireResponse;
}

/**
 * Validate Wegovy AI output before conversion
 */
export function validateWegovyOutput(wegovyOutput: WegovyAiOutput): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(wegovyOutput)) {
    errors.push('Wegovy output must be an array');
    return { isValid: false, errors };
  }

  if (wegovyOutput.length === 0) {
    errors.push('Wegovy output cannot be empty');
    return { isValid: false, errors };
  }

  // Check for required fields
  const requiredQuestions = [
    'patient-age',
    'patient-gender',
    'current-bmi',
    'bmi-criteria',
    'medical-necessity',
    'attestation-date',
  ];

  const presentQuestionIds = new Set(wegovyOutput.map(item => item.question_id));
  const missingRequired = requiredQuestions.filter(id => !presentQuestionIds.has(id));

  if (missingRequired.length > 0) {
    errors.push(`Missing required questions: ${missingRequired.join(', ')}`);
  }

  // Validate individual items
  wegovyOutput.forEach((item, index) => {
    if (!item.question_id) {
      errors.push(`Item ${index}: missing question_id`);
    }
    if (!item.question_text) {
      errors.push(`Item ${index}: missing question_text`);
    }
    if (item.answer === undefined || item.answer === null) {
      errors.push(`Item ${index}: missing answer`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}