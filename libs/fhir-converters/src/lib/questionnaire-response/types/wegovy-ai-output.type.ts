/**
 * Type definitions for Wegovy AI Output
 * Represents the structure of AI-generated form responses for Wegovy prior authorization
 */

export interface WegovyAiOutputItem {
  question_id: string;
  question_text: string;
  answer: string | number | boolean | string[];
}

export type WegovyAiOutput = WegovyAiOutputItem[];

/**
 * Type guards for Wegovy AI Output validation
 */
export function isWegovyAiOutput(data: unknown): data is WegovyAiOutput {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every(item => 
    typeof item === 'object' &&
    item !== null &&
    'question_id' in item &&
    'question_text' in item &&
    'answer' in item &&
    typeof item.question_id === 'string' &&
    typeof item.question_text === 'string' &&
    (
      typeof item.answer === 'string' ||
      typeof item.answer === 'number' ||
      typeof item.answer === 'boolean' ||
      (Array.isArray(item.answer) && item.answer.every((a: unknown) => typeof a === 'string'))
    )
  );
}

/**
 * Helper function to get answer value as specific type
 */
export function getAnswerAsString(item: WegovyAiOutputItem): string {
  if (typeof item.answer === 'string') {
    return item.answer;
  }
  if (Array.isArray(item.answer)) {
    return item.answer.join(', ');
  }
  return String(item.answer);
}

export function getAnswerAsBoolean(item: WegovyAiOutputItem): boolean | null {
  if (typeof item.answer === 'boolean') {
    return item.answer;
  }
  if (typeof item.answer === 'string') {
    const lower = item.answer.toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0') return false;
  }
  return null;
}

export function getAnswerAsNumber(item: WegovyAiOutputItem): number | null {
  if (typeof item.answer === 'number') {
    return item.answer;
  }
  if (typeof item.answer === 'string') {
    const parsed = parseFloat(item.answer);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function getAnswerAsStringArray(item: WegovyAiOutputItem): string[] {
  if (Array.isArray(item.answer)) {
    return item.answer;
  }
  return [getAnswerAsString(item)];
}