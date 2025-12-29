import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import dayjs from "dayjs";

export default function AuditLogs() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("ALL");
  const [filterUser, setFilterUser] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit-logs`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Badge color
  const actionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-green-600 text-white";
      case "update":
        return "bg-blue-600 text-white";
      case "delete":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  // Unique User List
  const userList = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => l.modifiedBy && set.add(JSON.stringify(l.modifiedBy)));
    return [...set].map((s) => JSON.parse(s));
  }, [logs]);

  // Unique Branch List
  const branchList = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => l.branch && set.add(JSON.stringify(l.branch)));
    return [...set].map((s) => JSON.parse(s));
  }, [logs]);

  // Filters
  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) =>
        search
          ? JSON.stringify(l).toLowerCase().includes(search.toLowerCase())
          : true
      )
      .filter((l) =>
        filterAction === "ALL" ? true : (l.action || "UNKNOWN") === filterAction
      )
      .filter((l) =>
        filterUser === "ALL" ? true : l.modifiedBy?._id === filterUser
      )
      .filter((l) =>
        filterBranch === "ALL" ? true : l.branch?._id === filterBranch
      );
  }, [logs, search, filterUser, filterBranch, filterAction]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-auto w-full">
      {/* TITLE */}
      <h1 className="text-2xl font-bold flex items-center justify-between">
        Audit Logs
        <span className="text-sm text-gray-500">
          {filteredLogs.length} record{filteredLogs.length !== 1 && "s"}
        </span>
      </h1>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 border rounded-md shadow-sm">
        {/* Search */}
        <input
          className="p-2 border rounded min-w-[240px]"
          placeholder="Search anything..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {/* Action */}
        <select
          className="p-2 border rounded"
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        {/* Users */}
        <select
          className="p-2 border rounded"
          value={filterUser}
          onChange={(e) => {
            setFilterUser(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Users</option>
          {userList.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Branch */}
        <select
          className="p-2 border rounded"
          value={filterBranch}
          onChange={(e) => {
            setFilterBranch(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Branches</option>
          {branchList.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <Card className="w-full">
        <CardContent className="p-0 overflow-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-black">
                <TableHead className="text-white">Action</TableHead>
                <TableHead className="text-white">Model</TableHead>
                <TableHead className="text-white">User</TableHead>
                <TableHead className="text-white">Branch</TableHead>
                <TableHead className="text-white">Timestamp</TableHead>
                <TableHead className="text-white text-right">View</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No Records Found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      <Badge className={actionColor(log?.action)}>
                        {(log?.action || "UNKNOWN").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.collectionName || "N/A"}</TableCell>
                    <TableCell>{log.modifiedBy?.name || "System"}</TableCell>
                    <TableCell>
                      {log.branch?.name ||
                        (log.after?.availableBranches?.length > 0
                          ? "Multi-Branch"
                          : "-")}
                    </TableCell>
                    <TableCell>
                      {dayjs(log.timestamp).format("DD/MM/YYYY hh:mm A")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewData(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PAGINATION */}
      <div className="flex justify-between items-center py-4">
        <Button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          variant="outline"
        >
          Previous
        </Button>

        <span>
          Page {page} of {totalPages || 1}
        </span>

        <Button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          variant="outline"
        >
          Next
        </Button>
      </div>

      {/* MODAL */}
      <Dialog open={!!viewData} onOpenChange={() => setViewData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {viewData && (
            <div className="space-y-5 p-2">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <p>
                  <b>Action:</b> {(viewData.action || "UNKNOWN").toUpperCase()}
                </p>
                <p>
                  <b>User:</b> {viewData.modifiedBy?.name || "System"}
                </p>
                <p>
                  <b>Branch:</b>{" "}
                  {viewData.branch?.name ||
                    (viewData.after?.availableBranches?.length > 0
                      ? "Multi-Branch"
                      : "-")}
                </p>
                <p>
                  <b>Time:</b>{" "}
                  {dayjs(viewData.timestamp).format("DD/MM/YYYY hh:mm A")}
                </p>
              </div>

              {/* Before */}
              <div>
                <h3 className="font-bold mb-1">Before</h3>
                <pre className="bg-gray-900 text-white p-4 rounded text-xs max-h-64 overflow-auto">
                  {JSON.stringify(viewData.before, null, 2)}
                </pre>
              </div>

              {/* After */}
              <div>
                <h3 className="font-bold mb-1">After</h3>
                <pre className="bg-gray-900 text-white p-4 rounded text-xs max-h-64 overflow-auto">
                  {JSON.stringify(viewData.after, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
