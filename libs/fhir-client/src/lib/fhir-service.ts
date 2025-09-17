import { Client, type BasicAuthorization } from '@aidbox/sdk-r4';
import type { ResourceTypeMap } from '@aidbox/sdk-r4/types';

// All HTTP requests handled by Aidbox SDK

// Generic base interface for Aidbox-specific resources
export interface AidboxResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface FhirServiceConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export class FhirService {
  private client: Client<BasicAuthorization>;

  constructor(config: FhirServiceConfig) {
    this.client = new Client<BasicAuthorization>(config.baseUrl, {
      auth: {
        method: 'basic',
        credentials: {
          username: config.clientId,
          password: config.clientSecret,
        },
      },
    });
  }

  /**
   * Generic method to create any FHIR resource with proper type safety
   */
  async createResource<T extends keyof ResourceTypeMap>(
    resourceType: T,
    resource: ResourceTypeMap[T]
  ): Promise<ResourceTypeMap[T]> {
    try {
      const resourceWithType = {
        ...resource,
        resourceType: resourceType,
      };

      return (await this.client.resource.create(
        resourceType,
        resourceWithType
      )) as ResourceTypeMap[T];
    } catch (error) {
      throw new Error(
        `Failed to create ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generic method to get any FHIR resource by ID with proper type safety
   */
  async getResource<T extends keyof ResourceTypeMap>(
    resourceType: T,
    id: string
  ): Promise<ResourceTypeMap[T]> {
    try {
      return await this.client.resource.get(resourceType, id);
    } catch (error) {
      throw new Error(
        `Failed to retrieve ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generic method to update any FHIR resource using PUT (create or update)
   * Note: PUT operation creates or updates a resource with a specific ID
   */
  async putResource<T extends keyof ResourceTypeMap>(
    resourceType: T,
    id: string,
    resource: ResourceTypeMap[T]
  ): Promise<ResourceTypeMap[T]> {
    try {
      const resourceWithIdAndType = {
        ...resource,
        id,
        resourceType: resourceType,
      };
      // Use create with explicit ID since put may not be available
      return (await this.client.resource.create(
        resourceType,
        resourceWithIdAndType
      )) as ResourceTypeMap[T];
    } catch (error) {
      throw new Error(
        `Failed to put ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generic method to update any FHIR resource
   */
  async updateResource<T extends keyof ResourceTypeMap>(
    resourceType: T,
    id: string,
    updates: Partial<ResourceTypeMap[T]>
  ): Promise<ResourceTypeMap[T]> {
    try {
      const updatesWithType = {
        ...updates,
        resourceType: resourceType,
      };
      return (await this.client.resource.update(
        resourceType,
        id,
        updatesWithType
      )) as ResourceTypeMap[T];
    } catch (error) {
      throw new Error(
        `Failed to update ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generic method to delete any FHIR resource
   */
  async deleteResource<T extends keyof ResourceTypeMap>(
    resourceType: T,
    id: string
  ): Promise<ResourceTypeMap[T]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await this.client.resource.delete(resourceType as any, id);
    } catch (error) {
      throw new Error(
        `Failed to delete ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Check if a resource exists by trying to fetch it
   */
  async resourceExists<T extends keyof ResourceTypeMap>(
    resourceType: T,
    id: string
  ): Promise<boolean> {
    try {
      await this.client.resource.get(resourceType, id);
      return true;
    } catch {
      return false;
    }
  }
}
