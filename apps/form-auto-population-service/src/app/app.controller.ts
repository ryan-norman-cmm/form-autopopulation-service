import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

interface FormPopulationRequest {
  formId: string;
  patientId: string;
  formData: Record<string, any>;
}

@Controller('api/forms')
export class AppController {
  constructor(private readonly appService: AppService) {}

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

    // In production, this would fetch form templates from a database or FHIR server
    throw new Error(
      'Form template retrieval not implemented - requires FHIR Questionnaire resource integration'
    );
  }
}
