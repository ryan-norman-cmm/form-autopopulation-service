import { FhirAnswer } from './types';

/**
 * Format answer based on question type and content
 */
export function formatAnswer(
  answer: string | number | boolean | string[],
  questionId: string
): FhirAnswer[] {
  if (Array.isArray(answer)) {
    return answer.map((item: string) => ({ valueString: item }));
  }

  if (typeof answer === 'boolean') {
    return [{ valueBoolean: answer }];
  }

  if (typeof answer === 'number') {
    // Check if it should be integer or decimal
    if (questionId === 'patient-age' || Number.isInteger(answer)) {
      return [{ valueInteger: answer }];
    } else {
      return [{ valueDecimal: answer }];
    }
  }

  // Handle special coded values for gender
  if (questionId === 'patient-gender') {
    const genderCode = answer.toString().toLowerCase();
    return [
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: genderCode,
          display: answer.toString(),
        },
      },
    ];
  }

  // Default to string
  return [{ valueString: answer.toString() }];
}
