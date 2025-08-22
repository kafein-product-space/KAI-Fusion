import React, { useState, useEffect } from 'react';
import { X, Settings, Info, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NodeInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
  is_connection: boolean;
  default?: any;
  validation_rules?: any;
  ui_config?: any;
}

interface NodeOutput {
  name: string;
  type: string;
  description: string;
  format?: string;
  output_schema?: any;
}

interface NodeMetadata {
  name: string;
  description: string;
  display_name?: string;
  icon?: string;
  color?: string;
  category: string;
  node_type: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  version?: string;
  tags?: string[];
  documentation_url?: string;
  examples?: any[];
}

interface FullscreenNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeMetadata: NodeMetadata;
  configData: any;
  onSave: (values: any) => void;
  ConfigComponent: React.ComponentType<{
    configData: any;
    onSave: (values: any) => void;
    onCancel: () => void;
  }>;
}

export default function FullscreenNodeModal({
  isOpen,
  onClose,
  nodeMetadata,
  configData,
  onSave,
  ConfigComponent
}: FullscreenNodeModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'inputs' | 'outputs' | 'info'>('config');
  const [configValues, setConfigValues] = useState(configData);
  
  useEffect(() => {
    setConfigValues(configData);
  }, [configData]);

  const handleSave = (values: any) => {
    setConfigValues(values);
    onSave(values);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="w-full h-full flex flex-col bg-gray-900">
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-3">
                {nodeMetadata.icon && (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {nodeMetadata.display_name || nodeMetadata.name}
                  </h1>
                  <p className="text-sm text-gray-400">{nodeMetadata.category}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-gray-700 text-xs text-gray-300">
                {nodeMetadata.node_type}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1 p-4 bg-gray-800 border-b border-gray-700"
          >
            {[
              { id: 'config', label: 'Configuration', icon: Settings },
              { id: 'inputs', label: 'Inputs', icon: ArrowRight },
              { id: 'outputs', label: 'Outputs', icon: ArrowLeft },
              { id: 'info', label: 'Information', icon: Info }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Inputs */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-1/3 bg-gray-850 border-r border-gray-700 overflow-y-auto hidden lg:block"
            >
              <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                  Inputs ({nodeMetadata.inputs.length})
                </h2>
                <div className="space-y-4">
                  {nodeMetadata.inputs.map((input, index) => (
                    <motion.div
                      key={input.name}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-white">{input.name}</h3>
                        <div className="flex items-center gap-2">
                          {input.required && (
                            <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">
                              Required
                            </span>
                          )}
                          {input.is_connection && (
                            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                              Connection
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{input.description}</p>
                      <div className="text-xs text-gray-500">
                        Type: <span className="text-blue-400 font-mono">{input.type}</span>
                      </div>
                      {input.default !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          Default: <span className="text-green-400 font-mono">{String(input.default)}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Center Panel - Main Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex-1 overflow-y-auto lg:w-auto w-full"
            >
              <div className={`${activeTab === 'config' ? 'p-0' : 'p-6'}`}>
                {activeTab === 'config' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-700">
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-400" />
                        Configuration
                      </h2>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="max-w-2xl mx-auto">
                        <ConfigComponent
                          configData={configValues}
                          onSave={handleSave}
                          onCancel={onClose}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inputs' && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-6">Input Details</h2>
                    <div className="space-y-4">
                      {nodeMetadata.inputs.map((input) => (
                        <div key={input.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                          <h3 className="text-lg font-medium text-white mb-3">{input.name}</h3>
                          <p className="text-gray-300 mb-4">{input.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Type:</span>
                              <span className="ml-2 text-blue-400 font-mono">{input.type}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Required:</span>
                              <span className={`ml-2 ${input.required ? 'text-red-400' : 'text-green-400'}`}>
                                {input.required ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Connection:</span>
                              <span className={`ml-2 ${input.is_connection ? 'text-blue-400' : 'text-gray-400'}`}>
                                {input.is_connection ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {input.default !== undefined && (
                              <div>
                                <span className="text-gray-400">Default:</span>
                                <span className="ml-2 text-green-400 font-mono">{String(input.default)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'outputs' && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-6">Output Details</h2>
                    <div className="space-y-4">
                      {nodeMetadata.outputs.map((output) => (
                        <div key={output.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                          <h3 className="text-lg font-medium text-white mb-3">{output.name}</h3>
                          <p className="text-gray-300 mb-4">{output.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Type:</span>
                              <span className="ml-2 text-purple-400 font-mono">{output.type}</span>
                            </div>
                            {output.format && (
                              <div>
                                <span className="text-gray-400">Format:</span>
                                <span className="ml-2 text-yellow-400">{output.format}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'info' && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-6">Node Information</h2>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-2">Description</h3>
                          <p className="text-gray-300">{nodeMetadata.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-white mb-2">Details</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Category:</span>
                                <span className="ml-2 text-blue-400">{nodeMetadata.category}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Type:</span>
                                <span className="ml-2 text-purple-400">{nodeMetadata.node_type}</span>
                              </div>
                              {nodeMetadata.version && (
                                <div>
                                  <span className="text-gray-400">Version:</span>
                                  <span className="ml-2 text-green-400">{nodeMetadata.version}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-white mb-2">Statistics</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Inputs:</span>
                                <span className="ml-2 text-blue-400">{nodeMetadata.inputs.length}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Outputs:</span>
                                <span className="ml-2 text-purple-400">{nodeMetadata.outputs.length}</span>
                              </div>
                              {nodeMetadata.tags && nodeMetadata.tags.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Tags:</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {nodeMetadata.tags.map((tag, i) => (
                                      <span key={i} className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {nodeMetadata.documentation_url && (
                          <div>
                            <h4 className="font-medium text-white mb-2">Documentation</h4>
                            <a
                              href={nodeMetadata.documentation_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm underline"
                            >
                              View documentation
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Panel - Outputs */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-1/3 bg-gray-850 border-l border-gray-700 overflow-y-auto hidden lg:block"
            >
              <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5 text-purple-400" />
                  Outputs ({nodeMetadata.outputs.length})
                </h2>
                <div className="space-y-4">
                  {nodeMetadata.outputs.map((output, index) => (
                    <motion.div
                      key={output.name}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700"
                    >
                      <h3 className="font-medium text-white mb-2">{output.name}</h3>
                      <p className="text-sm text-gray-400 mb-2">{output.description}</p>
                      <div className="text-xs text-gray-500">
                        Type: <span className="text-purple-400 font-mono">{output.type}</span>
                      </div>
                      {output.format && (
                        <div className="text-xs text-gray-500 mt-1">
                          Format: <span className="text-yellow-400 font-mono">{output.format}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800"
          >
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Node Type: {nodeMetadata.node_type}</span>
              <span>•</span>
              <span>Category: {nodeMetadata.category}</span>
              {nodeMetadata.version && (
                <>
                  <span>•</span>
                  <span>Version: {nodeMetadata.version}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              >
                Cancel
              </button>
              {activeTab === 'config' && (
                <button
                  onClick={() => {
                    // Trigger save from config component
                    const configForm = document.querySelector('form');
                    if (configForm) {
                      configForm.requestSubmit();
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}