import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface SequentialChainConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const SequentialChainConfigModal = forwardRef<
  HTMLDialogElement,
  SequentialChainConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [inputVars, setInputVars] = useState<string[]>(
    nodeData?.input_variables || ["input"]
  );
  const [outputVars, setOutputVars] = useState<string[]>(
    nodeData?.output_variables || ["output"]
  );
  const [returnAll, setReturnAll] = useState<boolean>(
    nodeData?.return_all || false
  );

  const handleSave = () => {
    onSave({
      input_variables: inputVars,
      output_variables: outputVars,
      return_all: returnAll,
    });
    dialogRef.current?.close();
  };

  const updateList = (
    list: string[],
    setter: (l: string[]) => void,
    index: number,
    value: string
  ) => {
    const newList = [...list];
    newList[index] = value;
    setter(newList);
  };

  const addItem = (list: string[], setter: (l: string[]) => void) => {
    setter([...list, ""]);
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Sequential Chain</h3>

        <div className="mt-4 space-y-4">
          {/* Input Variables */}
          <div>
            <label className="label">Input Variables</label>
            <div className="space-y-1">
              {inputVars.map((v, i) => (
                <input
                  key={i}
                  className="input input-sm input-bordered w-full"
                  value={v}
                  onChange={(e) =>
                    updateList(inputVars, setInputVars, i, e.target.value)
                  }
                  placeholder="e.g., input"
                />
              ))}
              <button
                className="btn btn-xs btn-outline"
                onClick={() => addItem(inputVars, setInputVars)}
              >
                + Add Input
              </button>
            </div>
          </div>

          {/* Output Variables */}
          <div>
            <label className="label">Output Variables</label>
            <div className="space-y-1">
              {outputVars.map((v, i) => (
                <input
                  key={i}
                  className="input input-sm input-bordered w-full"
                  value={v}
                  onChange={(e) =>
                    updateList(outputVars, setOutputVars, i, e.target.value)
                  }
                  placeholder="e.g., output"
                />
              ))}
              <button
                className="btn btn-xs btn-outline"
                onClick={() => addItem(outputVars, setOutputVars)}
              >
                + Add Output
              </button>
            </div>
          </div>

          {/* Return All */}
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={returnAll}
                onChange={(e) => setReturnAll(e.target.checked)}
              />
              <span className="label-text">
                Return all intermediate outputs
              </span>
            </label>
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

export default SequentialChainConfigModal;
