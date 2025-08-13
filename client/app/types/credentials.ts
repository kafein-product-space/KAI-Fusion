export interface ServiceField {
    name: string;
    label: string;
    type: 'text' | 'password' | 'textarea' | 'select';
    required: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    description?: string;
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      custom?: (value: any) => string | undefined;
    };
  }
  
  export interface ServiceDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'ai' | 'database' | 'api' | 'storage' | 'cache' | 'triggers' | 'other';
    fields: ServiceField[];
    color: string;
  }
  
  export const SERVICE_DEFINITIONS: ServiceDefinition[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI API credentials for GPT models, embeddings, and more',
      icon: '🤖',
      category: 'ai',
      color: 'from-green-500 to-emerald-600',
      fields: [
        {
          name: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-...',
          description: 'Your OpenAI API key from https://platform.openai.com/api-keys',
          validation: {
            minLength: 20,
            custom: (value: string) => {
              if (!value.startsWith('sk-')) {
                return 'API key must start with "sk-"';
              }
              if (value.length < 20) {
                return 'API key must be at least 20 characters long';
              }
              return undefined;
            }
          }
        },
        {
          name: 'organization',
          label: 'Organization ID (Optional)',
          type: 'text',
          required: false,
          placeholder: 'org-...',
          description: 'Your OpenAI organization ID if you have one'
        }
      ]
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Anthropic Claude API credentials',
      icon: '🧠',
      category: 'ai',
      color: 'from-purple-500 to-indigo-600',
      fields: [
        {
          name: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-ant-...',
          description: 'Your Anthropic API key from https://console.anthropic.com/',
          validation: {
            minLength: 20,
            pattern: '^sk-ant-[a-zA-Z0-9]{32,}$'
          }
        }
      ]
    },
    {
      id: 'cohere',
      name: 'Cohere',
      description: 'Cohere AI API credentials for embeddings and reranking',
      icon: '🔍',
      category: 'ai',
      color: 'from-blue-500 to-cyan-600',
      fields: [
        {
          name: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: '...',
          description: 'Your Cohere API key from https://dashboard.cohere.ai/',
          validation: {
            minLength: 20
          }
        }
      ]
    },
    {
      id: 'postgresql_vectorstore',
      name: 'PostgreSQL Vector Store',
      description: 'PostgreSQL database with vector extension for storing embeddings',
      icon: '🐘',
      category: 'database',
      color: 'from-indigo-500 to-purple-600',
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'localhost',
          description: 'PostgreSQL server hostname or IP address'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'text',
          required: true,
          placeholder: '5432',
          description: 'PostgreSQL server port'
        },
        {
          name: 'database',
          label: 'Database Name',
          type: 'text',
          required: true,
          placeholder: 'vectorstore',
          description: 'Name of the database to connect to'
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'postgres',
          description: 'Database username'
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: '••••••••',
          description: 'Database password'
        },
        {
          name: 'collection_name',
          label: 'Collection Name',
          type: 'text',
          required: true,
          placeholder: 'documents',
          description: 'Name of the vector collection'
        }
      ]
    },
    {
      id: 'redis_cache',
      name: 'Redis Cache',
      description: 'Redis cache for storing session data and temporary results',
      icon: '🔴',
      category: 'cache',
      color: 'from-red-500 to-pink-600',
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'localhost',
          description: 'Redis server hostname or IP address'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'text',
          required: true,
          placeholder: '6379',
          description: 'Redis server port'
        },
        {
          name: 'password',
          label: 'Password (Optional)',
          type: 'password',
          required: false,
          placeholder: '••••••••',
          description: 'Redis server password if authentication is enabled'
        },
        {
          name: 'database',
          label: 'Database Number',
          type: 'text',
          required: false,
          placeholder: '0',
          description: 'Redis database number (0-15)'
        }
      ]
    },
    {
      id: 'tavily_search',
      name: 'Tavily Search',
      description: 'Tavily AI search API for web search capabilities',
      icon: '🌐',
      category: 'api',
      color: 'from-yellow-500 to-orange-600',
      fields: [
        {
          name: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'tvly-...',
          description: 'Your Tavily API key from https://tavily.com/',
          validation: {
            minLength: 20
          }
        }
      ]
    },
    {
      id: 'http_client',
      name: 'HTTP Client',
      description: 'Generic HTTP client for external API integrations',
      icon: '🔗',
      category: 'api',
      color: 'from-gray-500 to-slate-600',
      fields: [
        {
          name: 'base_url',
          label: 'Base URL',
          type: 'text',
          required: true,
          placeholder: 'https://api.example.com',
          description: 'Base URL for the API'
        },
        {
          name: 'api_key',
          label: 'API Key (Optional)',
          type: 'password',
          required: false,
          placeholder: '••••••••',
          description: 'API key if required by the service'
        },
        {
          name: 'headers',
          label: 'Custom Headers (Optional)',
          type: 'textarea',
          required: false,
          placeholder: '{"Authorization": "Bearer ..."}',
          description: 'JSON format custom headers'
        }
      ]
    },
    {
      id: 'webhook_trigger',
      name: 'Webhook Trigger',
      description: 'Webhook endpoint for triggering workflows',
      icon: '📡',
      category: 'triggers',
      color: 'from-teal-500 to-green-600',
      fields: [
        {
          name: 'webhook_url',
          label: 'Webhook URL',
          type: 'text',
          required: true,
          placeholder: 'https://your-domain.com/webhook',
          description: 'Public URL where webhooks will be received'
        },
        {
          name: 'secret_key',
          label: 'Secret Key (Optional)',
          type: 'password',
          required: false,
          placeholder: '••••••••',
          description: 'Secret key for webhook verification'
        }
      ]
    }
  ];
  
  export const getServiceDefinition = (serviceId: string): ServiceDefinition | undefined => {
    return SERVICE_DEFINITIONS.find(service => service.id === serviceId);
  };
  
  export const getServicesByCategory = () => {
    const grouped = SERVICE_DEFINITIONS.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<string, ServiceDefinition[]>);
    
    return grouped;
  };
  
  export const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      ai: 'AI Services',
      database: 'Databases',
      api: 'APIs',
      storage: 'Storage',
      cache: 'Cache',
      triggers: 'Triggers',
      other: 'Other'
    };
    return labels[category] || category;
  };
  