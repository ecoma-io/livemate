// Base URL configuration for API calls from Web
export const API_BASE_URL = import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:18181/api` // Get current host (localhost or tailscale ip)
  : '/api'; // Prod env: API and Web on the same domain, use relative path
