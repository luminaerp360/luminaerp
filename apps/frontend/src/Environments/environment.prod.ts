import { EnvironmentInterface } from '../app/shared/interfaces/environments.interface';

// Base URLs
const BASE_LOCAL_URL = 'https://api.lumina360.tech';
const BASE_PROD_URL = 'https://api.lumina360.tech';

// Choose the base URL based on environment
const BASE_URL = BASE_LOCAL_URL; // or BASE_PROD_URL for production

// Safe function to get orgId with fallback
function getOrgId(): string {
  const orgId = localStorage.getItem('licencedOrg');
  console.log('Org ID:', orgId);
  // Return a fallback if orgId is null
  return orgId!;
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

// Function to refresh the environment when org ID changes
export function refreshEnvironment(): EnvironmentInterface {
  const orgId = getOrgId();
  return {
    ...environment,
    apiRootUrl: `${BASE_URL}/organizations/${orgId}/`,
    csrfURL: `${BASE_URL}/organizations/${orgId}/sanctum/csrf-cookie`,
  };
}

// Create a singleton service to handle dynamic URLs
export class EnvironmentService {
  private static instance: EnvironmentService;

  private constructor() {}

  public static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  // Get the current organization ID
  public getOrgId(): string {
    const orgId = localStorage.getItem('licencedOrg');
    return orgId || '5'; // Use your fallback value
  }

  // Get the API root URL with current org ID
  public getApiRootUrl(): string {
    return `${BASE_URL}/organizations/${this.getOrgId()}/`;
  }

  // Get the CSRF URL with current org ID
  public getCsrfUrl(): string {
    return `${BASE_URL}/organizations/${this.getOrgId()}/sanctum/csrf-cookie`;
  }

  // Get the M-Pesa API URL
  public getMpesaApiUrl(): string {
    return `${BASE_URL}/mapi`;
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
