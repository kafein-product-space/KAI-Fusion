import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ClaudeConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ClaudeConfigModal = forwardRef<HTMLDialogElement, ClaudeConfigModalProps>(
  ({ nodeData, onSave, nodeId }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);

    const [apiKey, setApiKey] = useState(nodeData?.anthropic_api_key || "");
    const [modelName, setModelName] = useState(
      nodeData?.model_name || "claude-3-haiku-20240307"
    );
    const [temperature, setTemperature] = useState(
      nodeData?.temperature ?? 0.7
    );
    const [maxTokens, setMaxTokens] = useState(nodeData?.max_tokens ?? 1000);

    const claudeModels = [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];

    const handleSave = () => {
      onSave({
        anthropic_api_key: apiKey,
        model_name: modelName,
        temperature: parseFloat(temperature as any),
        max_tokens: parseInt(maxTokens as any, 10),
      });
      dialogRef.current?.close();
    };

    return (
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Configure Claude Model</h3>

          <div className="space-y-4 mt-4">
            {/* Model Selector */}
            <div>
              <label className="label">Model</label>
              <select
                className="select select-bordered w-full"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                {claudeModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="label">API Key</label>
              <input
                className="input input-bordered w-full"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
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
                max={4000}
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

export default ClaudeConfigModal;
