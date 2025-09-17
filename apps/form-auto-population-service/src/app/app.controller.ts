import { Controller, Post, Inject } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';

@Controller('forms')
export class AppController {
  constructor(
    @Inject('FHIR_SERVICE') private readonly fhirService: FhirService
  ) {}

  @Post('test/create-questionnaire')
  async createTestQuestionnaire() {
    const testQuestionnaire = {
      resourceType: 'Questionnaire' as const,
      status: 'active' as const,
      name: 'TestQuestionnaire',
      title: 'Test Form for Auto-Population',
      description: 'A test questionnaire for verifying FHIR capabilities',
      item: [
        {
          linkId: '1',
          text: 'What is your name?',
          type: 'string' as const,
          required: true,
        },
        {
          linkId: '2',
          text: 'What is your age?',
          type: 'integer' as const,
          required: false,
        },
      ],
    };

    try {
      const result = await this.fhirService.createResource(
        'Questionnaire',
        testQuestionnaire
      );
      return {
        message: 'Questionnaire created successfully',
        resource: result,
      };
    } catch (error) {
      throw new Error(
        `Failed to create questionnaire: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
