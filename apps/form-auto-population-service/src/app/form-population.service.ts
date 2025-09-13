import { Injectable, Logger, Inject } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';

interface FormPopulationCompletedEvent {
  formId: string;
  patientId: string;
  wegovyOutput: Array<{
    question_id: string;
    question_text: string;
    answer: string | number | boolean | string[];
  }>;
  timestamp: string;
}

@Injectable()
export class FormPopulationService {
  private readonly logger = new Logger(FormPopulationService.name);

  constructor(
    @Inject('FHIR_SERVICE') private readonly fhirService: FhirService
  ) {}

  /**
   * Create FHIR QuestionnaireResponse from Wegovy AI output
   */
  async createQuestionnaireResponse(event: FormPopulationCompletedEvent): Promise<any> {
    this.logger.log(
      `Creating QuestionnaireResponse for form: ${event.formId}, patient: ${event.patientId}`
    );

    // Convert Wegovy AI output to FHIR QuestionnaireResponse
    const questionnaireResponse = this.convertWegovyOutputToFhir(event);

    try {
      // Save to FHIR server
      const savedResponse = await this.fhirService.createResource(
        'QuestionnaireResponse',
        questionnaireResponse
      );

      this.logger.log(
        `Successfully created QuestionnaireResponse with ID: ${savedResponse.id}`
      );

      return savedResponse;
    } catch (error) {
      this.logger.error(
        `Failed to create QuestionnaireResponse: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Convert Wegovy AI output to FHIR QuestionnaireResponse format
   */
  private convertWegovyOutputToFhir(event: FormPopulationCompletedEvent): any {
    const items = event.wegovyOutput.map(item => ({
      linkId: item.question_id,
      text: item.question_text,
      answer: this.formatAnswer(item.answer, item.question_id)
    }));

    return {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      questionnaire: `Questionnaire/${event.formId}`,
      subject: {
        reference: `Patient/${event.patientId}`
      },
      authored: event.timestamp,
      item: items,
      meta: {
        profile: ['http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaireresponse'],
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Format answer based on question type and content
   */
  private formatAnswer(answer: string | number | boolean | string[], questionId: string): any[] {
    if (Array.isArray(answer)) {
      return answer.map(item => ({ valueString: item }));
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
      return [{
        valueCoding: {
          system: 'http://hl7.org/fhir/administrative-gender',
          code: genderCode,
          display: answer.toString()
        }
      }];
    }

    // Default to string
    return [{ valueString: answer.toString() }];
  }
}
