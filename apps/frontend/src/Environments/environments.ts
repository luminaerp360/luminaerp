// src/Environments/environments.ts - FIXED VERSION
import { EnvironmentInterface } from '../app/shared/interfaces/environments.interface';

// Base URLs
const BASE_LOCAL_URL = 'http://localhost:3000';
const BASE_PROD_URL = 'http://localhost:3000';

// Choose the base URL based on environment
const BASE_URL = BASE_PROD_URL; // Use production URL

// FIXED: Safe function to get orgId with proper parsing
function getOrgId(): string {
  try {
    // First try to get from licencedOrg
    let orgId = localStorage.getItem('licencedOrg');

    // If not found, try to get from currentOrganization
    if (!orgId || orgId === 'null' || orgId === 'undefined') {
      const currentOrgStr = localStorage.getItem('currentOrganization');
      if (currentOrgStr) {
        const currentOrg = JSON.parse(currentOrgStr);
        orgId = currentOrg?.id?.toString();
      }
    }

    // Clean up the orgId - remove any quotes or extra characters
    if (orgId) {
      // Remove quotes if they exist
      orgId = orgId.replace(/['"]/g, '');

      // Ensure it's a valid number
      const numericOrgId = parseInt(orgId, 10);
      if (!isNaN(numericOrgId) && numericOrgId > 0) {
        return numericOrgId.toString();
      }
    }
  } catch (error) {
    console.error('Error getting org ID:', error);
  }

  // Fallback to a default org ID
  return '1';
}

// Create initial environment
export const environment: EnvironmentInterface = {
  apiRootUrl: `${BASE_URL}/organizations/${getOrgId()}/`,
  apiMainRootUrl: `${BASE_URL}/`,
  mpesaApiUrl: `${BASE_URL}/mapi`,
  licenceUrl: `${BASE_URL}/organization/`,
  csrfURL: `${BASE_URL}/organizations/${getOrgId()}/sanctum/csrf-cookie`,
  googleClientId:
    '1082355808874-qoc43k005tcobvvv61c1krbckt09guki.apps.googleusercontent.com',
  production: true,
};

// Function to refresh the environment when org ID changes.
// Mutates the shared `environment` object in-place so all services pick up the new org ID.
export function refreshEnvironment(): EnvironmentInterface {
  const orgId = getOrgId();
  environment.apiRootUrl = `${BASE_URL}/organizations/${orgId}/`;
  environment.csrfURL = `${BASE_URL}/organizations/${orgId}/sanctum/csrf-cookie`;
  return environment;
}

// UPDATED: Environment Service with better error handling
export class EnvironmentService {
  private static instance: EnvironmentService;

  private constructor() {}

  public static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  // Get the current organization ID with proper parsing
  public getOrgId(): string {
    return getOrgId();
  }

  // Get the API root URL with current org ID
  public getApiRootUrl(): string {
    const orgId = this.getOrgId();
    console.log('Getting API URL with orgId:', orgId); // Debug log
    return `${BASE_URL}/organizations/${orgId}/`;
  }

  // Get the CSRF URL with current org ID
  public getCsrfUrl(): string {
    const orgId = this.getOrgId();
    return `${BASE_URL}/organizations/${orgId}/sanctum/csrf-cookie`;
  }

  // Method to update org ID and refresh environment
  public updateOrgId(newOrgId: number | string): void {
    const cleanOrgId = parseInt(newOrgId.toString(), 10);
    if (!isNaN(cleanOrgId) && cleanOrgId > 0) {
      localStorage.setItem('licencedOrg', cleanOrgId.toString());
      console.log('Updated orgId to:', cleanOrgId); // Debug log
    }
  }
}

// Export the service instance
export const environmentService = EnvironmentService.getInstance();
