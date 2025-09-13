import { Client, type BasicAuthorization } from '@aidbox/sdk-r4';
import type { Patient, ResourceTypeMap } from '@aidbox/sdk-r4/types';

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
   * Get a patient by ID with healthcare-compliant error handling
   */
  async getPatient(id: string): Promise<Patient> {
    try {
      return await this.client.resource.get('Patient', id);
    } catch (error) {
      // Don't log patient IDs or sensitive data
      throw new Error(
        `Failed to retrieve patient resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Create a new patient with validation
   */
  async createPatient(patient: Patient): Promise<Patient> {
    try {
      // Ensure resourceType is set for FHIR compliance
      if (!patient.resourceType) {
        patient.resourceType = 'Patient';
      }
      return await this.client.resource.create('Patient', patient);
    } catch (error) {
      // Healthcare-compliant error handling
      throw new Error(
        `Failed to create patient resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Update an existing patient with FHIR R4 compliance
   */
  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    // Ensure resourceType is set for FHIR compliance
    if (!updates.resourceType) {
      updates.resourceType = 'Patient';
    }

    try {
      return await this.client.resource.update('Patient', id, updates);
    } catch (error) {
      // Healthcare-compliant error handling without exposing patient data
      throw new Error(
        `Failed to update patient resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Delete a patient with healthcare-compliant logging
   */
  async deletePatient(id: string): Promise<Patient> {
    try {
      return await this.client.resource.delete('Patient', id);
    } catch (error) {
      // Don't log patient IDs in error messages
      throw new Error(
        `Failed to delete patient resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Search for patients with proper return type and execution
   */
  async searchPatients(
    params?: Record<string, string | number | boolean>
  ): Promise<Patient[]> {
    let query = this.client.resource.list('Patient');

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        query = query.where(key, String(value));
      });
    }

    try {
      const result = await query;
      // Check if the result has a Bundle structure or is an array
      if (Array.isArray(result)) {
        return result as Patient[];
      } else if (result && typeof result === 'object' && 'entry' in result) {
        const bundle = result as { entry?: { resource: Patient }[] };
        return bundle.entry?.map((entry) => entry.resource) || [];
      }
      return [];
    } catch (error) {
      // Healthcare-compliant error handling without exposing search parameters
      throw new Error(
        `Failed to search patient resources: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
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

  /**
   * Create an Aidbox-specific resource (like AidboxSubscriptionTopic, AidboxTopicDestination)
   * These resources are not part of standard FHIR but are Aidbox extensions
   */
  async createAidboxResource<T extends AidboxResource>(
    resourceType: string,
    resource: T
  ): Promise<T> {
    try {
      const resourceWithType = {
        ...resource,
        resourceType: resourceType,
      };
      // Use HTTPClient directly for Aidbox-specific resources
      const httpClient = this.client.HTTPClient();
      const response = await httpClient.post(`${resourceType}`, {
        json: resourceWithType,
      });
      return response.response.data as T;
    } catch (error) {
      throw new Error(
        `Failed to create ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get an Aidbox-specific resource by ID
   */
  async getAidboxResource<T extends AidboxResource>(
    resourceType: string,
    id: string
  ): Promise<T> {
    try {
      const httpClient = this.client.HTTPClient();
      const response = await httpClient.get(`${resourceType}/${id}`);
      return response.response.data as T;
    } catch (error) {
      throw new Error(
        `Failed to retrieve ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Create or update an Aidbox-specific resource using PUT
   */
  async putAidboxResource<T extends AidboxResource>(
    resourceType: string,
    id: string,
    resource: T
  ): Promise<T> {
    try {
      const resourceWithIdAndType = {
        ...resource,
        id,
        resourceType: resourceType,
      };
      const httpClient = this.client.HTTPClient();
      const response = await httpClient.put(`${resourceType}/${id}`, {
        json: resourceWithIdAndType,
      });
      return response.response.data as T;
    } catch (error) {
      throw new Error(
        `Failed to put ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Check if an Aidbox-specific resource exists
   */
  async aidboxResourceExists(
    resourceType: string,
    id: string
  ): Promise<boolean> {
    try {
      const httpClient = this.client.HTTPClient();
      await httpClient.get(`${resourceType}/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the underlying Aidbox client for advanced operations
   */
  getClient(): Client<BasicAuthorization> {
    return this.client;
  }

  /**
   * Search for Aidbox-specific resources
   */
  async searchAidboxResources<T extends AidboxResource>(
    resourceType: string,
    searchParams?: string
  ): Promise<{ entry?: { resource: T }[] }> {
    try {
      const httpClient = this.client.HTTPClient();
      const url = searchParams
        ? `${resourceType}?${searchParams}`
        : resourceType;
      const response = await httpClient.get(url);
      return response.response.data as { entry?: { resource: T }[] };
    } catch (error) {
      throw new Error(
        `Failed to search ${resourceType} resources: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Delete an Aidbox-specific resource
   */
  async deleteAidboxResource(resourceType: string, id: string): Promise<void> {
    try {
      const httpClient = this.client.HTTPClient();
      await httpClient.delete(`${resourceType}/${id}`);
    } catch (error) {
      throw new Error(
        `Failed to delete ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Patch an Aidbox-specific resource
   */
  async patchAidboxResource<T extends AidboxResource>(
    resourceType: string,
    id: string,
    patchData: Partial<T>
  ): Promise<T> {
    try {
      const httpClient = this.client.HTTPClient();
      const response = await httpClient.patch(`${resourceType}/${id}`, {
        json: patchData,
      });
      return response.response.data as T;
    } catch (error) {
      throw new Error(
        `Failed to patch ${resourceType} resource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get the HTTPClient for direct HTTP operations
   */
  getHTTPClient() {
    return this.client.HTTPClient();
  }
}
