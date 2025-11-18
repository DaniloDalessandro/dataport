/**
 * Centralized configuration for environment variables
 * All API URLs and external configurations should be defined here
 */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
} as const

// Helper function to build API URLs
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${config.apiUrl}${cleanEndpoint}`
}
