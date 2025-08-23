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
  const [activeTab, setActiveTab] = useState<
    "config" | "inputs" | "outputs" | "info"
  >("config");
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

          {/* Tab Navigation */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1 p-4 bg-gray-800 border-b border-gray-700"
          >
            {[
              { id: "config", label: "Configuration", icon: Settings },
              { id: "inputs", label: "Inputs", icon: ArrowRight },
              { id: "outputs", label: "Outputs", icon: ArrowLeft },
              { id: "info", label: "Information", icon: Info },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Inputs</h2>
                    <p className="text-sm text-gray-400">{nodeMetadata.inputs.length} parameter{nodeMetadata.inputs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {nodeMetadata.inputs.map((input, index) => (
                    <motion.div
                      key={input.name}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/30 hover:bg-gray-800/80 hover:border-blue-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-white text-sm">{input.name}</h3>
                        <div className="flex items-center gap-1">
                          {input.required && (
                            <div className="w-2 h-2 bg-red-400 rounded-full" title="Required"></div>
                          )}
                          {input.is_connection && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full" title="Connection"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {input.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">
                          {input.type}
                        </span>
                        {input.default !== undefined && (
                          <span className="text-gray-500 text-xs font-mono bg-gray-700/30 px-1 py-0.5 rounded">
                            {String(input.default)}
                          </span>
                        )}
                      </div>
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
              <div className={`${activeTab === "config" ? "p-0" : "p-6"}`}>
                {activeTab === "config" && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-700">
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-400" />
                        Configuration
                      </h2>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto">
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

                {activeTab === "inputs" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="w-5 h-5 text-blue-400" />
                      <h2 className="text-xl font-semibold text-white">Input Data</h2>
                    </div>
                    
                    {/* Execution Data Section */}
                    {executionData?.inputs && Object.keys(executionData.inputs).length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 font-medium">Live Execution Data</span>
                          <span className="text-gray-400">• {Object.keys(executionData.inputs).length} input{Object.keys(executionData.inputs).length !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="grid gap-4">
                          {Object.entries(executionData.inputs).map(([key, value]) => (
                            <div key={key} className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/30 transition-colors">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm font-mono font-medium">
                                  {key}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {typeof value === 'object' ? 'Object' : typeof value === 'string' ? 'String' : 'Value'}
                                </div>
                              </div>
                              <div className="bg-gray-900/80 rounded-lg p-4 border border-gray-700/30">
                                <pre className="text-sm text-gray-100 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Context Variables */}
                        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/30">
                          <div className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
                            Execution Context
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-xs">Current Time</span>
                              <span className="text-blue-400 font-mono">{new Date().toISOString().split('T')[1].split('.')[0]}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-xs">Today</span>
                              <span className="text-blue-400 font-mono">{new Date().toISOString().split('T')[0]}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-xs">Mode</span>
                              <span className="text-green-400 font-mono">test</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                          <ArrowRight className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="text-lg text-gray-400 mb-2">
                          {executionData?.status === 'running' 
                            ? 'Executing...' 
                            : 'No Input Data'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {executionData?.status === 'running' 
                            ? 'Node is currently processing data' 
                            : 'Execute the workflow to see input data from connected nodes'}
                        </div>
                      </div>
                    )}

                    {/* Input Schema Section */}
                    <div className="border-t border-gray-700/50 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-200">Input Schema</h3>
                      </div>
                      
                      <div className="grid gap-3">
                        {nodeMetadata.inputs.map((input) => (
                          <div
                            key={input.name}
                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:bg-gray-800/70 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="text-base font-medium text-white mb-1">
                                  {input.name}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  {input.description}
                                </p>
                              </div>
                              {input.required && (
                                <div className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                  Required
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Type:</span>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded font-mono text-xs">
                                  {input.type}
                                </span>
                              </div>
                              
                              {input.is_connection && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span className="text-blue-400 text-xs">Connection</span>
                                </div>
                              )}
                              
                              {input.default !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Default:</span>
                                  <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded font-mono text-xs">
                                    {String(input.default)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "outputs" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <ArrowLeft className="w-5 h-5 text-purple-400" />
                      <h2 className="text-xl font-semibold text-white">Output Data</h2>
                    </div>
                    
                    {/* Execution Output Section */}
                    {executionData?.outputs ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                          <span className="text-purple-400 font-medium">Generated Output</span>
                          <span className="text-gray-400">• From this node execution</span>
                        </div>
                        
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm font-mono font-medium">
                              result
                            </div>
                            <div className="text-xs text-gray-500">
                              {typeof executionData.outputs === 'object' ? 'Object' : typeof executionData.outputs === 'string' ? 'String' : 'Value'}
                            </div>
                            {typeof executionData.outputs === 'string' && (
                              <div className="text-xs text-gray-500">
                                {String(executionData.outputs).length} characters
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-gray-900/80 rounded-lg border border-gray-700/30 overflow-hidden">
                            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700/30 flex items-center justify-between">
                              <span className="text-xs text-gray-400 font-medium">OUTPUT CONTENT</span>
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
                            <div className="p-4 max-h-96 overflow-y-auto">
                              <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                                {typeof executionData.outputs === 'object' 
                                  ? JSON.stringify(executionData.outputs, null, 2) 
                                  : String(executionData.outputs)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                          <ArrowLeft className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="text-lg text-gray-400 mb-2">
                          {executionData?.status === 'running' 
                            ? 'Processing...' 
                            : 'No Output Data'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {executionData?.status === 'running' 
                            ? 'Node is generating output data' 
                            : executionData?.status === 'pending'
                            ? 'Execute the workflow to see the output data'
                            : 'No output generated yet'}
                        </div>
                      </div>
                    )}

                    {/* Output Schema Section */}
                    <div className="border-t border-gray-700/50 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-200">Output Schema</h3>
                      </div>
                      
                      <div className="grid gap-3">
                        {nodeMetadata.outputs.map((output) => (
                          <div
                            key={output.name}
                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:bg-gray-800/70 transition-colors"
                          >
                            <div className="mb-3">
                              <h4 className="text-base font-medium text-white mb-1">
                                {output.name}
                              </h4>
                              <p className="text-sm text-gray-400">
                                {output.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Type:</span>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-mono text-xs">
                                  {output.type}
                                </span>
                              </div>
                              
                              {output.format && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Format:</span>
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded font-mono text-xs">
                                    {output.format}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "info" && (
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-6">
                      Node Information
                    </h2>
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium text-white mb-2">
                            Description
                          </h3>
                          <p className="text-gray-300">
                            {nodeMetadata.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-white mb-2">
                              Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Category:</span>
                                <span className="ml-2 text-blue-400">
                                  {nodeMetadata.category}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Type:</span>
                                <span className="ml-2 text-purple-400">
                                  {nodeMetadata.node_type}
                                </span>
                              </div>
                              {nodeMetadata.version && (
                                <div>
                                  <span className="text-gray-400">
                                    Version:
                                  </span>
                                  <span className="ml-2 text-green-400">
                                    {nodeMetadata.version}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-white mb-2">
                              Statistics
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Inputs:</span>
                                <span className="ml-2 text-blue-400">
                                  {nodeMetadata.inputs.length}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Outputs:</span>
                                <span className="ml-2 text-purple-400">
                                  {nodeMetadata.outputs.length}
                                </span>
                              </div>
                              {nodeMetadata.tags &&
                                nodeMetadata.tags.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Tags:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {nodeMetadata.tags.map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                                        >
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
                            <h4 className="font-medium text-white mb-2">
                              Documentation
                            </h4>
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-purple-500 rounded-full"></div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Outputs</h2>
                    <p className="text-sm text-gray-400">{nodeMetadata.outputs.length} return{nodeMetadata.outputs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {nodeMetadata.outputs.map((output, index) => (
                    <motion.div
                      key={output.name}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/30 hover:bg-gray-800/80 hover:border-purple-500/30 transition-all cursor-pointer"
                    >
                      <h3 className="font-medium text-white text-sm mb-2">
                        {output.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {output.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-mono">
                          {output.type}
                        </span>
                        {output.format && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-mono">
                            {output.format}
                          </span>
                        )}
                      </div>
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
              {activeTab === "config" && (
                <button
                  type="button"
                  onClick={() => {
                    // Find the form within the config component container
                    const configContainer = document.querySelector(".max-w-2xl");
                    const configForm = configContainer?.querySelector("form");
                    if (configForm) {
                      configForm.requestSubmit();
                    } else {
                      console.error("No form found in config container");
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
