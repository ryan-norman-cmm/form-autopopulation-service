import { Injectable, Logger, Inject } from '@nestjs/common';
import { FhirService } from '@form-auto-population/fhir-client';

interface FormPopulationEvent {
  formId: string;
  patientId: string;
  formData: Record<string, any>;
  timestamp: string;
}

interface PopulatedFormData {
  formId: string;
  patientId: string;
  populatedFields: Record<string, any>;
  confidence: number;
  sourceData: Record<string, any>;
}

@Injectable()
export class FormPopulationService {
  private readonly logger = new Logger(FormPopulationService.name);

  constructor(
    @Inject('FHIR_SERVICE') private readonly fhirService: FhirService
  ) {}

  async populateForm(event: FormPopulationEvent): Promise<PopulatedFormData> {
    this.logger.log(
      `Starting form population for form: ${event.formId}, patient: ${event.patientId}`
    );

    if (!event.formId) {
      throw new Error('Form ID is required for form population');
    }

    if (!event.patientId) {
      throw new Error('Patient ID is required for form population');
    }

    // Extract patient data that could be used for form population - this will throw if FHIR fails
    const patientData = await this.fetchPatientData(event.patientId);

    // Apply form population logic based on form type and patient data
    const populatedFields = await this.applyPopulationRules(
      event.formId,
      patientData,
      event.formData
    );

    // Calculate confidence score for the population
    const confidence = this.calculateConfidenceScore(
      populatedFields,
      patientData
    );

    const result: PopulatedFormData = {
      formId: event.formId,
      patientId: event.patientId,
      populatedFields,
      confidence,
      sourceData: patientData,
    };

    this.logger.log(
      `Form population completed with confidence: ${confidence}%`
    );
    return result;
  }

  async validateForm(
    event: FormPopulationEvent
  ): Promise<{ isValid: boolean; errors: string[] }> {
    this.logger.log(`Starting form validation for form: ${event.formId}`);

    const errors: string[] = [];

    // Validate required fields
    if (!event.formId) {
      errors.push('Form ID is required');
    }

    if (!event.patientId) {
      errors.push('Patient ID is required');
    }

    // Validate form data structure
    if (!event.formData || typeof event.formData !== 'object') {
      errors.push('Form data must be a valid object');
    }

    // Additional form-specific validation logic could go here
    const formSpecificErrors = await this.validateFormSpecificRules(
      event.formId,
      event.formData
    );
    errors.push(...formSpecificErrors);

    const isValid = errors.length === 0;
    this.logger.log(
      `Form validation completed. Valid: ${isValid}, Errors: ${errors.length}`
    );

    return { isValid, errors };
  }

  private async fetchPatientData(
    patientId: string
  ): Promise<Record<string, any>> {
    this.logger.log(`Fetching patient data for: ${patientId}`);

    // Fetch patient data from FHIR server
    const patient = await this.fhirService.getResource('Patient', patientId);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Transform FHIR Patient resource to form-friendly format
    const patientData = {
      id: patient.id,
      name:
        patient.name?.[0]?.given?.join(' ') + ' ' + patient.name?.[0]?.family ||
        '',
      birthDate: patient.birthDate,
      gender: patient.gender,
      phone: patient.telecom?.find((t) => t.system === 'phone')?.value,
      email: patient.telecom?.find((t) => t.system === 'email')?.value,
      address: patient.address?.[0]
        ? {
            street: patient.address[0].line?.join(' '),
            city: patient.address[0].city,
            state: patient.address[0].state,
            zip: patient.address[0].postalCode,
          }
        : undefined,
      medicalHistory: {
        // These would come from other FHIR resources like AllergyIntolerance, Condition, etc.
        allergies: [],
        conditions: [],
        medications: [],
      },
    };

    this.logger.log(`Successfully fetched patient data for: ${patientId}`);
    return patientData;
  }

  private async applyPopulationRules(
    formId: string,
    patientData: Record<string, any>,
    existingFormData: Record<string, any>
  ): Promise<Record<string, any>> {
    this.logger.log(`Applying population rules for form: ${formId}`);

    const populatedFields: Record<string, any> = { ...existingFormData };

    // Basic demographic field population
    if (patientData.name && !populatedFields.patientName) {
      populatedFields.patientName = patientData.name;
    }

    if (patientData.birthDate && !populatedFields.dateOfBirth) {
      populatedFields.dateOfBirth = patientData.birthDate;
    }

    if (patientData.gender && !populatedFields.gender) {
      populatedFields.gender = patientData.gender;
    }

    if (patientData.phone && !populatedFields.phoneNumber) {
      populatedFields.phoneNumber = patientData.phone;
    }

    if (patientData.email && !populatedFields.email) {
      populatedFields.email = patientData.email;
    }

    // Address population
    if (patientData.address && !populatedFields.address) {
      populatedFields.address = patientData.address;
    }

    // Medical history population for relevant forms
    if (formId.includes('medical') || formId.includes('history')) {
      if (patientData.medicalHistory?.allergies && !populatedFields.allergies) {
        populatedFields.allergies = patientData.medicalHistory.allergies;
      }

      if (
        patientData.medicalHistory?.conditions &&
        !populatedFields.conditions
      ) {
        populatedFields.conditions = patientData.medicalHistory.conditions;
      }

      if (
        patientData.medicalHistory?.medications &&
        !populatedFields.medications
      ) {
        populatedFields.medications = patientData.medicalHistory.medications;
      }
    }

    return populatedFields;
  }

  private calculateConfidenceScore(
    populatedFields: Record<string, any>,
    sourceData: Record<string, any>
  ): number {
    const totalFields = Object.keys(populatedFields).length;
    const populatedFieldsCount = Object.values(populatedFields).filter(
      (value) => value !== null && value !== undefined && value !== ''
    ).length;

    if (totalFields === 0) return 0;

    const confidence = Math.round((populatedFieldsCount / totalFields) * 100);
    return Math.min(confidence, 100);
  }

  private async validateFormSpecificRules(
    formId: string,
    formData: Record<string, any>
  ): Promise<string[]> {
    const errors: string[] = [];

    // Form-specific validation rules
    switch (formId) {
      case 'patient-intake':
        if (!formData.patientName) {
          errors.push('Patient name is required for intake forms');
        }
        if (!formData.dateOfBirth) {
          errors.push('Date of birth is required for intake forms');
        }
        break;

      case 'medical-history':
        if (!formData.allergies && !formData.conditions) {
          errors.push(
            'At least one of allergies or conditions must be specified'
          );
        }
        break;

      case 'contact-form':
        if (!formData.phoneNumber && !formData.email) {
          errors.push(
            'At least one contact method (phone or email) is required'
          );
        }
        break;

      default:
        // No specific validation for unknown form types
        break;
    }

    return errors;
  }
}
