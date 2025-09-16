import { FhirAnswer } from './types';

/**
 * Format answer based on the data type of the answer value
 * Provides generic FHIR answer formatting without question-specific logic
 */
export function formatAnswer(
  answer: string | number | boolean | string[]
): FhirAnswer[] {
  if (Array.isArray(answer)) {
    return answer.map((item: string) => ({ valueString: item }));
  }

  if (typeof answer === 'boolean') {
    return [{ valueBoolean: answer }];
  }

  if (typeof answer === 'number') {
    // Use integer for whole numbers, decimal for fractional numbers
    if (Number.isInteger(answer)) {
      return [{ valueInteger: answer }];
    } else {
      return [{ valueDecimal: answer }];
    }
  }

  // Handle potential coded values for common patterns
  const stringAnswer = answer.toString();
  const lowerAnswer = stringAnswer.toLowerCase();

  // Auto-detect gender values and format as coding
  if (['male', 'female', 'other', 'unknown'].includes(lowerAnswer)) {
    return [
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: lowerAnswer,
          display: stringAnswer,
        },
      },
    ];
  }

  // Default to string for all other values
  return [{ valueString: stringAnswer }];
}
