export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  tips: string[];
  expectedOutcome: string;
  completed: boolean;
}

export interface TutorialWorkflow {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  steps: TutorialStep[];
  prerequisites: string[];
  tags: string[];
}

export const TUTORIAL_WORKFLOWS: TutorialWorkflow[] = [
  {
    id: 'simple-chatbot',
    name: 'Simple AI Chatbot',
    description: 'Create a comprehensive AI chatbot with agent coordination, LLM integration, memory, and tools',
    difficulty: 'Beginner',
    category: 'AI & Chatbots',
    estimatedTime: '15-20 minutes',
    tags: ['chatbot', 'openai', 'llm', 'beginner'],
    prerequisites: ['OpenAI API key'],
    steps: [
      {
        id: 'step-1',
        title: 'Add Start Node',
        description: 'Begin your workflow with a start node',
        instructions: [
          'Drag a Start Node from the node palette to the canvas',
          'Position it at the top-left area of your workflow',
          'This node will receive user input and start the workflow'
        ],
        tips: [
          'Start nodes are always the entry point of your workflow',
          'You can only have one start node per workflow'
        ],
        expectedOutcome: 'A Start Node appears on your canvas',
        completed: false
      },
      {
        id: 'step-2',
        title: 'Add Agent Node',
        description: 'Add the main AI agent that will coordinate the workflow',
        instructions: [
          'Drag an Agent Node to the canvas',
          'Position it to the right of the Start Node',
          'Configure the agent with appropriate tools and memory',
          'Set the agent type and behavior parameters'
        ],
        tips: [
          'Agents can use multiple tools and maintain conversation context',
          'Configure the agent to handle user queries intelligently',
          'Set appropriate memory settings for conversation history'
        ],
        expectedOutcome: 'Agent Node configured and ready to coordinate the workflow',
        completed: false
      },
      {
        id: 'step-3',
        title: 'Connect Start to Agent',
        description: 'Link the start node to the agent node',
        instructions: [
          'Click on the Start Node\'s output handle (right side)',
          'Drag a connection line to the Agent Node\'s input handle',
          'Verify the connection is established'
        ],
        tips: [
          'Connections show data flow between nodes',
          'Make sure handles are properly aligned for connection',
          'You can delete connections by clicking on them'
        ],
        expectedOutcome: 'A connection line links Start Node to Agent Node',
        completed: false
      },
      {
        id: 'step-4',
        title: 'Connect Agent to End',
        description: 'Link the agent node to the end node',
        instructions: [
          'Drag an End Node to the canvas if not already present',
          'Position it to the right of the Agent Node',
          'Connect the Agent Node output to the End Node input'
        ],
        tips: [
          'End nodes mark the completion of your workflow',
          'You can have multiple end nodes for different outcomes',
          'The workflow will stop when it reaches an end node'
        ],
        expectedOutcome: 'A connection line links Agent Node to End Node',
        completed: false
      },
      {
        id: 'step-5',
        title: 'Add LLM Node',
        description: 'Add language model capabilities to your agent',
        instructions: [
          'Drag an OpenAI Chat Node to the canvas',
          'Position it above the Agent Node',
          'Configure your OpenAI API key in the node settings',
          'Set the model (e.g., gpt-3.5-turbo) and temperature'
        ],
        tips: [
          'Use temperature 0.7 for balanced creativity and consistency',
          'GPT-3.5-turbo is cost-effective for most use cases',
          'Store your API key securely in credentials'
        ],
        expectedOutcome: 'OpenAI Chat Node configured and ready',
        completed: false
      },
      {
        id: 'step-6',
        title: 'Connect LLM to Agent',
        description: 'Link the LLM node to provide AI capabilities to the agent',
        instructions: [
          'Click on the OpenAI Chat Node\'s output handle',
          'Drag a connection line to the Agent Node\'s LLM input handle',
          'Verify the connection is established'
        ],
        tips: [
          'The agent will use the LLM for generating responses',
          'Make sure the LLM is properly configured before connecting',
          'This enables the agent to have intelligent conversation capabilities'
        ],
        expectedOutcome: 'LLM Node connected to Agent Node',
        completed: false
      },
      {
        id: 'step-7',
        title: 'Add Memory Node',
        description: 'Add conversation memory to maintain context',
        instructions: [
          'Drag a Conversation Memory Node to the canvas',
          'Position it below the Agent Node',
          'Configure memory settings (buffer size, conversation length)',
          'Set appropriate memory parameters for your use case'
        ],
        tips: [
          'Memory helps maintain conversation context across interactions',
          'Buffer memory is good for short conversations',
          'Conversation memory is better for longer, multi-turn chats'
        ],
        expectedOutcome: 'Memory Node configured and ready',
        completed: false
      },
      {
        id: 'step-8',
        title: 'Connect Memory to Agent',
        description: 'Link the memory node to provide conversation context',
        instructions: [
          'Click on the Memory Node\'s output handle',
          'Drag a connection line to the Agent Node\'s memory input handle',
          'Verify the connection is established'
        ],
        tips: [
          'Memory enables the agent to remember previous conversations',
          'The agent can reference past interactions for better responses',
          'Configure memory size based on your expected conversation length'
        ],
        expectedOutcome: 'Memory Node connected to Agent Node',
        completed: false
      },
      {
        id: 'step-9',
        title: 'Add Tools Node',
        description: 'Add useful tools for the agent to use',
        instructions: [
          'Drag a Tool Node (e.g., HTTP Client, Web Search) to the canvas',
          'Position it to the left of the Agent Node',
          'Configure the tool with appropriate parameters',
          'Set up any required API keys or credentials'
        ],
        tips: [
          'Tools extend the agent\'s capabilities beyond just conversation',
          'HTTP Client allows web API calls',
          'Web Search enables real-time information retrieval'
        ],
        expectedOutcome: 'Tool Node configured and ready',
        completed: false
      },
      {
        id: 'step-10',
        title: 'Connect Tools to Agent',
        description: 'Link the tools node to extend agent capabilities',
        instructions: [
          'Click on the Tool Node\'s output handle',
          'Drag a connection line to the Agent Node\'s tools input handle',
          'Verify the connection is established'
        ],
        tips: [
          'Tools give the agent access to external data and services',
          'The agent can intelligently choose which tools to use',
          'Multiple tools can be connected for comprehensive functionality'
        ],
        expectedOutcome: 'Tool Node connected to Agent Node',
        completed: false
      },
      {
        id: 'step-11',
        title: 'Test Your Enhanced Chatbot',
        description: 'Execute and test your complete workflow',
        instructions: [
          'Click the "Execute" button in the workflow toolbar',
          'Enter a test message in the chat input',
          'Watch the workflow execute through each connected node',
          'Verify the agent uses LLM, memory, and tools correctly'
        ],
        tips: [
          'Start with simple questions to test basic functionality',
          'Try asking questions that require tool usage',
          'Check the execution logs for any errors',
          'Test memory by having a multi-turn conversation'
        ],
        expectedOutcome: 'Complete workflow executes successfully with all components working together',
        completed: false
      }
    ]
  },
  {
    id: 'rag-system',
    name: 'RAG Document Q&A System',
    description: 'Build a Retrieval-Augmented Generation system for document analysis',
    difficulty: 'Intermediate',
    category: 'Document Processing',
    estimatedTime: '15-20 minutes',
    tags: ['rag', 'documents', 'vector', 'intermediate'],
    prerequisites: ['OpenAI API key', 'PostgreSQL database'],
    steps: [
      {
        id: 'step-1',
        title: 'Set Up Document Loader',
        description: 'Create a document ingestion pipeline',
        instructions: [
          'Add a Document Loader Node to your workflow',
          'Configure it to load your target documents',
          'Set appropriate chunk size for text splitting'
        ],
        tips: [
          'Use chunk sizes between 500-1000 characters for optimal retrieval',
          'Support multiple document formats (PDF, TXT, DOCX)',
          'Consider document preprocessing for better quality'
        ],
        expectedOutcome: 'Document loader configured and ready',
        completed: false
      },
      {
        id: 'step-2',
        title: 'Configure Text Splitter',
        description: 'Split documents into manageable chunks',
        instructions: [
          'Add a Document Chunk Splitter Node',
          'Connect it to the Document Loader output',
          'Set chunk size and overlap parameters'
        ],
        tips: [
          'Overlap helps maintain context between chunks',
          'Smaller chunks improve retrieval precision',
          'Larger chunks maintain more context'
        ],
        expectedOutcome: 'Text splitter processes documents into chunks',
        completed: false
      },
      {
        id: 'step-3',
        title: 'Set Up Vector Store',
        description: 'Create embeddings and store in vector database',
        instructions: [
          'Add an OpenAI Embeddings Node',
          'Connect it to the Chunk Splitter output',
          'Add a PostgreSQL Vector Store Node',
          'Configure database connection and collection name'
        ],
        tips: [
          'Use consistent embedding models for consistency',
          'Vector stores enable semantic search capabilities',
          'PostgreSQL with pgvector provides excellent performance'
        ],
        expectedOutcome: 'Vector store configured with document embeddings',
        completed: false
      },
      {
        id: 'step-4',
        title: 'Create Retrieval System',
        description: 'Build the question-answering pipeline',
        instructions: [
          'Add a Retrieval QA Node',
          'Connect it to the Vector Store',
          'Add an OpenAI Chat Node for answer generation',
          'Configure the system prompt for document-based responses'
        ],
        tips: [
          'Use clear system prompts for better answer quality',
          'Retrieval QA combines search and generation',
          'Consider adding memory for conversation context'
        ],
        expectedOutcome: 'Complete RAG pipeline ready for questions',
        completed: false
      },
      {
        id: 'step-5',
        title: 'Test RAG System',
        description: 'Validate your document Q&A system',
        instructions: [
          'Execute the workflow with a test question',
          'Verify documents are loaded and processed',
          'Test question answering with document-specific queries',
          'Check retrieval relevance and answer quality'
        ],
        tips: [
          'Test with questions that require document knowledge',
          'Verify retrieved chunks are relevant to questions',
          'Monitor response quality and relevance'
        ],
        expectedOutcome: 'System successfully answers questions using document knowledge',
        completed: false
      }
    ]
  },
  {
    id: 'webhook-automation',
    name: 'Webhook Automation Workflow',
    description: 'Create automated workflows triggered by external webhooks',
    difficulty: 'Intermediate',
    category: 'Automation',
    estimatedTime: '10-15 minutes',
    tags: ['webhook', 'automation', 'api', 'intermediate'],
    prerequisites: ['External system that can send webhooks'],
    steps: [
      {
        id: 'step-1',
        title: 'Configure Webhook Trigger',
        description: 'Set up webhook endpoint for external triggers',
        instructions: [
          'Add a Webhook Trigger Node to your workflow',
          'Configure authentication and security settings',
          'Set allowed event types and rate limits',
          'Note the generated webhook URL'
        ],
        tips: [
          'Use authentication for production webhooks',
          'Set appropriate rate limits to prevent abuse',
          'Test webhook endpoint before connecting external systems'
        ],
        expectedOutcome: 'Webhook endpoint configured and accessible',
        completed: false
      },
      {
        id: 'step-2',
        title: 'Add Processing Logic',
        description: 'Create the core workflow processing',
        instructions: [
          'Add an Agent Node for intelligent processing',
          'Configure the agent with appropriate tools and prompts',
          'Connect webhook data to agent input',
          'Set up conditional logic if needed'
        ],
        tips: [
          'Agents can make decisions based on webhook data',
          'Use tools for external API calls and data processing',
          'Consider error handling for webhook processing'
        ],
        expectedOutcome: 'Processing logic configured for webhook data',
        completed: false
      },
      {
        id: 'step-3',
        title: 'Integrate External APIs',
        description: 'Connect to external services for actions',
        instructions: [
          'Add HTTP Client Nodes for external API calls',
          'Configure authentication and endpoints',
          'Use webhook data in API requests',
          'Handle API responses appropriately'
        ],
        tips: [
          'Use environment variables for API credentials',
          'Implement retry logic for external API calls',
          'Validate API responses before processing'
        ],
        expectedOutcome: 'External APIs integrated and functional',
        completed: false
      },
      {
        id: 'step-4',
        title: 'Add Response Handling',
        description: 'Process and return webhook responses',
        instructions: [
          'Add response formatting logic',
          'Configure success and error responses',
          'Add logging and monitoring',
          'Connect to End Node for completion'
        ],
        tips: [
          'Return appropriate HTTP status codes',
          'Log webhook processing for debugging',
          'Consider adding webhook response validation'
        ],
        expectedOutcome: 'Complete webhook processing workflow',
        completed: false
      },
      {
        id: 'step-5',
        title: 'Test Webhook Integration',
        description: 'Validate end-to-end webhook automation',
        instructions: [
          'Send test webhook to your endpoint',
          'Monitor workflow execution',
          'Verify external API calls are made',
          'Check response handling and logging'
        ],
        tips: [
          'Use tools like Postman or curl for testing',
          'Monitor workflow execution logs',
          'Test error scenarios and edge cases'
        ],
        expectedOutcome: 'Webhook automation working end-to-end',
        completed: false
      }
    ]
  },
  {
    id: 'scheduled-reports',
    name: 'Scheduled Report Generation',
    description: 'Automate report generation and distribution on schedule',
    difficulty: 'Advanced',
    category: 'Automation',
    estimatedTime: '20-25 minutes',
    tags: ['scheduling', 'reports', 'automation', 'advanced'],
    prerequisites: ['Data sources for reports', 'Distribution channels'],
    steps: [
      {
        id: 'step-1',
        title: 'Set Up Timer Trigger',
        description: 'Configure scheduled workflow execution',
        instructions: [
          'Add a Timer Start Node to your workflow',
          'Configure cron expression for desired schedule',
          'Set timezone and execution parameters',
          'Enable automatic workflow triggering'
        ],
        tips: [
          'Use cron expressions for flexible scheduling',
          'Consider timezone differences for global teams',
          'Set appropriate retry and timeout settings'
        ],
        expectedOutcome: 'Timer configured for scheduled execution',
        completed: false
      },
      {
        id: 'step-2',
        title: 'Configure Data Sources',
        description: 'Connect to data sources for report generation',
        instructions: [
          'Add appropriate data loader nodes',
          'Configure database connections or API endpoints',
          'Set up data filtering and aggregation',
          'Validate data quality and availability'
        ],
        tips: [
          'Use connection pooling for database connections',
          'Implement data validation and error handling',
          'Consider data caching for performance'
        ],
        expectedOutcome: 'Data sources connected and accessible',
        completed: false
      },
      {
        id: 'step-3',
        title: 'Create Report Logic',
        description: 'Build intelligent report generation',
        instructions: [
          'Add an Agent Node for report analysis',
          'Configure AI-powered insights and summaries',
          'Set up data visualization if needed',
          'Implement report formatting and structure'
        ],
        tips: [
          'Use AI agents for intelligent data analysis',
          'Consider different report formats (PDF, HTML, JSON)',
          'Implement report versioning and archiving'
        ],
        expectedOutcome: 'Report generation logic implemented',
        completed: false
      },
      {
        id: 'step-4',
        title: 'Set Up Distribution',
        description: 'Configure automated report distribution',
        instructions: [
          'Add HTTP Client nodes for distribution APIs',
          'Configure email, Slack, or other channels',
          'Set up recipient lists and access controls',
          'Implement delivery confirmation and tracking'
        ],
        tips: [
          'Use webhooks for real-time notifications',
          'Implement delivery failure handling',
          'Consider report access controls and security'
        ],
        expectedOutcome: 'Distribution system configured and ready',
        completed: false
      },
      {
        id: 'step-5',
        title: 'Monitor and Optimize',
        description: 'Track performance and improve the system',
        instructions: [
          'Set up execution monitoring and alerts',
          'Track report generation performance',
          'Monitor distribution success rates',
          'Implement feedback loops for improvement'
        ],
        tips: [
          'Use workflow analytics for performance insights',
          'Implement A/B testing for report formats',
          'Consider user feedback for continuous improvement'
        ],
        expectedOutcome: 'Fully automated and monitored report system',
        completed: false
      }
    ]
  }
];
