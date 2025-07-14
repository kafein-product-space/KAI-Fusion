import {
  ArrowLeft,
  Save,
  Settings,
  Menu,
  FileUp,
  Download,
  Trash,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSnackbar } from "notistack";

interface NavbarProps {
  workflowName: string;
  setWorkflowName: (name: string) => void;
  onSave: () => void;
  currentWorkflow?: any;
  setCurrentWorkflow?: (wf: any) => void;
  deleteWorkflow?: (id: string) => Promise<void>;
  setNodes?: (nodes: any[]) => void;
  setEdges?: (edges: any[]) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  workflowName,
  setWorkflowName,
  onSave,
  currentWorkflow,
  setCurrentWorkflow,
  deleteWorkflow,
  setNodes,
  setEdges,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  // Dışarı tıklayınca dropdown'u kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setIsShareVisible(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleRouteBack = () => {
    navigate(-1);
  };

  const handleBlur = () => {
    if (workflowName.trim() === "") {
      setWorkflowName("isimsiz dosya");
    }

    enqueueSnackbar("Dosya adı güncellendi", { variant: "success" });
  };

  // Load handler
  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (setCurrentWorkflow && setNodes && setEdges) {
          setCurrentWorkflow(json);
          setNodes(json.flow_data?.nodes || []);
          setEdges(json.flow_data?.edges || []);
          enqueueSnackbar("Workflow başarıyla yüklendi!", {
            variant: "success",
          });
        }
      } catch (err) {
        enqueueSnackbar("Geçersiz JSON dosyası!", { variant: "error" });
      }
    };
    reader.readAsText(file);
    setIsDropdownOpen(false);
    setIsShareVisible(false);
    e.target.value = "";
  };

  // Export handler
  const handleExport = () => {
    if (!currentWorkflow) {
      enqueueSnackbar("Export edilecek workflow yok!", { variant: "warning" });
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(currentWorkflow, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `${currentWorkflow.name || "workflow"}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setIsDropdownOpen(false);
    setIsShareVisible(false);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!currentWorkflow || !deleteWorkflow) return;
    try {
      await deleteWorkflow(currentWorkflow.id);
      enqueueSnackbar("Workflow silindi!", { variant: "success" });
      setCurrentWorkflow && setCurrentWorkflow(null);
      setNodes && setNodes([]);
      setEdges && setEdges([]);
    } catch (err) {
      enqueueSnackbar("Workflow silinemedi!", { variant: "error" });
    }
    deleteDialogRef.current?.close();
    setIsShareVisible(false);
  };

  return (
    <>
      <header className="w-full h-16 bg-[#F5F5F5] shadow-lg shadow-[#616161] fixed top-0 left-0 z-20">
        <nav className="flex justify-between items-center p-4 bg-[#FFFFFF] text-[#616161] m-auto">
          <div className="flex items-center gap-2">
            <ArrowLeft
              className="text-black cursor-pointer w-10 h-10 p-2 rounded-4xl hover:bg-[#6a6969] transition duration-500"
              onClick={handleRouteBack}
            />
          </div>

          <div className="flex flex-col items-center justify-center">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={handleBlur}
              placeholder="Dosya Adı"
              required
              className="text-3xl border-b-2 border-[#616161] w-full text-center focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-4 gap-2 relative">
            <div>
              <Save
                className="text-black hover:text-white cursor-pointer w-10 h-10 p-2 rounded-4xl hover:bg-[#6a6969] transition duration-500"
                onClick={onSave}
              />
            </div>
            <div className="text-xs text-[#616161] relative">
              <Settings
                className="text-black hover:text-white cursor-pointer w-10 h-10 p-2 rounded-4xl hover:bg-[#6a6969] transition duration-500"
                onClick={() => setIsDropdownOpen((v) => !v)}
              />
              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2"
                >
                  {/* Load */}
                  <button
                    className="w-full font-medium text-left px-3 py-2 hover:bg-gray-100 rounded flex gap-3 justify-start items-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="w-5 h-5" />
                    Load
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleLoad}
                  />
                  {/* Export */}
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex gap-3 justify-start items-center"
                    onClick={handleExport}
                  >
                    <Download className="w-5 h-5" />
                    Export
                  </button>
                  {/* Delete */}
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded  flex gap-3 justify-start items-center"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setTimeout(
                        () => deleteDialogRef.current?.showModal(),
                        100
                      );
                    }}
                  >
                    <Trash className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
      {/* Delete Workflow Modal */}
      <dialog ref={deleteDialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Workflow'u Sil</h3>
          <p className="py-4">
            <strong className="font-mono">{currentWorkflow?.name}</strong>{" "}
            workflow'unu silmek istediğine emin misin?
            <br />
            <span className="text-red-600 text-sm">
              Bu işlem geri alınamaz!
            </span>
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex items-center gap-2">
              <button
                className="btn"
                type="button"
                onClick={() => deleteDialogRef.current?.close()}
              >
                Vazgeç
              </button>
              <button
                className="btn bg-red-500 hover:bg-red-600 text-white"
                type="button"
                onClick={handleDelete}
              >
                Sil
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default Navbar;
