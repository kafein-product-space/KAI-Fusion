// Environment configuration for the application
interface Config {
  API_BASE_URL: string;
  API_VERSION: string;
  APP_NAME: string;
  ENVIRONMENT: 'development' | 'production' | 'testing';
  ENABLE_LOGGING: boolean;
}

const getConfig = (): Config => {
  // Check if we're in development by looking at the hostname
  const isDevelopment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  return {
    API_BASE_URL: isDevelopment 
      ? 'http://localhost:8001' 
      : 'https://mwrkgmxbth.us-east-1.awsapprunner.com',
    API_VERSION: '/api/v1',
    APP_NAME: 'KAI-Fusion',
    ENVIRONMENT: isDevelopment ? 'development' : 'production',
    ENABLE_LOGGING: isDevelopment,
  };
};

export const config = getConfig();

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    SIGNUP: '/auth/signup',
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  CREDENTIALS: {
    LIST: '/credentials', // GET: listele
    CREATE: '/credentials', // POST: oluştur
    GET: (id: string) => `/credentials/${id}`,
    UPDATE: (id: string) => `/credentials/${id}`,
    DELETE: (id: string) => `/credentials/${id}`,
  },
  // Workflows
  WORKFLOWS: {
    LIST: '/workflows',
    CREATE: '/workflows',
    GET: (id: string) => `/workflows/${id}`,
    UPDATE: (id: string) => `/workflows/${id}`,
    DELETE: (id: string) => `/workflows/${id}`,
    EXECUTE: '/workflows/execute',
    EXECUTE_STREAM: '/workflows/execute/stream',
    VALIDATE: '/workflows/validate',
    EXECUTIONS: (id: string) => `/workflows/${id}/executions`,
  },
  // Nodes
  NODES: {
    LIST: '/nodes',
    CATEGORIES: '/nodes/categories',
    CUSTOM: '/nodes/custom',
    GET_CUSTOM: (id: string) => `/nodes/custom/${id}`,
  },
  // Health
  HEALTH: '/health',
  INFO: '/info',
} as const; 