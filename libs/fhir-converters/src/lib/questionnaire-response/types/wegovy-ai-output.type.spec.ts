/**
 * Unit tests for Wegovy AI Output types and utilities
 */

import {
  isWegovyAiOutput,
  getAnswerAsString,
  getAnswerAsBoolean,
  getAnswerAsNumber,
  getAnswerAsStringArray,
  type WegovyAiOutputItem,
} from './wegovy-ai-output.type';

describe('WegovyAiOutput Types', () => {
  describe('isWegovyAiOutput', () => {
    it('should return true for valid Wegovy AI output', () => {
      const validData = [
        {
          question_id: 'test-id',
          question_text: 'Test Question',
          answer: 'Test Answer',
        },
      ];

      expect(isWegovyAiOutput(validData)).toBe(true);
    });

    it('should return false for non-array data', () => {
      expect(isWegovyAiOutput(null)).toBe(false);
      expect(isWegovyAiOutput({})).toBe(false);
      expect(isWegovyAiOutput('string')).toBe(false);
      expect(isWegovyAiOutput(123)).toBe(false);
    });

    it('should return false for array with invalid items', () => {
      const invalidData = [
        {
          question_id: 'test-id',
          // missing question_text
          answer: 'Test Answer',
        },
      ];

      expect(isWegovyAiOutput(invalidData)).toBe(false);
    });

    it('should return true for different answer types', () => {
      const validData = [
        { question_id: 'string', question_text: 'String', answer: 'text' },
        { question_id: 'number', question_text: 'Number', answer: 42 },
        { question_id: 'boolean', question_text: 'Boolean', answer: true },
        { question_id: 'array', question_text: 'Array', answer: ['a', 'b'] },
      ];

      expect(isWegovyAiOutput(validData)).toBe(true);
    });

    it('should return false for invalid answer types', () => {
      const invalidData = [
        {
          question_id: 'test',
          question_text: 'Test',
          answer: { invalid: 'object' },
        },
      ];

      expect(isWegovyAiOutput(invalidData as any)).toBe(false);
    });
  });

  describe('getAnswerAsString', () => {
    it('should return string answers as-is', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'Hello World',
      };

      expect(getAnswerAsString(item)).toBe('Hello World');
    });

    it('should convert number answers to strings', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 42.5,
      };

      expect(getAnswerAsString(item)).toBe('42.5');
    });

    it('should convert boolean answers to strings', () => {
      const trueItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: true,
      };

      const falseItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: false,
      };

      expect(getAnswerAsString(trueItem)).toBe('true');
      expect(getAnswerAsString(falseItem)).toBe('false');
    });

    it('should join array answers with commas', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: ['Item 1', 'Item 2', 'Item 3'],
      };

      expect(getAnswerAsString(item)).toBe('Item 1, Item 2, Item 3');
    });
  });

  describe('getAnswerAsBoolean', () => {
    it('should return boolean answers as-is', () => {
      const trueItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: true,
      };

      const falseItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: false,
      };

      expect(getAnswerAsBoolean(trueItem)).toBe(true);
      expect(getAnswerAsBoolean(falseItem)).toBe(false);
    });

    it('should convert truthy string values to boolean', () => {
      const testCases = ['true', 'TRUE', 'True', 'yes', 'YES', 'Yes', '1'];
      
      testCases.forEach(value => {
        const item: WegovyAiOutputItem = {
          question_id: 'test',
          question_text: 'Test',
          answer: value,
        };

        expect(getAnswerAsBoolean(item)).toBe(true);
      });
    });

    it('should convert falsy string values to boolean', () => {
      const testCases = ['false', 'FALSE', 'False', 'no', 'NO', 'No', '0'];
      
      testCases.forEach(value => {
        const item: WegovyAiOutputItem = {
          question_id: 'test',
          question_text: 'Test',
          answer: value,
        };

        expect(getAnswerAsBoolean(item)).toBe(false);
      });
    });

    it('should return null for non-boolean convertible values', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'random string',
      };

      expect(getAnswerAsBoolean(item)).toBeNull();
    });

    it('should return null for non-boolean, non-string values', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 42,
      };

      expect(getAnswerAsBoolean(item)).toBeNull();
    });
  });

  describe('getAnswerAsNumber', () => {
    it('should return number answers as-is', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 42.5,
      };

      expect(getAnswerAsNumber(item)).toBe(42.5);
    });

    it('should convert numeric string values to numbers', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: '123.45',
      };

      expect(getAnswerAsNumber(item)).toBe(123.45);
    });

    it('should return null for non-numeric string values', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'not a number',
      };

      expect(getAnswerAsNumber(item)).toBeNull();
    });

    it('should return null for boolean values', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: true,
      };

      expect(getAnswerAsNumber(item)).toBeNull();
    });

    it('should handle edge cases', () => {
      const infinityItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'Infinity',
      };

      const nanItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'NaN',
      };

      expect(getAnswerAsNumber(infinityItem)).toBe(Infinity);
      expect(getAnswerAsNumber(nanItem)).toBeNull(); // NaN is not a valid number
    });
  });

  describe('getAnswerAsStringArray', () => {
    it('should return array answers as-is', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: ['Item 1', 'Item 2', 'Item 3'],
      };

      expect(getAnswerAsStringArray(item)).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should convert single string values to arrays', () => {
      const item: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 'Single Item',
      };

      expect(getAnswerAsStringArray(item)).toEqual(['Single Item']);
    });

    it('should convert other types to string arrays', () => {
      const numberItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: 42,
      };

      const booleanItem: WegovyAiOutputItem = {
        question_id: 'test',
        question_text: 'Test',
        answer: true,
      };

      expect(getAnswerAsStringArray(numberItem)).toEqual(['42']);
      expect(getAnswerAsStringArray(booleanItem)).toEqual(['true']);
    });
  });
});