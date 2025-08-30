import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Shield, Monitor, Database, Key, AlertTriangle, CheckCircle, Loader, Container } from 'lucide-react';
import exportService from '~/services/exportService';
import type { 
  WorkflowExportInitResponse,
  EnvironmentVariable,
  SecurityConfig,
  MonitoringConfig,
  DockerConfig,
  WorkflowExportCompleteRequest
} from '~/types/export';

interface WorkflowExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

const WorkflowExportModal: React.FC<WorkflowExportModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  workflowName
}) => {
  // State for modal steps
  const [currentStep, setCurrentStep] = useState<'loading' | 'configure' | 'exporting' | 'complete'>('loading');
  const [exportData, setExportData] = useState<WorkflowExportInitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Environment variables state
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [envErrors, setEnvErrors] = useState<Record<string, string>>({});
  
  // Security configuration state
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    allowed_hosts: '*',
    require_api_key: false,
    custom_api_keys: ''
  });
  
  // Monitoring configuration state
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig>({
    enable_langsmith: false,
    langsmith_api_key: '',
    langsmith_project: ''
  });
  
  // Docker configuration state
  const [dockerConfig, setDockerConfig] = useState<DockerConfig>({
    api_port: 8000,
    docker_port: 8000,
    database_url: ''
  });
  
  // Export result state
  const [exportResult, setExportResult] = useState<any>(null);
  
  // Initialize export when modal opens
  useEffect(() => {
    if (isOpen && workflowId) {
      initializeExport();
    }
  }, [isOpen, workflowId]);
  
  const initializeExport = async () => {
    try {
      setCurrentStep('loading');
      setError(null);
      
      const response = await exportService.initializeExport(workflowId);
      setExportData(response);
      setCurrentStep('configure');
      
      // Initialize environment variables with defaults
      const initialEnvVars: Record<string, string> = {};
      
      // Initialize optional variables with defaults
      response.required_env_vars.optional.forEach((envVar: EnvironmentVariable) => {
        if (envVar.default) {
          initialEnvVars[envVar.name] = envVar.default;
        }
      });
      
      // Initialize node credentials with their current values (for preview)
      response.required_env_vars.required.forEach((envVar: EnvironmentVariable) => {
        const isNodeCredential = envVar.node_type && envVar.node_type.includes('(') && envVar.node_type.includes(')');
        if (isNodeCredential && envVar.example && envVar.example.length > 0) {
          // Don't pre-fill actual credentials for security, just show as placeholder
          initialEnvVars[envVar.name] = '';
        }
      });
      
      setEnvVars(initialEnvVars);
      
    } catch (err: any) {
      console.error('Export initialization failed:', err);
      setError(err.message || 'Failed to initialize export');
      setCurrentStep('configure');
    }
  };
  
  const validateEnvironmentVariables = (): boolean => {
    if (!exportData) return false;
    
    const errors: Record<string, string> = {};
    
    // Check required variables
    exportData.required_env_vars.required.forEach(envVar => {
      const value = envVars[envVar.name];
      if (!value || !value.trim()) {
        errors[envVar.name] = `${envVar.name} is required`;
      } else {
        // Validate specific formats
        if (envVar.name === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
          errors[envVar.name] = 'OpenAI API key should start with "sk-"';
        } else if (envVar.name === 'TAVILY_API_KEY' && !value.startsWith('tvly-')) {
          errors[envVar.name] = 'Tavily API key should start with "tvly-"';
        } else if (envVar.name === 'DATABASE_URL' && 
                  !value.startsWith('postgresql://') && 
                  !value.startsWith('mysql://') && 
                  !value.startsWith('sqlite://')) {
          errors[envVar.name] = 'Database URL format is invalid';
        }
      }
    });
    
    // Validate monitoring config if enabled
    if (monitoringConfig.enable_langsmith) {
      const langsmithKey = envVars['LANGCHAIN_API_KEY'];
      if (!langsmithKey || !langsmithKey.trim()) {
        errors['LANGCHAIN_API_KEY'] = 'LangSmith API key is required when monitoring is enabled';
      }
    }
    
    setEnvErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleExport = async () => {
    if (!validateEnvironmentVariables()) {
      return;
    }
    
    try {
      setCurrentStep('exporting');
      setError(null);
      
      const exportConfig: WorkflowExportCompleteRequest = {
        env_vars: envVars,
        security: securityConfig,
        monitoring: monitoringConfig,
        docker: dockerConfig
      };
      
      const result = await exportService.completeExport(workflowId, exportConfig);
      setExportResult(result);
      setCurrentStep('complete');
      
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
      setCurrentStep('configure');
    }
  };
  
  const handleDownload = async () => {
    if (exportResult?.download_url) {
      try {
        await exportService.downloadPackage(exportResult.download_url);
      } catch (err: any) {
        setError('Download failed: ' + err.message);
      }
    }
  };
  
  const renderEnvironmentVariables = () => {
    if (!exportData) return null;
    
    return (
      <div className="space-y-6">
        {/* Database Configuration */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Database Configuration
          </h4>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Database URL *
              <span className="text-xs text-purple-600 ml-2">(Required for workflow execution data)</span>
            </label>
            <input
              type="text"
              value={envVars['DATABASE_URL'] || ''}
              onChange={(e) => setEnvVars(prev => ({ ...prev, 'DATABASE_URL': e.target.value }))}
              placeholder="postgresql://user:password@localhost:5432/workflow_db"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                envErrors['DATABASE_URL'] ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {envErrors['DATABASE_URL'] && (
              <p className="text-sm text-red-600">{envErrors['DATABASE_URL']}</p>
            )}
            <p className="text-xs text-gray-500">The exported workflow will store execution data in this database</p>
          </div>
        </div>

        {/* API Keys & Credentials */}
        {exportData.required_env_vars.required.filter(env => env.name !== 'DATABASE_URL').length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Node Credentials & API Keys
            </h4>
            <div className="text-xs text-blue-700 mb-4 p-2 bg-blue-100 rounded border border-blue-200">
              <Key className="w-4 h-4 inline mr-1" />
              These credentials were found in your workflow nodes. Update them for secure deployment.
            </div>
            <div className="space-y-4">
              {exportData.required_env_vars.required.filter(env => env.name !== 'DATABASE_URL').map((envVar) => {
                const isNodeCredential = envVar.node_type && envVar.node_type.includes('(') && envVar.node_type.includes(')');
                const nodeId = isNodeCredential ? envVar.node_type.match(/\(([^)]+)\)/)?.[1] : null;
                
                return (
                  <div key={envVar.name} className={`space-y-2 p-3 rounded-lg border ${
                    isNodeCredential 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-white border-blue-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {envVar.name} *
                        <span className="text-xs text-blue-600 ml-2">({envVar.node_type || 'System'})</span>
                      </label>
                      {isNodeCredential && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          From Node: {nodeId}
                        </span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={envVars[envVar.name] || ''}
                      onChange={(e) => setEnvVars(prev => ({ ...prev, [envVar.name]: e.target.value }))}
                      placeholder={envVar.example}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        envErrors[envVar.name] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {envErrors[envVar.name] && (
                      <p className="text-sm text-red-600">{envErrors[envVar.name]}</p>
                    )}
                    <p className="text-xs text-gray-500">{envVar.description}</p>
                    {isNodeCredential && envVar.example && (
                      <p className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        💡 Current value preview: {envVar.example}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Optional Configuration Variables */}
        {exportData.required_env_vars.optional.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Optional Configuration
            </h4>
            <div className="text-xs text-indigo-700 mb-4 p-2 bg-indigo-100 rounded border border-indigo-200">
              <Key className="w-4 h-4 inline mr-1" />
              These are optional settings with default values. You can customize them or leave defaults.
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {exportData.required_env_vars.optional.map((envVar) => {
                // Skip monitoring variables, they'll be in their own section
                if (envVar.name.toLowerCase().includes('langchain') || envVar.name.toLowerCase().includes('langsmith')) {
                  return null;
                }
                
                return (
                  <div key={envVar.name} className="space-y-2 p-3 rounded-lg border bg-white border-indigo-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {envVar.name}
                        <span className="text-xs text-indigo-600 ml-2">({envVar.node_type || 'System'})</span>
                      </label>
                      {envVar.default && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          Default: {envVar.default}
                        </span>
                      )}
                    </div>
                    <input
                      type={envVar.name.toLowerCase().includes('api_key') ? 'password' : 'text'}
                      value={envVars[envVar.name] || envVar.default || ''}
                      onChange={(e) => setEnvVars(prev => ({ ...prev, [envVar.name]: e.target.value }))}
                      placeholder={envVar.example || envVar.default}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        envErrors[envVar.name] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {envErrors[envVar.name] && (
                      <p className="text-sm text-red-600">{envErrors[envVar.name]}</p>
                    )}
                    <p className="text-xs text-gray-500">{envVar.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Monitoring */}
        {exportData.required_env_vars.optional.some(env => env.name.toLowerCase().includes('langchain') || env.name.toLowerCase().includes('langsmith')) && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-600" />
                Performance Monitoring
              </h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={monitoringConfig.enable_langsmith}
                  onChange={(e) => setMonitoringConfig(prev => ({ ...prev, enable_langsmith: e.target.checked }))}
                  className="rounded border-green-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable LangSmith Monitoring
                </span>
              </label>
            </div>
            
            <div className="text-xs text-green-700 mb-3 p-2 bg-green-100 rounded border border-green-200">
              <Monitor className="w-4 h-4 inline mr-1" />
              Optional: Track workflow performance, execution traces, and debugging information
            </div>
            
            {monitoringConfig.enable_langsmith && (
              <div className="bg-white rounded-lg p-3 border border-green-100 space-y-4">
                {exportData.required_env_vars.optional.filter(env =>
                  env.name.toLowerCase().includes('langchain') || env.name.toLowerCase().includes('langsmith')
                ).map((envVar) => (
                  <div key={envVar.name} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {envVar.name}
                      <span className="text-xs text-green-600 ml-2">({envVar.node_type || 'System'})</span>
                    </label>
                    <input
                      type="password"
                      value={envVars[envVar.name] || ''}
                      onChange={(e) => setEnvVars(prev => ({ ...prev, [envVar.name]: e.target.value }))}
                      placeholder={envVar.example}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        envErrors[envVar.name] ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {envErrors[envVar.name] && (
                      <p className="text-sm text-red-600">{envErrors[envVar.name]}</p>
                    )}
                    <p className="text-xs text-gray-500">{envVar.description}</p>
                  </div>
                ))}
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Project Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={monitoringConfig.langsmith_project || ''}
                    onChange={(e) => setMonitoringConfig(prev => ({ ...prev, langsmith_project: e.target.value }))}
                    placeholder={workflowName.toLowerCase().replace(/\s+/g, '-')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500">
                    Leave empty to use workflow name as project name
                  </p>
                </div>
              </div>
            )}
            
            {!monitoringConfig.enable_langsmith && (
              <div className="text-center py-6 text-gray-500">
                <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Monitoring is disabled</p>
                <p className="text-xs">Enable to track workflow performance and debugging</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderSecurityConfig = () => (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5 text-orange-600" />
        Security & Docker Configuration
      </h4>
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-3 border border-orange-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Container className="w-4 h-4 inline mr-2" />
            Docker Port Configuration
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600">Internal Port</label>
              <input
                type="number"
                value={dockerConfig.api_port}
                onChange={(e) => setDockerConfig(prev => ({ ...prev, api_port: parseInt(e.target.value) }))}
                min={1000}
                max={65535}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">External Port</label>
              <input
                type="number"
                value={dockerConfig.docker_port}
                onChange={(e) => setDockerConfig(prev => ({ ...prev, docker_port: parseInt(e.target.value) }))}
                min={1000}
                max={65535}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-orange-100">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={securityConfig.require_api_key}
                onChange={(e) => setSecurityConfig(prev => ({ ...prev, require_api_key: e.target.checked }))}
                className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable API Key Authentication
              </span>
            </label>
          </div>
          
          <div className="text-xs text-gray-500 mb-3 p-2 bg-orange-50 rounded border border-orange-200">
            <Shield className="w-4 h-4 inline mr-1" />
            Host Access: All hosts allowed (*) - Maximum accessibility for public deployment
          </div>
          
          {securityConfig.require_api_key && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom API Keys (Optional)
              </label>
              <textarea
                value={securityConfig.custom_api_keys || ''}
                onChange={(e) => setSecurityConfig(prev => ({ ...prev, custom_api_keys: e.target.value }))}
                placeholder="my_custom_key_1,my_app_key_2,my_service_key_3"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add custom API keys (comma-separated). System will generate additional keys automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  

  
  const renderLoadingStep = () => (
    <div className="text-center py-8">
      <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Workflow</h3>
      <p className="text-gray-600">Extracting dependencies and requirements...</p>
    </div>
  );
  
  const renderConfigureStep = () => (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {exportData && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Workflow Information</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Name:</strong> {exportData.workflow_name}</p>
              <p><strong>Nodes:</strong> {exportData.dependencies.nodes.join(', ')}</p>
              <p><strong>Required Variables:</strong> {exportData.required_env_vars.required.length}</p>
              <p><strong>Optional Variables:</strong> {exportData.required_env_vars.optional.length}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {renderEnvironmentVariables()}
            {renderSecurityConfig()}
          </div>
        </>
      )}
    </div>
  );
  
  const renderExportingStep = () => (
    <div className="text-center py-8">
      <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating Export Package</h3>
      <p className="text-gray-600">Building Docker container and configuration files...</p>
    </div>
  );
  
  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Complete!</h3>
      <p className="text-gray-600 mb-6">Your workflow is ready to run in Docker</p>
      
      {exportResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-semibold text-green-900 mb-2">Package Information</h4>
          <div className="text-sm text-green-800 space-y-1">
            <p><strong>Size:</strong> {Math.round(exportResult.package_size / 1024)} KB</p>
            <p><strong>Port:</strong> {exportResult.package_info.api_port}</p>
            <p><strong>Security:</strong> {exportResult.package_info.security_enabled ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Monitoring:</strong> {exportResult.package_info.monitoring_enabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
        <h4 className="font-semibold text-gray-900 mb-2">Quick Start Instructions</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>1. Extract the downloaded package</p>
          <p>2. Run: <code className="bg-gray-200 px-2 py-1 rounded">docker-compose up -d</code></p>
          <p>3. Access: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:{dockerConfig.docker_port}</code></p>
        </div>
      </div>
      
      <button
        onClick={handleDownload}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
      >
        <Download className="w-5 h-5" />
        Download Package
      </button>
    </div>
  );
  
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <Container className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Docker Export
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{workflowName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {currentStep === 'loading' && renderLoadingStep()}
            {currentStep === 'configure' && renderConfigureStep()}
            {currentStep === 'exporting' && renderExportingStep()}
            {currentStep === 'complete' && renderCompleteStep()}
          </div>
        </div>
        
        {/* Footer */}
        {currentStep === 'configure' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Create Docker Export
            </button>
          </div>
        )}
        
        {currentStep === 'complete' && (
          <div className="flex items-center justify-center p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default WorkflowExportModal;
