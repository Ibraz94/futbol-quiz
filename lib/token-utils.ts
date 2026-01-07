import { API_BASE_URL } from './config';

export interface TokenPayload {
  email?: string;
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Decode JWT token without verification (client-side only)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  // Check if token expires in less than 5 minutes (300 seconds)
  // This gives us a buffer to refresh before it actually expires
  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return Date.now() >= (expirationTime - bufferTime);
}

/**
 * Check if token is completely expired (no buffer)
 */
export function isTokenFullyExpired(token: string | null): boolean {
  if (!token) return true;
  
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    console.warn('No refresh token available');
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      console.warn('Failed to refresh token:', response.status);
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }

    const data = await response.json();
    
    // Store new access token
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      
      // Update refresh token if rotated
      if (data.refresh_token && data.refresh_token !== refreshToken) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      return data.access_token;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Clear tokens on error
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  let accessToken = localStorage.getItem('access_token');
  
  // If no token, return null
  if (!accessToken) {
    return null;
  }
  
  // If token is expired or about to expire, try to refresh
  if (isTokenExpired(accessToken)) {
    console.log('Token expired or expiring soon, refreshing...');
    accessToken = await refreshAccessToken();
  }
  
  return accessToken;
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

