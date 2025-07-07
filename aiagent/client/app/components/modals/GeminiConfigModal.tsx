import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface GeminiConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const GeminiConfigModal = forwardRef<HTMLDialogElement, GeminiConfigModalProps>(
  ({ nodeData, onSave, nodeId }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);

    const [apiKey, setApiKey] = useState(nodeData?.google_api_key || "");
    const [modelName, setModelName] = useState(
      nodeData?.model_name || "gemini-1.5-flash"
    );
    const [temperature, setTemperature] = useState(
      nodeData?.temperature ?? 0.7
    );
    const [maxTokens, setMaxTokens] = useState(nodeData?.max_tokens ?? 1000);

    const geminiModels = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
    ];

    const handleSave = () => {
      onSave({
        google_api_key: apiKey,
        model_name: modelName,
        temperature: parseFloat(temperature as any),
        max_tokens: parseInt(maxTokens as any, 10),
      });
      dialogRef.current?.close();
    };

    return (
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Configure Google Gemini Model</h3>

          <div className="space-y-4 mt-4">
            {/* Model Select */}
            <div>
              <label className="label">Model</label>
              <select
                className="select select-bordered w-full"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                {geminiModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="label">Google API Key</label>
              <input
                className="input input-bordered w-full"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="your-google-api-key"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="label">Temperature</label>
              <input
                className="input input-bordered w-full"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="label">Max Tokens</label>
              <input
                className="input input-bordered w-full"
                type="number"
                min={1}
                max={8192}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="modal-action">
            <button
              className="btn btn-outline"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </dialog>
    );
  }
);

export default GeminiConfigModal;
