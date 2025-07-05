import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ConditionalChainConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ConditionalChainConfigModal = forwardRef<
  HTMLDialogElement,
  ConditionalChainConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [conditionField, setConditionField] = useState(
    nodeData?.condition_field || "input"
  );
  const [conditionType, setConditionType] = useState(
    nodeData?.condition_type || "contains"
  );
  const [conditionChains, setConditionChains] = useState<
    Record<string, string>
  >(nodeData?.condition_chains || {});

  const addCondition = () => {
    setConditionChains({ ...conditionChains, "": "" });
  };

  const handleSave = () => {
    onSave({
      condition_field: conditionField,
      condition_type: conditionType,
      condition_chains: conditionChains,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Conditional Chain</h3>

        <div className="space-y-3">
          <div>
            <label className="label">Condition Field</label>
            <input
              className="input input-bordered w-full"
              value={conditionField}
              onChange={(e) => setConditionField(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Condition Type</label>
            <select
              className="select select-bordered w-full"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="startswith">startswith</option>
              <option value="custom">custom</option>
            </select>
          </div>

          <div>
            <label className="label">Condition Chains</label>
            <div className="space-y-2">
              {Object.entries(conditionChains).map(([cond, chainId], i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input input-sm input-bordered flex-1"
                    value={cond}
                    placeholder="condition string"
                    onChange={(e) => {
                      const updated = { ...conditionChains };
                      const keys = Object.keys(updated);
                      delete updated[keys[i]];
                      updated[e.target.value] = chainId;
                      setConditionChains(updated);
                    }}
                  />
                  <input
                    className="input input-sm input-bordered flex-1"
                    value={chainId}
                    placeholder="target chain id"
                    onChange={(e) => {
                      const updated = { ...conditionChains };
                      const keys = Object.keys(updated);
                      const currentKey = keys[i];
                      updated[currentKey] = e.target.value;
                      setConditionChains(updated);
                    }}
                  />
                </div>
              ))}
              <button className="btn btn-sm btn-outline" onClick={addCondition}>
                + Add Condition
              </button>
            </div>
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
});

export default ConditionalChainConfigModal;
