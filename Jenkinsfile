pipeline {
   agent any
 
   environment {
    VITE_API_BASE_URL = 'http://3.68.112.56:8000'
    VITE_API_VERSION = '/api/v1'
    VITE_NODE_ENV = 'production'
    VITE_ENABLE_LOGGING = 'true'
 
    ASYNC_DATABASE_URL = 'postgresql+asyncpg://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres'
    DATABASE_URL = 'postgresql://postgres.xjwosoxtrzysncbjrwlt:flowisekafein1!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres'
    CREATE_DATABASE = 'false'
    POSTGRES_DB = 'postgres.xjwosoxtrzysncbjrwlt'
    POSTGRES_PASSWORD = credentials('postgres_pass')
 
    //SECRET_KEY = 'your-development-secret-key-here'
    //CREDENTIAL_MASTER_KEY = 'your-credential-master-key-here'
 
    //TAVILY_API_KEY = 'YOUR_TAVILY_API_KEY_HERE'
    LANGCHAIN_TRACING_V2 = 'true'
    LANGCHAIN_API_KEY = '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'
    LANGCHAIN_PROJECT = 'kai-fusion-workflows'
    LANGCHAIN_ENDPOINT = 'https://api.smith.langchain.com'
    ENABLE_WORKFLOW_TRACING = 'true'
    TRACE_MEMORY_OPERATIONS = 'true'
    TRACE_AGENT_REASONING = 'true'
   }
 
   stages {
      stage('Checkout') {
           steps {
               git(
                url: 'git@github.com:MetehanaydemirKafein/KAI-Fusion.git',
                branch: 'main',
                credentialsId: '6d17e81e-750b-4690-81db-0c7616c520bb'
               )
           }
       }
 
       stage('Install Dependencies') {
           steps {
               sh 'npm install'
           }
       }
 
       stage('Build') {
           steps {
               sh 'npm run build'
           }
       }
 
       stage('Deploy (Optional)') {
           steps {
               echo 'Deploy aşaması buraya yazılabilir...'
           }
       }
   }
}