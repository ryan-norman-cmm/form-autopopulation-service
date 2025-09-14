import { Injectable, Logger, Inject } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';
import {
  convertToQuestionnaireResponse,
  WegovyOutput,
  QuestionnaireResponseMetadata,
} from '@form-auto-population/fhir-questionnaire-converter';

interface FormPopulationCompletedEvent {
  formId: string;
  patientId: string;
  wegovyOutput: WegovyOutput;
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

    // Convert Wegovy AI output to FHIR QuestionnaireResponse using the library
    const metadata: QuestionnaireResponseMetadata = {
      formId: event.formId,
      patientId: event.patientId,
      timestamp: event.timestamp,
    };
    const questionnaireResponse = convertToQuestionnaireResponse(event.wegovyOutput, metadata);

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

}
