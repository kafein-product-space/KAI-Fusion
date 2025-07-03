import React, { useState } from "react";
import { X, Settings, Wrench, CheckCircle, Brain, MessageSquare, Shield, Save } from "lucide-react";

interface AgentConfig {
  name: string;
  tools: string[];
  memory: { type: string; size: number };
  model: { provider: string; model: string };
  prompt: string;
  moderation: { enabled: boolean };
  [key: string]: any;
}

interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: Partial<AgentConfig>;
  onSave: (config: AgentConfig) => void;
}

function AgentConfigModal({ isOpen, onClose, nodeData, onSave }: AgentConfigModalProps) {
  const [config, setConfig] = useState<AgentConfig>({
    name: nodeData?.name || "Tool Agent",
    tools: nodeData?.tools || [],
    memory: nodeData?.memory || { type: "buffer", size: 100 },
    model: nodeData?.model || { provider: "openai", model: "gpt-4" },
    prompt: nodeData?.prompt || "Sen yardımcı bir AI asistanısın.",
    moderation: nodeData?.moderation || { enabled: false },
    ...nodeData
  });

  const [availableTools] = useState([
    { id: "calculator", name: "Calculator", description: "Matematik hesaplamaları" },
    { id: "websearch", name: "Web Search", description: "İnternet araması" },
    { id: "textanalyzer", name: "Text Analyzer", description: "Metin analizi" },
    { id: "fileprocessor", name: "File Processor", description: "Dosya işleme" },
    { id: "database", name: "Database", description: "Veritabanı sorguları" },
    { id: "email", name: "Email", description: "Email gönderme" }
  ]);

  const handleToolToggle = (toolId: string) => {
    setConfig((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...prev.tools, toolId]
    }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 w-[20vw]">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-[20vw] max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Agent Konfigürasyonu
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Agent Adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Adı
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Agent adını girin"
            />
          </div>

          {/* Araçlar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Wrench className="w-4 h-4 inline mr-2" />
              Araçlar
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => handleToolToggle(tool.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    config.tools.includes(tool.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{tool.name}</h4>
                      <p className="text-sm text-gray-600">{tool.description}</p>
                    </div>
                    {config.tools.includes(tool.id) && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hafıza Ayarları */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Brain className="w-4 h-4 inline mr-2" />
              Hafıza Ayarları
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hafıza Tipi</label>
                <select
                  value={config.memory.type}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    memory: { ...prev.memory, type: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="buffer">Buffer Memory</option>
                  <option value="summary">Summary Memory</option>
                  <option value="vector">Vector Memory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hafıza Boyutu</label>
                <input
                  type="number"
                  value={config.memory.size}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    memory: { ...prev.memory, size: parseInt(e.target.value) }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Model Ayarları */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Model Ayarları
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sağlayıcı</label>
                <select
                  value={config.model.provider}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    model: { ...prev.model, provider: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="local">Local Model</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Model</label>
                <select
                  value={config.model.model}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    model: { ...prev.model, model: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {config.model.provider === 'openai' && (
                    <>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  )}
                  {config.model.provider === 'anthropic' && (
                    <>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </>
                  )}
                  {config.model.provider === 'google' && (
                    <>
                      <option value="gemini-pro">Gemini Pro</option>
                      <option value="gemini-ultra">Gemini Ultra</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Prompt Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Template
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => setConfig((prev) => ({ ...prev, prompt: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Agent'ın davranış şablonunu girin..."
            />
          </div>

          {/* Moderasyon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Shield className="w-4 h-4 inline mr-2" />
              Moderasyon
            </label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.moderation.enabled}
                onChange={(e) => setConfig((prev) => ({
                  ...prev,
                  moderation: { ...prev.moderation, enabled: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">
                Girdi moderasyonunu etkinleştir
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentConfigModal; 