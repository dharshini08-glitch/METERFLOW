import React, { useEffect, useState } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api } from "../lib/api";
import { Activity, Boxes, KeyRound, AlertTriangle, IndianRupee, Gauge } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const KPI = ({ icon: Icon, label, value, sub, testId, accent }) => (
  <div className="bg-white border border-slate-200 p-5" data-testid={testId}>
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <Icon className={`w-4 h-4 ${accent || "text-slate-400"}`} strokeWidth={2} />
    </div>
    <div className="font-display font-black text-3xl tracking-tight mt-2">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-1 font-mono">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [byApi, setByApi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, a] = await Promise.all([
          api.get("/stats/overview"),
          api.get("/stats/timeseries", { params: { days: 7 } }),
          api.get("/stats/by-api"),
        ]);
        setStats(s.data); setSeries(t.data); setByApi(a.data);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <AppShell>
      <PageHeader
        testId="dashboard-header"
        title="Dashboard"
        subtitle="Real-time gateway performance and revenue."
        actions={
          <Link to="/endpoints"><Button className="bg-[#0052FF] hover:bg-[#003EB3] rounded-md" data-testid="dashboard-new-api-btn">+ New API</Button></Link>
        }
      />
      <div className="p-8 space-y-8">
        {loading ? (
          <div className="text-slate-500 text-sm">Loading metrics…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPI icon={Activity} label="Total Requests" value={stats.total_requests.toLocaleString()} sub="all-time" testId="kpi-total-requests" accent="text-[#0052FF]" />
              <KPI icon={IndianRupee} label="Revenue (mtd)" value={`₹${stats.revenue_inr.toLocaleString()}`} sub={`${stats.requests_this_month} billable calls`} testId="kpi-revenue" accent="text-emerald-500" />
              <KPI icon={AlertTriangle} label="Errors" value={stats.errors} sub={`${stats.error_rate}% rate`} testId="kpi-errors" accent="text-red-500" />
              <KPI icon={KeyRound} label="Active Keys" value={stats.active_keys} sub="across all APIs" testId="kpi-keys" />
              <KPI icon={Boxes} label="APIs" value={stats.apis_count} sub="registered" testId="kpi-apis" />
              <KPI icon={Gauge} label="Avg Latency" value={`${stats.avg_latency_ms}ms`} sub="last 1k calls" testId="kpi-latency" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Requests · Last 7 days</div>
                    <div className="font-display font-bold text-xl">Traffic volume</div>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer>
                    <LineChart data={series}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Line type="monotone" dataKey="requests" stroke="#0052FF" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 bg-white p-5">
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1">Latency</div>
                <div className="font-display font-bold text-xl mb-3">Daily avg (ms)</div>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={series}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E2E8F0", fontSize: 12 }} />
                      <Bar dataKey="avg_latency" fill="#0F172A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 bg-white">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Performance breakdown</div>
                  <div className="font-display font-bold text-xl">By API</div>
                </div>
              </div>
              {byApi.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No traffic yet. <Link to="/endpoints" className="text-[#0052FF] font-medium">Register your first API</Link> and route a request through the gateway.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-5 py-3 text-left">API</th>
                      <th className="px-5 py-3 text-right">Requests</th>
                      <th className="px-5 py-3 text-right">Errors</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byApi.map((a) => (
                      <tr key={a.api_id} className="border-t border-slate-200" data-testid={`byapi-row-${a.api_id}`}>
                        <td className="px-5 py-3 font-medium">{a.api_name}</td>
                        <td className="px-5 py-3 text-right font-mono">{a.requests.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono text-red-500">{a.errors}</td>
                        <td className="px-5 py-3 text-right font-mono">₹{a.revenue_inr.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
