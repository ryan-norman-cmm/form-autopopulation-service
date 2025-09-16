/**
 * Generic questionnaire output structure from AI processing
 */
export interface QuestionnaireOutputItem {
  question_id: string;
  question_text: string;
  answer: string | number | boolean | string[];
}

export type QuestionnaireOutput = QuestionnaireOutputItem[];

/**
 * Metadata required for FHIR QuestionnaireResponse
 */
export interface QuestionnaireResponseMetadata {
  formId: string;
  patientId: string;
  timestamp: string;
}

/**
 * FHIR QuestionnaireResponse Answer
 */
export interface FhirAnswer {
  valueString?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueCoding?: {
    system: string;
    code: string;
    display: string;
  };
}

/**
 * FHIR QuestionnaireResponse Item
 */
export interface FhirQuestionnaireResponseItem {
  linkId: string;
  text: string;
  answer: FhirAnswer[];
}

/**
 * FHIR QuestionnaireResponse
 */
export interface FhirQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  status: 'completed';
  questionnaire: string;
  subject: {
    reference: string;
  };
  authored: string;
  item: FhirQuestionnaireResponseItem[];
  meta: {
    profile: string[];
    lastUpdated: string;
  };
}
