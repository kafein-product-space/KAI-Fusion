import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface OpenAIChatConfig {
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  credential_name?: string;
  api_key?: string;
}

interface OpenAIChatNodeModalProps {
  nodeData: any;
  onSave: (data: OpenAIChatConfig) => void;
  nodeId: string;
}

const OpenAIChatNodeModal = forwardRef<
  HTMLDialogElement,
  OpenAIChatNodeModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [config, setConfig] = useState<OpenAIChatConfig>({
    model_name: nodeData?.model_name || "gpt-3.5-turbo",
    temperature: nodeData?.temperature ?? 0.7,
    max_tokens: nodeData?.max_tokens ?? 500,
    credential_name: nodeData?.credential_name || "",
    api_key: nodeData?.api_key || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]:
        name === "temperature" || name === "max_tokens"
          ? parseFloat(value)
          : value,
    }));
  };

  const handleSave = async () => {
    try {
      // Validate credentials via proper credentials API
      const validationPayload = {
        type: "openai",
        api_key: config.api_key,
        model_name: config.model_name
      };

      const response = await fetch(
        "http://localhost:8001/api/v1/credentials/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Credential validation failed");
      }

      const result = await response.json();
      
      // Save configuration on successful validation
      onSave(config);
      dialogRef.current?.close();
      alert(`✅ ${result.message}`);
      
    } catch (error) {
      console.error("Validation error:", error);
      alert(`❌ ${error.message || "Credential validation failed. Please check your API key."}`);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">OpenAI Chat Ayarları</h3>

        <div className="form-control flex flex-col gap-2">
          <label className="label">Model</label>
          <select
            name="model_name"
            className="select select-bordered w-full"
            value={config.model_name}
            onChange={handleChange}
          >
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4">gpt-4</option>
            <option value="gpt-4o">gpt-4o</option>
          </select>
        </div>

        <div className="form-control flex flex-col gap-2">
          <label className="label">Temperature (0 - 2)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            name="temperature"
            value={config.temperature}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control flex flex-col gap-2">
          <label className="label">Max Tokens</label>
          <input
            type="number"
            name="max_tokens"
            value={config.max_tokens}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control flex flex-col gap-2">
          <label className="label">Credential Name</label>
          <input
            type="text"
            name="credential_name"
            value={config.credential_name}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control flex flex-col gap-2">
          <label className="label">API Key</label>
          <input
            type="password"
            name="api_key"
            value={config.api_key}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="modal-action flex gap-2">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            İptal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default OpenAIChatNodeModal;
