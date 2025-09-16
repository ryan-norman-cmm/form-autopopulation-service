import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FormPopulationService } from './form-population.service';

interface FormPopulationCompletedEvent {
  formId: string;
  patientId: string;
  questionnaireOutput: Array<{
    question_id: string;
    question_text: string;
    answer: string | number | boolean | string[];
  }>;
  timestamp: string;
}

@Controller()
export class FormPopulationController {
  private readonly logger = new Logger(FormPopulationController.name);

  constructor(private readonly formPopulationService: FormPopulationService) {}

  @EventPattern('form.population.completed')
  async handleFormPopulationCompleted(
    @Payload() payload: FormPopulationCompletedEvent
  ) {
    this.logger.log(
      `Received form population completed event for form: ${payload.formId}, patient: ${payload.patientId}`
    );

    try {
      await this.formPopulationService.createQuestionnaireResponse(payload);
      this.logger.log(
        `Successfully created QuestionnaireResponse for form: ${payload.formId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to create QuestionnaireResponse for form: ${payload.formId}`,
        error
      );
      throw error;
    }
  }
}
