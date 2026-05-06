import React, { useEffect, useState } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { RefreshCw } from "lucide-react";

const statusColor = (s) => {
  if (s >= 500) return "text-red-600";
  if (s >= 400) return "text-amber-600";
  if (s >= 300) return "text-blue-600";
  return "text-emerald-600";
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [apis, setApis] = useState([]);
  const [apiFilter, setApiFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = { limit: 200 };
    if (apiFilter !== "all") params.api_id = apiFilter;
    if (statusFilter !== "all") params.status = parseInt(statusFilter);
    try {
      const [l, a] = await Promise.all([
        api.get("/stats/logs", { params }),
        apis.length ? Promise.resolve({ data: apis }) : api.get("/apis"),
      ]);
      setLogs(l.data); setApis(a.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [apiFilter, statusFilter]);

  return (
    <AppShell>
      <PageHeader
        testId="logs-header"
        title="Logs"
        subtitle="Every gateway call captured. Real-time."
        actions={<Button variant="outline" className="rounded-md" onClick={load} data-testid="refresh-logs-btn"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>}
      />
      <div className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <Select value={apiFilter} onValueChange={setApiFilter}>
            <SelectTrigger className="w-56 rounded-md" data-testid="filter-api"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All APIs</SelectItem>
              {apis.map((a) => <SelectItem key={a.api_id} value={a.api_id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 rounded-md" data-testid="filter-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="401">401 Unauthorized</SelectItem>
              <SelectItem value="429">429 Rate limited</SelectItem>
              <SelectItem value="502">502 Upstream</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-slate-500 font-mono">{logs.length} rows</div>
        </div>

        <div className="border border-slate-200 bg-white max-h-[70vh] overflow-y-auto scroll-thin">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Path</th>
                <th className="px-4 py-3 text-left">API</th>
                <th className="px-4 py-3 text-left">Key</th>
                <th className="px-4 py-3 text-right">Status</th>
                <th className="px-4 py-3 text-right">Latency</th>
                <th className="px-4 py-3 text-right">Bill</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500 text-sm">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500 text-sm">No requests yet — route a call through the gateway.</td></tr>
              ) : logs.map((l) => (
                <tr key={l.log_id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`log-row-${l.log_id}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.method}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700 truncate max-w-xs">/{l.path}</td>
                  <td className="px-4 py-2.5 text-xs">{l.api_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{l.key_prefix}…</td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${statusColor(l.status_code)}`}>{l.status_code}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{l.latency_ms}ms</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{l.billable ? `₹${l.price_inr}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
