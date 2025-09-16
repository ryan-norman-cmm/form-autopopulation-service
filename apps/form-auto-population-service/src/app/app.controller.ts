import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { FhirService } from '@form-auto-population/fhir-client';

interface FormPopulationRequest {
  formId: string;
  patientId: string;
  formData: Record<string, unknown>;
}

@Controller('api/forms')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('FHIR_SERVICE') private readonly fhirService: FhirService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('populate')
  async populateForm(@Body() request: FormPopulationRequest) {
    if (!request.formId) {
      throw new Error('Form ID is required');
    }
    if (!request.patientId) {
      throw new Error('Patient ID is required');
    }

    return {
      message:
        'Form population request received - use Kafka events for actual processing',
      formId: request.formId,
      patientId: request.patientId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('validate')
  async validateForm(@Body() request: FormPopulationRequest) {
    if (!request.formId) {
      throw new Error('Form ID is required');
    }

    return {
      message:
        'Form validation request received - use Kafka events for actual processing',
      formId: request.formId,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':formId/template')
  async getFormTemplate(@Param('formId') formId: string) {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    try {
      const questionnaire = await this.fhirService.getResource(
        'Questionnaire',
        formId
      );
      return questionnaire;
    } catch (error) {
      throw new Error(
        `Failed to retrieve questionnaire ${formId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

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
