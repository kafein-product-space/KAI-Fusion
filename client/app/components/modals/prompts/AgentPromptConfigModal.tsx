import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface AgentPromptConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const AgentPromptConfigModal = forwardRef<
  HTMLDialogElement,
  AgentPromptConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [systemMessage, setSystemMessage] = useState(
    nodeData?.system_message ||
      `Answer the following questions as best you can. You have access to the following tools:\n\n{tools}\n\nUse the following format:\n\nQuestion: the input question you must answer\nThought: you should always think about what to do\nAction: the action to take, should be one of [{tool_names}]\nAction Input: the input to the action\nObservation: the result of the action\n... (this Thought/Action/Action Input/Observation can repeat N times)\nThought: I now know the final answer\nFinal Answer: the final answer to the original input question\n\nBegin!\n\nQuestion: {input}\nThought:{agent_scratchpad}`
  );

  const handleSave = () => {
    onSave({ system_message: systemMessage });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Agent Prompt</h3>

        <div className="mt-4">
          <label className="label">
            <span className="label-text">System Prompt</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full h-60 font-mono text-sm"
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            placeholder="ReAct format prompt..."
          />
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

export default AgentPromptConfigModal;
