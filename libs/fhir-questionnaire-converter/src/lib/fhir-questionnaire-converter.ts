import { formatAnswer } from './answer-formatter';
import {
  WegovyOutput,
  QuestionnaireResponseMetadata,
  FhirQuestionnaireResponse,
  FhirQuestionnaireResponseItem,
} from './types';

/**
 * Convert Wegovy AI output to FHIR QuestionnaireResponse format
 */
export function convertToQuestionnaireResponse(
  wegovyOutput: WegovyOutput,
  metadata: QuestionnaireResponseMetadata
): FhirQuestionnaireResponse {
  const items: FhirQuestionnaireResponseItem[] = wegovyOutput.map((item) => ({
    linkId: item.question_id,
    text: item.question_text,
    answer: formatAnswer(item.answer, item.question_id),
  }));

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: `Questionnaire/${metadata.formId}`,
    subject: {
      reference: `Patient/${metadata.patientId}`,
    },
    authored: metadata.timestamp,
    item: items,
    meta: {
      profile: [
        'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse',
      ],
      lastUpdated: new Date().toISOString(),
    },
  };
}
