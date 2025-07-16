// DashboardLayout.jsx
import { Check, MoreVertical, Search, Trash, X } from "lucide-react";
import React, { useState } from "react";
import { AuthGuard } from "../components/AuthGuard";

import DashboardSidebar from "~/components/dashboard/DashboardSidebar";

function ExecutionsLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [executions, setExecutions] = useState([
    {
      id: 1,
      name: "workflow",
      status: "success",
      started: "June 26th, 2025",
      runtime: "12:34:56",
    },
    {
      id: 2,
      name: "workflow",
      status: "failed",
      started: "June 26th, 2025",
      runtime: "12:34:56",
    },
  ]);

  const handleDelete = (id: number) => {
    console.log(id);
    setExecutions(executions.filter((execution) => execution.id !== id));
  };

  return (
    <div className="flex h-screen w-screen">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10 m-10 bg-white">
        {/* Container: Sayfayı ortala ve sınırlı genişlik ver */}
        <div className="max-w-screen-xl mx-auto">
          {/* Başlık ve üst filtre alanı */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-4xl font-medium text-start">Executions</h1>
              <p className="text-gray*600">
                View and monitor all your workflow executions with detailed logs
                and statuses.
              </p>
              <select className="border border-gray-500 rounded-lg px-3 py-1 text-sm w-64 h-10">
                <option className="text-sm">Last 7 days</option>
              </select>
            </div>

            <div className="flex items-center gap-6 justify-center">
              <div className="flex gap-2 p-3 flex-col items-start">
                <label className="input w-full rounded-2xl border flex items-center gap-2 px-2 py-1 ">
                  <Search className="h-4 w-4 opacity-50" />
                  <input
                    type="search"
                    className="grow w-62"
                    placeholder="Search"
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Tablo */}
          <div className=" ">
            <div className="overflow-hidden rounded-xl border border-gray-300">
              <table className="w-full text-sm p-2">
                <thead className="bg-[#F5F5F5] text-left text-md border-b border-gray-300 ">
                  <tr>
                    <th className="p-6 font-normal text-base">Name</th>
                    <th className="p-6 font-normal text-base">Status</th>
                    <th className="p-6 font-normal text-base">Started</th>
                    <th className="p-6 font-normal text-base">Runtime</th>
                    <th className="p-6 font-normal text-base"></th>
                  </tr>
                </thead>
                <tbody>
                  {executions
                    .filter((execution) =>
                      execution.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((execution) => (
                      <tr
                        key={execution.name}
                        className="border-b border-gray-300"
                      >
                        <td className="p-6">{execution.name}</td>
                        {execution.status === "success" ? (
                          <td className="p-6 text-green-500 flex items-center gap-2">
                            <Check />
                            Success
                          </td>
                        ) : (
                          <td className="p-6 text-red-500 flex items-center gap-2">
                            <X />
                            Failed
                          </td>
                        )}
                        <td className="p-6">
                          {execution.started}
                          <br />
                        </td>
                        <td className="p-6">
                          {execution.runtime}
                          <br />
                        </td>
                        <td className="p-6 relative">
                          <div className="dropdown dropdown-end">
                            <div
                              tabIndex={0}
                              role="button"
                              className="btn btn-ghost btn-sm p-2 rounded-2xl"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </div>
                            <ul
                              tabIndex={0}
                              className="dropdown-content z-[1000] menu p-2 shadow bg-base-100 border border-gray-200 rounded-box w-40 absolute right-0 top-full mt-1"
                            >
                              <li>
                                <a
                                  className="text-red-600"
                                  onClick={() => {
                                    handleDelete(execution.id);
                                  }}
                                >
                                  <Trash className="w-4 h-4" />
                                  Delete
                                </a>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProtectedExecutionsLayout() {
  return (
    <AuthGuard>
      <ExecutionsLayout />
    </AuthGuard>
  );
}
