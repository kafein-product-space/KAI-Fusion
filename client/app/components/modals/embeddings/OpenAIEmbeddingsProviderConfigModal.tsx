import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface OpenAIEmbeddingsProviderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const OpenAIEmbeddingsProviderConfigModal = forwardRef<
  HTMLDialogElement,
  OpenAIEmbeddingsProviderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [apiKey, setApiKey] = useState(nodeData?.openai_api_key || "");
  const [model, setModel] = useState(
    nodeData?.model || "text-embedding-3-small"
  );
  const [requestTimeout, setRequestTimeout] = useState(
    nodeData?.request_timeout || 60
  );
  const [maxRetries, setMaxRetries] = useState(nodeData?.max_retries || 3);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert("API Key gereklidir!");
      return;
    }

    onSave({
      openai_api_key: apiKey,
      model: model,
      request_timeout: Number(requestTimeout),
      max_retries: Number(maxRetries),
    });
    dialogRef.current?.close();
  };

  const modelOptions = [
    {
      value: "text-embedding-3-small",
      label: "Text Embedding 3 Small",
      description: "En son küçük model, iyi performans/maliyet oranı",
      dimensions: "1536D",
      cost: "$0.00002/1K token",
    },
    {
      value: "text-embedding-3-large",
      label: "Text Embedding 3 Large",
      description: "En son büyük model, en yüksek kalite embeddings",
      dimensions: "3072D",
      cost: "$0.00013/1K token",
    },
    {
      value: "text-embedding-ada-002",
      label: "Text Embedding Ada 002",
      description: "Eski model, hala güvenilir",
      dimensions: "1536D",
      cost: "$0.0001/1K token",
    },
  ];

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          OpenAI Embeddings Provider Konfigürasyonu
        </h3>

        <div className="py-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">OpenAI API Key *</span>
              <span className="label-text-alt text-red-500">Gerekli</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <div className="text-xs text-gray-500 mt-1">
              API key'inizi güvenli bir şekilde saklayın. Environment variable
              olarak da kullanabilirsiniz.
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Embedding Modeli</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.dimensions}) - {option.cost}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              {modelOptions.find((opt) => opt.value === model)?.description}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-semibold">
                  İstek Zaman Aşımı
                </span>
                <span className="label-text-alt">saniye</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={requestTimeout}
                onChange={(e) => setRequestTimeout(Number(e.target.value))}
                min={10}
                max={300}
              />
              <div className="text-xs text-gray-500 mt-1">
                API istekleri için maksimum bekleme süresi
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">
                  Maksimum Yeniden Deneme
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                min={0}
                max={5}
              />
              <div className="text-xs text-gray-500 mt-1">
                Başarısız istekler için yeniden deneme sayısı
              </div>
            </div>
          </div>

          {/* Model Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              Seçili Model Bilgileri
            </h4>
            {(() => {
              const selectedModel = modelOptions.find(
                (opt) => opt.value === model
              );
              return (
                <div className="text-sm text-blue-700">
                  <div>
                    <strong>Model:</strong> {selectedModel?.label}
                  </div>
                  <div>
                    <strong>Boyutlar:</strong> {selectedModel?.dimensions}
                  </div>
                  <div>
                    <strong>Maliyet:</strong> {selectedModel?.cost}
                  </div>
                  <div>
                    <strong>Açıklama:</strong> {selectedModel?.description}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            İptal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!apiKey.trim()}
          >
            Kaydet
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default OpenAIEmbeddingsProviderConfigModal;
