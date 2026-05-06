import React, { useEffect, useState } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api, API_BASE } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Apis() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_url: "", price_per_call_inr: 0.5, free_quota: 1000, description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await api.get("/apis");
    setItems(r.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/apis", form);
      toast.success("API created");
      setOpen(false);
      setForm({ name: "", target_url: "", price_per_call_inr: 0.5, free_quota: 1000, description: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this API and all its keys?")) return;
    try {
      await api.delete(`/apis/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Failed"); }
  };

  const addDemo = async (kind) => {
    const url = `${API_BASE}/demo/${kind}`;
    try {
      await api.post("/apis", {
        name: `Demo ${kind === "joke" ? "Jokes" : "Quotes"} API`,
        target_url: url,
        price_per_call_inr: 0.5,
        free_quota: 1000,
        description: `Pre-wired demo target. Forward requests to /api/demo/${kind}.`,
      });
      toast.success("Demo API added");
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <AppShell>
      <PageHeader
        testId="apis-header"
        title="APIs"
        subtitle="Register HTTP endpoints behind the MeterFlow gateway."
        actions={
          <>
            <Button variant="outline" className="rounded-md" onClick={() => addDemo("joke")} data-testid="add-demo-joke-btn">+ Demo Joke API</Button>
            <Button variant="outline" className="rounded-md" onClick={() => addDemo("quote")} data-testid="add-demo-quote-btn">+ Demo Quote API</Button>
            <Button className="bg-[#0052FF] hover:bg-[#003EB3] rounded-md" onClick={() => setOpen(true)} data-testid="new-api-btn">
              <Plus className="w-4 h-4 mr-1" /> New API
            </Button>
          </>
        }
      />

      <div className="p-8">
        {items.length === 0 ? (
          <div className="border border-dashed border-slate-300 p-16 text-center bg-slate-50">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">No APIs yet</div>
            <div className="font-display font-bold text-2xl">Register your first endpoint.</div>
            <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto">Try the pre-wired demo APIs above to see the gateway in action without any setup.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((it) => (
              <div key={it.api_id} className="border border-slate-200 bg-white p-5" data-testid={`api-card-${it.api_id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-lg truncate">{it.name}</div>
                    <div className="font-mono text-xs text-slate-500 mt-1 truncate">{it.target_url}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-500" onClick={() => del(it.api_id)} data-testid={`api-delete-${it.api_id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Slug</div>
                    <div className="font-mono text-xs mt-0.5 text-[#0052FF]">{it.slug}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price/call</div>
                    <div className="font-mono text-xs mt-0.5">₹{it.price_per_call_inr}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Free quota</div>
                    <div className="font-mono text-xs mt-0.5">{it.free_quota.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-sm overflow-x-auto">
                  <span className="text-slate-500"># Gateway URL</span><br />
                  {API_BASE}/gw/{it.slug}/&lt;path&gt;
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-api-dialog">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-tight">Register API</DialogTitle>
            <DialogDescription>Point MeterFlow at any reachable HTTP endpoint.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] font-semibold">Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-md" data-testid="api-form-name" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] font-semibold">Target URL</Label>
              <Input required type="url" placeholder="https://api.example.com" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} className="mt-1.5 rounded-md font-mono text-sm" data-testid="api-form-url" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] font-semibold">Price / call (₹)</Label>
                <Input type="number" step="0.01" min="0" value={form.price_per_call_inr} onChange={(e) => setForm({ ...form, price_per_call_inr: parseFloat(e.target.value) || 0 })} className="mt-1.5 rounded-md font-mono" data-testid="api-form-price" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.2em] font-semibold">Free quota</Label>
                <Input type="number" min="0" value={form.free_quota} onChange={(e) => setForm({ ...form, free_quota: parseInt(e.target.value) || 0 })} className="mt-1.5 rounded-md font-mono" data-testid="api-form-quota" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] font-semibold">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-md" rows={2} data-testid="api-form-desc" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-[#0052FF] hover:bg-[#003EB3] rounded-md py-5" data-testid="api-form-submit">
              {busy ? "Creating..." : "Create API"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
