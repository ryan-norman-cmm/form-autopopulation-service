import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsUrl,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class KafkaConfig {
  @IsString()
  bootstrapServers!: string;

  @IsString()
  clientId!: string;

  @IsOptional()
  @IsNumber()
  connectionTimeout?: number;

  @IsOptional()
  @IsNumber()
  requestTimeout?: number;

  @IsString()
  formPopulationCompletedTopic!: string;
}

export class FhirServerConfig {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;
}

export class AppConfig {
  @IsOptional()
  @IsString()
  nodeEnv?: string;

  @IsOptional()
  @IsNumber()
  port?: number;

  @IsOptional()
  @IsString()
  corsOrigin?: string;
}

export class Config {
  @ValidateNested()
  @Type(() => AppConfig)
  app!: AppConfig;

  @ValidateNested()
  @Type(() => KafkaConfig)
  kafka!: KafkaConfig;

  @ValidateNested()
  @Type(() => FhirServerConfig)
  fhirServer!: FhirServerConfig;
}
