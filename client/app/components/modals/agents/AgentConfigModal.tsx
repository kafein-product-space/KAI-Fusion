import React, {
  forwardRef,
  useState,
  useImperativeHandle,
  useEffect,
} from "react";
import {
  Settings,
  X,
  CheckCircle,
  Wrench,
  Brain,
  MessageSquare,
  Shield,
  Save,
} from "lucide-react";

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
  nodeData: Partial<AgentConfig>;
  onSave: (config: AgentConfig) => void;
}

const AgentConfigModal = forwardRef<HTMLDialogElement, AgentConfigModalProps>(
  ({ nodeData, onSave }, ref) => {
    const [config, setConfig] = useState<AgentConfig>({
      name: nodeData?.name || "Tool Agent",
      tools: nodeData?.tools || [],
      memory: nodeData?.memory || { type: "buffer", size: 100 },
      model: nodeData?.model || { provider: "openai", model: "gpt-4" },
      prompt: nodeData?.prompt || "Sen yardımcı bir AI asistanısın.",
      moderation: nodeData?.moderation || { enabled: false },
      ...nodeData,
    });

    const [availableTools] = useState([
      {
        id: "calculator",
        name: "Calculator",
        description: "Matematik hesaplamaları",
      },
      { id: "websearch", name: "Web Search", description: "İnternet araması" },
      {
        id: "textanalyzer",
        name: "Text Analyzer",
        description: "Metin analizi",
      },
      {
        id: "fileprocessor",
        name: "File Processor",
        description: "Dosya işleme",
      },
      { id: "database", name: "Database", description: "Veritabanı sorguları" },
      { id: "email", name: "Email", description: "Email gönderme" },
    ]);

    const dialogRef = React.useRef<HTMLDialogElement>(null);

    // Ref dışarıdan kontrol için expose edilir
    useImperativeHandle(ref, () => dialogRef.current!);

    const handleToolToggle = (toolId: string) => {
      setConfig((prev) => ({
        ...prev,
        tools: prev.tools.includes(toolId)
          ? prev.tools.filter((t) => t !== toolId)
          : [...prev.tools, toolId],
      }));
    };

    const handleSave = () => {
      onSave(config);
      dialogRef.current?.close();
    };

    const handleClose = () => {
      dialogRef.current?.close();
    };

    return (
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Agent Konfigürasyonu
            </h3>
            <form method="dialog">
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={handleClose}
              >
                <X />
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {/* Agent Adı */}
            <div>
              <label className="label">
                <span className="label-text">Agent Adı</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Araçlar */}
            <div>
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Araçlar
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableTools.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => handleToolToggle(tool.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      config.tools.includes(tool.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{tool.name}</h4>
                        <p className="text-sm text-gray-500">
                          {tool.description}
                        </p>
                      </div>
                      {config.tools.includes(tool.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hafıza ve Model Ayarları */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    Hafıza Tipi
                  </span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.memory.type}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      memory: { ...prev.memory, type: e.target.value },
                    }))
                  }
                >
                  <option value="buffer">Buffer Memory</option>
                  <option value="summary">Summary Memory</option>
                  <option value="vector">Vector Memory</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Hafıza Boyutu</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={config.memory.size}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      memory: {
                        ...prev.memory,
                        size: parseInt(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>

            {/* Model Ayarları */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    Model Sağlayıcı
                  </span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.model.provider}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      model: { ...prev.model, provider: e.target.value },
                    }))
                  }
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Model</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={config.model.model}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      model: { ...prev.model, model: e.target.value },
                    }))
                  }
                >
                  {config.model.provider === "openai" && (
                    <>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  )}
                  {config.model.provider === "anthropic" && (
                    <>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </>
                  )}
                  {config.model.provider === "google" && (
                    <>
                      <option value="gemini-pro">Gemini Pro</option>
                      <option value="gemini-ultra">Gemini Ultra</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="label">
                <span className="label-text">Prompt Template</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={4}
                value={config.prompt}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, prompt: e.target.value }))
                }
              />
            </div>

            {/* Moderation */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Moderasyon Açık
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-info"
                  checked={config.moderation.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      moderation: {
                        ...prev.moderation,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog" className="flex gap-3">
              <button className="btn" onClick={handleClose}>
                İptal
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </form>
          </div>
        </div>
      </dialog>
    );
  }
);

export default AgentConfigModal;
