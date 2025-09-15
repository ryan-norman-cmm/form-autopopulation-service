import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { HealthcareEventsAllConfigSchema } from './validation.schema';

/**
 * Configuration validation function
 * Validates environment variables against the configuration schema
 */
export async function validateConfig(
  config: Record<string, unknown>
): Promise<HealthcareEventsAllConfigSchema> {
  // Transform plain object to class instance
  const validatedConfig = plainToClass(
    HealthcareEventsAllConfigSchema,
    config,
    {
      enableImplicitConversion: true,
    }
  );

  // Validate the configuration
  const errors = await validate(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const errorMessages = formatValidationErrors(errors);
    throw new Error(
      `Configuration validation failed:\n${errorMessages.join('\n')}`
    );
  }

  return validatedConfig;
}

/**
 * Format validation errors into human-readable messages
 */
function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const property = error.property;
    const constraints = error.constraints;

    if (constraints) {
      for (const constraint of Object.values(constraints)) {
        messages.push(`  - ${property}: ${constraint}`);
      }
    }

    // Handle nested validation errors
    if (error.children && error.children.length > 0) {
      const childMessages = formatValidationErrors(error.children);
      messages.push(...childMessages.map((msg) => `  ${msg}`));
    }
  }

  return messages;
}

/**
 * Create a configuration factory for NestJS ConfigModule
 */
export function createConfigFactory() {
  return async () => {
    return validateConfig(process.env);
  };
}
