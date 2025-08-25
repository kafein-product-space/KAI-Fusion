interface Config {
  API_BASE_URL: string;
  API_VERSION: string;
  APP_NAME: string;
  ENVIRONMENT: 'development' | 'production' | 'testing';
  ENABLE_LOGGING: boolean;
}

const getConfig = (): Config => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiVersion = import.meta.env.VITE_API_VERSION;
  const appName = import.meta.env.VITE_APP_NAME;
  const env = import.meta.env.VITE_NODE_ENV;
  const enableLogging = import.meta.env.VITE_ENABLE_LOGGING === 'true';

  return {
    API_BASE_URL: apiBaseUrl,
    API_VERSION: apiVersion,
    APP_NAME: appName,
    ENVIRONMENT: env,
    ENABLE_LOGGING: enableLogging,
  };
};

export const config = getConfig();

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/auth/signup',
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  CREDENTIALS: {
    LIST: '/credentials',
    CREATE: '/credentials',
    GET: (id: string) => `/credentials/${id}`,
    UPDATE: (id: string) => `/credentials/${id}`,
    DELETE: (id: string) => `/credentials/${id}`,
  },
  API_KEYS: {
    LIST: '/api-keys',
    CREATE: '/api-keys',
    UPDATE: (id: string) => `/api-keys/${id}`,
    DELETE: (id: string) => `/api-keys/${id}`,
  },
  WORKFLOWS: {
    LIST: '/workflows',
    CREATE: '/workflows',
    GET: (id: string) => `/workflows/${id}`,
    UPDATE: (id: string) => `/workflows/${id}`,
    DELETE: (id: string) => `/workflows/${id}`,
    VALIDATE: '/workflows/validate',
    EXECUTE: '/workflows/execute',
    PUBLIC: '/workflows/public/',
    SEARCH: '/workflows/search/',
    DUPLICATE: (id: string) => `/workflows/${id}/duplicate`,
    VISIBILITY: (id: string) => `/workflows/${id}/visibility`,
    STATS: '/workflows/stats/',
    DASHBOARD_STATS: '/workflows/dashboard/stats/',
    TEMPLATES: '/workflows/templates/',
    TEMPLATE_CATEGORIES: '/workflows/templates/categories/',
    CREATE_TEMPLATE: '/workflows/templates/',
    CREATE_TEMPLATE_FROM_WORKFLOW: (id: string) => `/workflows/${id}/create-template`,
  },
  NODES: {
    LIST: '/nodes',
    CATEGORIES: '/nodes/categories',
    CUSTOM: '/nodes/custom',
    GET_CUSTOM: (id: string) => `/nodes/custom/${id}`,
  },
  CHAT: {
    LIST: '/chat', // Tüm chatleri getir
    CREATE: '/chat', // Yeni chat başlat
    GET: (chatflow_id: string) => `/chat/${chatflow_id}`,
    INTERACT: (chatflow_id: string) => `/chat/${chatflow_id}/interact`,
    UPDATE: (chat_message_id: string) => `/chat/${chat_message_id}`,
    DELETE: (chat_message_id: string) => `/chat/${chat_message_id}`,
    DELETE_CHATFLOW: (chatflow_id: string) => `/chat/chatflow/${chatflow_id}`,
    GET_WORKFLOW_CHATS: (workflow_id: string) => `/chat/workflow/${workflow_id}`,
  },
  EXECUTIONS: {
    LIST: '/executions',
    CREATE: '/executions',
    GET: (id: string) => `/executions/${id}`,
  },
  VARIABLES: {
    LIST: '/variables',
    CREATE: '/variables',
    GET: (id: string) => `/variables/${id}`,
    UPDATE: (id: string) => `/variables/${id}`,
    DELETE: (id: string) => `/variables/${id}`,
  },
  EXPORT: {
    WORKFLOW_INIT: (id: string) => `/export/workflow/${id}`,
    WORKFLOW_COMPLETE: (id: string) => `/export/workflow/${id}/complete`,
  },
  HEALTH: '/health',
  INFO: '/info',
} as const;