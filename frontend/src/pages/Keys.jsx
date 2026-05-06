import React, { useEffect, useState, useCallback } from "react";
import AppShell, { PageHeader } from "../components/AppShell";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../components/ui/dialog";
import { Plus, Copy, Check, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";

export default function Keys() {
  const [keys, setKeys] = useState([]);
  const [apis, setApis] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    api_id: "",
    label: "default",
    rate_limit_per_min: 60
  });
  const [revealed, setRevealed] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);

  // ✅ FIXED: stable load function
  const load = useCallback(async () => {
    try {
      const [k, a] = await Promise.all([
        api.get("/keys"),
        api.get("/apis")
      ]);

      setKeys(k.data);
      setApis(a.data);
    } catch (err) {
      toast.error("Failed to load data");
    }
  }, []);

  // ✅ Load on mount
  useEffect(() => {
    load();
  }, [load]);

  // ✅ Handle default API selection separately (clean dependency handling)
  useEffect(() => {
    if (apis.length && !form.api_id) {
      setForm((f) => ({
        ...f,
        api_id: apis[0].api_id
      }));
    }
  }, [apis, form.api_id]);

  const submit = async (e) => {
    e.preventDefault();

    if (!form.api_id) {
      toast.error("Pick an API first");
      return;
    }

    setBusy(true);

    try {
      const r = await api.post("/keys", form);
      setRevealed(r.data);
      setOpen(false);
      await load(); // refresh
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");

    setTimeout(() => setCopiedId(null), 1500);
  };

  const revoke = async (id) => {
    try {
      await api.post(`/keys/${id}/revoke`);
      toast.success("Revoked");
      await load();
    } catch {
      toast.error("Failed");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this key permanently?")) return;

    try {
      await api.delete(`/keys/${id}`);
      toast.success("Deleted");
      await load();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <AppShell>
      <PageHeader
        testId="keys-header"
        title="API Keys"
        subtitle="Issue, monitor, and revoke per-tenant credentials."
        actions={
          <Button
            className="bg-[#0052FF] hover:bg-[#003EB3] rounded-md"
            onClick={() => setOpen(true)}
            data-testid="new-key-btn"
          >
            <Plus className="w-4 h-4 mr-1" /> New Key
          </Button>
        }
      />

      <div className="p-8">
        {keys.length === 0 ? (
          <div className="border border-dashed border-slate-300 p-16 text-center bg-slate-50">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">
              No keys yet
            </div>
            <div className="font-display font-bold text-2xl">
              Generate a key to start metering.
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-5 py-3 text-left">Key</th>
                  <th className="px-5 py-3 text-left">API</th>
                  <th className="px-5 py-3 text-left">Label</th>
                  <th className="px-5 py-3 text-right">Rate / min</th>
                  <th className="px-5 py-3 text-right">Calls</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.key_id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-sm">
                          {k.prefix}…
                        </code>

                        <button
                          className="text-slate-400 hover:text-slate-900"
                          onClick={() => copy(k.key, k.key_id)}
                        >
                          {copiedId === k.key_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-slate-700">
                      {k.api_name}
                    </td>

                    <td className="px-5 py-3 text-slate-700">
                      {k.label}
                    </td>

                    <td className="px-5 py-3 text-right font-mono">
                      {k.rate_limit_per_min}
                    </td>

                    <td className="px-5 py-3 text-right font-mono">
                      {(k.request_count || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-3">
                      {k.status === "active" ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600">
                          revoked
                        </Badge>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {k.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revoke(k.key_id)}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => del(k.key_id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE KEY MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue API Key</DialogTitle>
            <DialogDescription>
              Create a credential bound to a specific API.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>API</Label>

              <Select
                value={form.api_id}
                onValueChange={(v) =>
                  setForm({ ...form, api_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select API" />
                </SelectTrigger>

                <SelectContent>
                  {apis.map((a) => (
                    <SelectItem key={a.api_id} value={a.api_id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Label</Label>

              <Input
                value={form.label}
                onChange={(e) =>
                  setForm({ ...form, label: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Rate limit</Label>

              <Input
                type="number"
                value={form.rate_limit_per_min}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rate_limit_per_min:
                      parseInt(e.target.value) || 60
                  })
                }
              />
            </div>

            <Button type="submit" disabled={busy}>
              {busy ? "Generating..." : "Generate Key"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}