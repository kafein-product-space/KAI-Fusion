import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MessageCircle, 
  Eye, 
  Globe, 
  Activity, 
  Settings, 
  Send, 
  Loader, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Bot,
  User
} from 'lucide-react';
import { externalWorkflowService } from '../../services/externalWorkflowService';

interface ExternalWorkflowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

interface WorkflowInfo {
  workflow_id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  status: string;
  read_only: boolean;
  workflow_structure: {
    nodes: any[];
    edges: any[];
    nodes_count: number;
    edges_count: number;
    llm_nodes: any[];
    memory_nodes: any[];
    memory_enabled: boolean;
  };
  capabilities: {
    chat: boolean;
    memory: boolean;
    info_access: boolean;
    modification: boolean;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const ExternalWorkflowDetailModal: React.FC<ExternalWorkflowDetailModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  workflowName
}) => {
  const [currentView, setCurrentView] = useState<'overview' | 'nodes' | 'chat'>('overview');
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(`external_${workflowId}_${Date.now()}`);

  useEffect(() => {
    if (isOpen) {
      loadWorkflowInfo();
    }
  }, [isOpen, workflowId]);

  const loadWorkflowInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await externalWorkflowService.getExternalWorkflowInfo(workflowId);
      setWorkflowInfo(info);
    } catch (err: any) {
      console.error('Failed to load workflow info:', err);
      setError(err.message || 'Failed to load workflow information');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isSending || !workflowInfo?.capabilities.chat) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsSending(true);

    try {
      const response = await externalWorkflowService.chatWithExternalWorkflow(
        workflowId,
        currentMessage,
        sessionId
      );

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.response || 'No response received',
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to send message'}`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {workflowInfo && (
        <>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {workflowInfo.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {workflowInfo.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4 text-blue-500" />
                    {workflowInfo.host}:{workflowInfo.port}
                  </span>
                  <span className={`flex items-center gap-1 ${
                    workflowInfo.status === 'online' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    <Activity className="w-4 h-4" />
                    {workflowInfo.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-300">Nodes</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                {workflowInfo.workflow_structure.nodes_count}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Total workflow nodes
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-purple-900 dark:text-purple-300">LLM Nodes</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {workflowInfo.workflow_structure.llm_nodes.length}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400">
                AI language models
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-900 dark:text-amber-300">Memory</span>
              </div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">
                {workflowInfo.workflow_structure.memory_enabled ? 'ON' : 'OFF'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Conversation memory
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Capabilities
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  workflowInfo.capabilities.chat ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Chat Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  workflowInfo.capabilities.memory ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Memory Support</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  workflowInfo.capabilities.info_access ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Read Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  workflowInfo.capabilities.modification ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {workflowInfo.capabilities.modification ? 'Editable' : 'Read-Only'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderNodes = () => (
    <div className="space-y-6">
      {workflowInfo && (
        <>
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Read-Only View:</strong> You can view the workflow structure but cannot modify it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" />
                LLM Nodes ({workflowInfo.workflow_structure.llm_nodes.length})
              </h4>
              {workflowInfo.workflow_structure.llm_nodes.map((node, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-900 dark:text-blue-300">
                      {node.data?.displayName || node.type}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    ID: {node.id}
                  </p>
                  {node.data?.model_name && (
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Model: {node.data.model_name}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                Memory Nodes ({workflowInfo.workflow_structure.memory_nodes.length})
              </h4>
              {workflowInfo.workflow_structure.memory_nodes.map((node, index) => (
                <div key={index} className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-purple-900 dark:text-purple-300">
                      {node.data?.displayName || node.type}
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    ID: {node.id}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-500" />
              All Nodes ({workflowInfo.workflow_structure.nodes_count})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {workflowInfo.workflow_structure.nodes.map((node, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {node.data?.displayName || node.type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {node.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="space-y-4 h-96 flex flex-col">
      {!workflowInfo?.capabilities.chat ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Chat Not Available
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              This external workflow doesn't support chat functionality.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Chat Active:</strong> You can chat with this external workflow. 
                {workflowInfo.capabilities.memory && ' Conversation memory is enabled.'}
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Start a conversation with the external workflow</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        <span className="text-xs opacity-75">
                          {message.role === 'user' ? 'You' : 'AI'}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-xl max-w-xs">
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isSending}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {workflowName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">External Workflow Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setCurrentView('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              currentView === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentView('nodes')}
            className={`px-6 py-3 font-medium transition-colors ${
              currentView === 'nodes'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Nodes Structure
          </button>
          <button
            onClick={() => setCurrentView('chat')}
            className={`px-6 py-3 font-medium transition-colors ${
              currentView === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Chat
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-240px)] bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500 dark:text-blue-400" />
                <p className="text-gray-600 dark:text-gray-300">Loading workflow information...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Workflow</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                <button
                  onClick={loadWorkflowInfo}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {currentView === 'overview' && renderOverview()}
                {currentView === 'nodes' && renderNodes()}
                {currentView === 'chat' && renderChat()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExternalWorkflowDetailModal;
