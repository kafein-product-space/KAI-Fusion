import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface Route {
  chain_id: string;
  priority?: number;
  conditions: Record<string, any>;
}

interface RouterChainConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const RouterChainConfigModal = forwardRef<
  HTMLDialogElement,
  RouterChainConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [routeSelector, setRouteSelector] = useState(
    nodeData?.route_selector || "first_match"
  );
  const [routes, setRoutes] = useState<Route[]>(nodeData?.routes || []);

  const handleSave = () => {
    onSave({ route_selector: routeSelector, routes });
    dialogRef.current?.close();
  };

  const updateRoute = (index: number, updated: Partial<Route>) => {
    const newRoutes = [...routes];
    newRoutes[index] = { ...newRoutes[index], ...updated };
    setRoutes(newRoutes);
  };

  const addRoute = () => {
    setRoutes([...routes, { chain_id: "", priority: 0, conditions: {} }]);
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Router Chain</h3>

        <div className="space-y-3">
          <div>
            <label className="label">Route Selector</label>
            <select
              className="select select-bordered w-full"
              value={routeSelector}
              onChange={(e) => setRouteSelector(e.target.value)}
            >
              <option value="first_match">first_match</option>
              <option value="all_matches">all_matches</option>
              <option value="best_match">best_match</option>
            </select>
          </div>

          {routes.map((route, i) => (
            <div key={i} className="border p-2 rounded space-y-2 bg-slate-100">
              <input
                className="input input-sm input-bordered w-full"
                value={route.chain_id}
                placeholder="Chain ID"
                onChange={(e) => updateRoute(i, { chain_id: e.target.value })}
              />
              <input
                className="input input-sm input-bordered w-full"
                type="number"
                value={route.priority || 0}
                placeholder="Priority"
                onChange={(e) =>
                  updateRoute(i, { priority: Number(e.target.value) })
                }
              />
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Conditions (JSON format)"
                value={JSON.stringify(route.conditions, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateRoute(i, { conditions: parsed });
                  } catch {}
                }}
              />
            </div>
          ))}

          <button className="btn btn-sm btn-outline" onClick={addRoute}>
            + Add Route
          </button>
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

export default RouterChainConfigModal;
