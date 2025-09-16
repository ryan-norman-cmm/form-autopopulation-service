import { formatAnswer } from './answer-formatter';

describe('formatAnswer', () => {
  it('should format boolean answers', () => {
    const result = formatAnswer(true);
    expect(result).toEqual([{ valueBoolean: true }]);
  });

  it('should format integer answers', () => {
    const result = formatAnswer(42);
    expect(result).toEqual([{ valueInteger: 42 }]);
  });

  it('should format decimal answers', () => {
    const result = formatAnswer(3.14);
    expect(result).toEqual([{ valueDecimal: 3.14 }]);
  });

  it('should format string array answers', () => {
    const result = formatAnswer(['option1', 'option2']);
    expect(result).toEqual([
      { valueString: 'option1' },
      { valueString: 'option2' },
    ]);
  });

  it('should format regular string answers', () => {
    const result = formatAnswer('Regular text answer');
    expect(result).toEqual([{ valueString: 'Regular text answer' }]);
  });

  it('should auto-detect and format gender values as coding', () => {
    const femaleResult = formatAnswer('Female');
    expect(femaleResult).toEqual([
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: 'female',
          display: 'Female',
        },
      },
    ]);

    const maleResult = formatAnswer('male');
    expect(maleResult).toEqual([
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: 'male',
          display: 'male',
        },
      },
    ]);

    const otherResult = formatAnswer('Other');
    expect(otherResult).toEqual([
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: 'other',
          display: 'Other',
        },
      },
    ]);

    const unknownResult = formatAnswer('Unknown');
    expect(unknownResult).toEqual([
      {
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: 'unknown',
          display: 'Unknown',
        },
      },
    ]);
  });

  it('should not apply gender coding to non-gender string values', () => {
    const result = formatAnswer('Not a gender value');
    expect(result).toEqual([{ valueString: 'Not a gender value' }]);
  });

  it('should handle numeric values passed as strings', () => {
    const result = formatAnswer('123');
    expect(result).toEqual([{ valueString: '123' }]);
  });

  it('should handle empty string', () => {
    const result = formatAnswer('');
    expect(result).toEqual([{ valueString: '' }]);
  });

  it('should handle zero values correctly', () => {
    const integerResult = formatAnswer(0);
    expect(integerResult).toEqual([{ valueInteger: 0 }]);

    const decimalResult = formatAnswer(0.0);
    expect(decimalResult).toEqual([{ valueInteger: 0 }]);
  });

  it('should handle negative numbers', () => {
    const negativeInteger = formatAnswer(-5);
    expect(negativeInteger).toEqual([{ valueInteger: -5 }]);

    const negativeDecimal = formatAnswer(-2.5);
    expect(negativeDecimal).toEqual([{ valueDecimal: -2.5 }]);
  });
});
