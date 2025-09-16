import { formatAnswer } from './answer-formatter';
import {
  QuestionnaireOutput,
  QuestionnaireResponseMetadata,
  FhirQuestionnaireResponse,
  FhirQuestionnaireResponseItem,
} from './types';

/**
 * Convert generic questionnaire AI output to FHIR QuestionnaireResponse format
 * Supports any questionnaire type, not just Wegovy-specific outputs
 */
export function convertToQuestionnaireResponse(
  questionnaireOutput: QuestionnaireOutput,
  metadata: QuestionnaireResponseMetadata
): FhirQuestionnaireResponse {
  const items: FhirQuestionnaireResponseItem[] = questionnaireOutput.map(
    (item) => ({
      linkId: item.question_id,
      text: item.question_text,
      answer: formatAnswer(item.answer),
    })
  );

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
