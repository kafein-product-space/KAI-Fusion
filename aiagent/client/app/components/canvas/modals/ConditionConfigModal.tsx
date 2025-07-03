import { Info, Trash2 } from "lucide-react";
import { useState } from "react";

export default function ConditionConfigModal({ isOpen, onClose, nodeData, onSave }: any) {
    const [conditions, setConditions] = useState(
      nodeData?.conditions || [
        {
          id: 0,
          type: "String",
          value1: "",
          operation: "Equal",
          value2: "",
        },
      ]
    );
    const [name, setName] = useState(nodeData?.name || "Condition");
  
    const typeOptions = ["String", "Number", "Boolean", "Date"];
    const operationOptions = [
      "Equal",
      "Not Equal",
      "Greater Than",
      "Less Than",
      "Contains",
      "Starts With",
      "Ends With",
    ];
  
    const updateCondition = (id: number, field: string, value: string) => {
      setConditions((prev: any[]) =>
        prev.map((condition) =>
          condition.id === id ? { ...condition, [field]: value } : condition
        )
      );
    };
  
    const removeCondition = (id: number) => {
      setConditions((prev: any[]) =>
        prev.filter((condition) => condition.id !== id)
      );
    };
  
    const addCondition = () => {
      const newId = Math.max(...conditions.map((c: any) => c.id)) + 1;
      setConditions((prev: any[]) => [
        ...prev,
        {
          id: newId,
          type: "String",
          value1: "",
          operation: "Equal",
          value2: "",
        },
      ]);
    };
    
  
    const handleSave = () => {
      onSave({ name, conditions });
      onClose();
      console.log({ name, conditions });
    };
   
    if (!isOpen) return null;
  
    return (
     
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 w-[20vw] ">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl w-[20vw] max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Condition Konfigürasyonu</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
  
          {/* Node Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Node Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Condition node adını girin..."
            />
          </div>
          
  
          {/* Conditions */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-gray-700">
                Conditions <span className="text-red-500">*</span>
              </label>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
  
            {conditions.map((condition: any, index: number) => (
              <div
                key={condition.id}
                className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Kural {index}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {index}
                    </span>
                    {conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
  
                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={condition.type}
                      onChange={(e) =>
                        updateCondition(condition.id, "type", e.target.value)
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    >
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
  
                  {/* Operation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={condition.operation}
                      onChange={(e) =>
                        updateCondition(condition.id, "operation", e.target.value)
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    >
                      {operationOptions.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>
  
                  {/* Value 1 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={condition.value1}
                      onChange={(e) =>
                        updateCondition(condition.id, "value1", e.target.value)
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Değer girin..."
                    />
                  </div>
  
                  {/* Value 2 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value 2 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={condition.value2}
                      onChange={(e) =>
                        updateCondition(condition.id, "value2", e.target.value)
                      }
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Değer girin..."
                    />
                  </div>
                </div>
              </div>
            ))}
  
            {/* Add Condition Button */}
            <button
              onClick={addCondition}
              className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <span>+</span>
              Add Condition
            </button>
          </div>
  
          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    
    );
  };