import React, { useState, useEffect } from "react";
import { X, Settings, Info, Save, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  executionData?: {
    nodeId: string;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    status?: 'completed' | 'failed' | 'running' | 'pending';
  };
}

export default function FullscreenNodeModal({
  isOpen,
  onClose,
  nodeMetadata,
  configData,
  onSave,
  ConfigComponent,
  executionData,
}: FullscreenNodeModalProps) {
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
    if (e.key === "Escape") {
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
                  <p className="text-sm text-gray-400">
                    {nodeMetadata.category}
                  </p>
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

          {/* Content Area - 3 Column Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column - Input Data */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-1/3 bg-gray-850 border-r border-gray-700 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Input Data</h2>
                </div>
                
                {/* Execution Data Section */}
                {executionData?.inputs && Object.keys(executionData.inputs).length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-medium">Live Data</span>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(executionData.inputs).map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs font-mono">
                              {key}
                            </div>
                          </div>
                          <div className="bg-gray-900/80 rounded p-2 border border-gray-700/30">
                            <pre className="text-xs text-gray-100 whitespace-pre-wrap overflow-x-auto max-h-24 overflow-y-auto">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Context Variables */}
                    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30">
                      <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                        Context
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="text-blue-400 font-mono">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mode:</span>
                          <span className="text-green-400 font-mono">test</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="text-sm text-gray-400 mb-1">
                      {executionData?.status === 'running' 
                        ? 'Executing...' 
                        : 'No Input Data'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Execute workflow to see data
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Center Column - Configuration */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-1 overflow-y-auto bg-gray-900"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-400" />
                    Configuration
                  </h2>
                </div>
                <div className="flex-1 p-3 overflow-y-auto">
                  <div className="max-w-full">
                    <ConfigComponent
                      configData={configValues}
                      onSave={handleSave}
                      onCancel={onClose}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Output Data */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-1/3 bg-gray-850 border-l border-gray-700 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                  <ArrowLeft className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-white">Output Data</h2>
                </div>
                
                {/* Execution Output Section */}
                {executionData?.outputs ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-purple-400 font-medium">Generated</span>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-3 border border-purple-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs font-mono">
                          result
                        </div>
                        <div className="text-xs text-gray-500">
                          {typeof executionData.outputs === 'string' && `${String(executionData.outputs).length} chars`}
                        </div>
                      </div>
                      
                      <div className="bg-gray-900/80 rounded border border-gray-700/30 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700/30 flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-medium">OUTPUT</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(
                              typeof executionData.outputs === 'object' 
                                ? JSON.stringify(executionData.outputs, null, 2)
                                : String(executionData.outputs)
                            )}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="p-3 max-h-64 overflow-y-auto">
                          <pre className="text-xs text-gray-100 whitespace-pre-wrap">
                            {typeof executionData.outputs === 'object' 
                              ? JSON.stringify(executionData.outputs, null, 2) 
                              : String(executionData.outputs)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="text-sm text-gray-400 mb-1">
                      {executionData?.status === 'running' 
                        ? 'Processing...' 
                        : 'No Output Data'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Execute workflow to see output
                    </div>
                  </div>
                )}
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
              <button
                type="button"
                onClick={() => {
                  // Find the form within the config component container
                  const configForm = document.querySelector("form");
                  if (configForm) {
                    configForm.requestSubmit();
                  } else {
                    console.error("No form found");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
