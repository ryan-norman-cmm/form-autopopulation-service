/**
 * FHIR QuestionnaireResponse type definitions
 * Re-exports from Aidbox SDK with additional type helpers
 */

import type { QuestionnaireResponse } from '@aidbox/sdk-r4/types';

// Re-export the main type
export type { QuestionnaireResponse } from '@aidbox/sdk-r4/types';

/**
 * Helper type for creating QuestionnaireResponse items
 */
export interface QuestionnaireResponseItemInput {
  linkId: string;
  text?: string;
  answer?: QuestionnaireResponseAnswerInput[];
  item?: QuestionnaireResponseItemInput[];
}

export interface QuestionnaireResponseAnswerInput {
  valueBoolean?: boolean;
  valueDecimal?: number;
  valueInteger?: number;
  valueString?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueCoding?: {
    system?: string;
    code?: string;
    display?: string;
  };
}

/**
 * Helper interface for creating complete QuestionnaireResponse
 */
export interface QuestionnaireResponseInput {
  id?: string;
  meta?: {
    profile?: string[];
    lastUpdated?: string;
    versionId?: string;
  };
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  questionnaire?: string;
  subject?: {
    reference: string;
    display?: string;
  };
  encounter?: {
    reference: string;
  };
  authored?: string;
  author?: {
    reference: string;
    display?: string;
  };
  source?: {
    reference: string;
    display?: string;
  };
  item?: QuestionnaireResponseItemInput[];
}

/**
 * Helper function to create a basic QuestionnaireResponse structure
 */
export function createQuestionnaireResponseBase(
  questionnaireId: string,
  patientId: string,
  status: QuestionnaireResponseInput['status'] = 'completed'
): QuestionnaireResponseInput {
  return {
    status,
    questionnaire: `Questionnaire/${questionnaireId}`,
    subject: {
      reference: `Patient/${patientId}`,
    },
    authored: new Date().toISOString(),
    item: [],
  };
}